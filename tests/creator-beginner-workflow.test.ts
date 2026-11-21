import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import sharp from 'sharp';
import {buildQuickDraft,createQuickDraft} from '../src/server/creator/quick-start.ts';
import {reviewDraft} from '../src/server/creator/export.ts';
import {creatorRules,exampleList} from '../src/server/creator/catalog.ts';
import {blankCard} from '../src/server/creator/model.ts';
import {saveDraft,loadDraft,projectFolder,listDrafts} from '../src/server/creator/projects.ts';
import {installationState,gameContentHash,rememberDestination,recordInstallation,updateProjectState,readProjectState} from '../src/server/creator/project-state.ts';
import {exportDraftBackup,importDraftBackup} from '../src/server/creator/draft-backup.ts';
import {restoreRemovedCard} from '../src/server/creator/workflow-state.ts';
import {wizardProgress} from '../src/web/creator/progress.ts';
import {errorGuidance} from '../src/server/creator/user-errors.ts';
import {ErrorNotice} from '../src/web/creator/error-notice.tsx';
import {CardEditor} from '../src/web/creator/editors.tsx';
import {effectOptions} from '../src/web/creator/effect-options.ts';
import {visibleSearchOptions} from '../src/web/creator/search-select.tsx';
import {prepareArtwork} from '../src/server/creator/artwork.ts';
import {createCreatorServer} from '../src/server/creator-server.ts';

test('review identifies exact cards and fields; editors expose accessible repair anchors',async()=>{
 const d=await buildQuickDraft('en');d.name='Repair';d.cards[0].name='';d.cards[1].health=0;const empty=blankCard('spell','empty-spell');empty.name='Empty spell';empty.effects=[];d.cards.push(empty);const issues=await reviewDraft(d);assert.ok(issues.some(i=>i.uid===d.cards[0].uid&&i.field==='name'));assert.ok(issues.some(i=>i.uid===d.cards[1].uid&&i.field==='health'));assert.ok(issues.some(i=>i.uid===empty.uid&&i.field==='effects'));
 const rules=await creatorRules(),html=renderToStaticMarkup(React.createElement(CardEditor,{card:d.cards[0],template:undefined,config:{rules,catalog:await exampleList()},language:'en',projectId:d.id,onChange:()=>{},onChoose:()=>{},onUpload:()=>{}}));for(const field of ['name','health','size','banner','effects'])assert.ok(html.includes('data-review-field="'+field+'"'),field);
});

test('actionable errors translate primary guidance and keep raw server messages inside technical details',async()=>{
 const rules=await creatorRules();for(const [message,code]of [['Cierra Monster Train 2 antes de instalar el clan.','GAME_RUNNING'],['El clan ha cambiado.','STALE'],['EACCES: permission denied','PERMISSION'],['Selecciona la carpeta del perfil.','FOLDER'],['El ejemplo cambió después de su auditoría.','CATALOG']]){assert.equal(errorGuidance(Error(message),rules).code,code);for(const language of ['en','es'] as const){const html=renderToStaticMarkup(React.createElement(ErrorNotice,{error:Error(message),rules,language}));assert.ok(html.includes(rules.errorGuidance.find((r:any)=>r.code===code).title[language]));assert.ok(html.indexOf(message)>html.indexOf('<details>'));}}
});

test('restoring a removed card preserves later edits and cannot duplicate its identity',async()=>{
 const d=await buildQuickDraft('en'),removed=structuredClone(d.cards[0]);d.cards=d.cards.slice(1);d.cards[0].name='Later edit';const restored=restoreRemovedCard(d,removed,0);assert.equal(restored.cards[0].uid,removed.uid);assert.equal(restored.cards[1].name,'Later edit');assert.equal(restoreRemovedCard(restored,removed,0),restored);
});

test('step readiness ignores legacy review marks and still tracks incomplete work',async()=>{
 const d=await buildQuickDraft('en'),rules=await creatorRules();
 d.name='Progress';
 const ready=wizardProgress(d,rules.steps);
 assert.ok(ready.flags[1]);
 d.reviewedSteps={identity:'0123456789abcdef'};
 assert.deepEqual(wizardProgress(d,rules.steps),ready);
 d.name='';
 assert.equal(wizardProgress(d,rules.steps).flags[0],false);
});

test('installation records remember destination, ignore navigation, identify pending changes and stay out of portable backups',async t=>{
 let d=await createQuickDraft('en');const ids=[d.id];t.after(async()=>{for(const id of ids)await fs.rm(projectFolder(id),{recursive:true,force:true});});d=await saveDraft({...d,name:'State'});assert.equal((await installationState(d)).status,'never');const folder=path.join(projectFolder(d.id),'Private profile');await Promise.all([rememberDestination(d.id,folder),updateProjectState(d.id,{note:'queued update'})]);assert.equal((await readProjectState(d.id)).note,'queued update');await recordInstallation(d,gameContentHash(d),{target:path.join(folder,'BepInEx/plugins/State')},folder);assert.equal((await installationState(d)).status,'current');d=await saveDraft({...d,step:16,reviewedSteps:{identity:'0123456789abcdef'}});assert.equal((await installationState(d)).status,'current');const changed=structuredClone(d);changed.cards[0].attack++;assert.equal((await installationState(changed)).status,'pending');assert.equal((await installationState(d)).folder,folder);const backup=await exportDraftBackup(d.id);assert.ok(!JSON.stringify(backup).includes('Private profile'));const restored=await importDraftBackup(backup);ids.push(restored.id);assert.equal((await installationState(restored)).status,'never');assert.ok((await listDrafts()).find((p:any)=>p.id===restored.id)?.restoredAt);await updateProjectState(d.id,{uninstalledAt:new Date().toISOString()});assert.equal((await installationState(d)).status,'removed');
});

test('grouped effect chooser starts with common effects but search and More effects retain every compatible recipe',async()=>{
 const rules=await creatorRules();for(const language of ['en','es'] as const){const options=effectOptions(rules,language,true);assert.deepEqual(new Set(options.map((o:any)=>o.value)),new Set(rules.recipes.filter((r:any)=>!r.castOnly).map((r:any)=>r.id)));const common=visibleSearchOptions(options,'',true,false,'damage');assert.ok(common.length<options.length);assert.ok(common.every(o=>o.common));assert.ok(visibleSearchOptions(options,'zeal',true,false,'damage').some(o=>o.value==='status_zeal'));assert.equal(visibleSearchOptions(options,'',true,true).length,options.length);assert.ok(visibleSearchOptions(options,'',true,false,'status_zeal').some(o=>o.value==='status_zeal'));}}
);

test('artwork preparation previews crop semantics, transparent padding and preserves complete character silhouettes',async()=>{
 const rules=await creatorRules(),raw=Buffer.alloc(200*100*4);for(let y=0;y<100;y++)for(let x=0;x<200;x++){const i=(y*200+x)*4;raw[i]=x<100?255:0;raw[i+2]=x<100?0:255;raw[i+3]=255;}const source=await sharp(raw,{raw:{width:200,height:100,channels:4}}).png().toBuffer(),hash=createHash('sha256').update(source).digest('hex');
 const contain=await prepareArtwork(source,{purpose:'card',mode:'contain'},rules),containRaw=await sharp(contain).ensureAlpha().raw().toBuffer();assert.equal((await sharp(contain).metadata()).width,512);assert.equal(containRaw[(10*512+10)*4+3],0);assert.equal(containRaw[(256*512+50)*4+3],255);
 for(const [x,channel]of [[0,0],[100,2]]){const filled=await prepareArtwork(source,{purpose:'card',mode:'cover',x,y:50,zoom:1},rules),pixel=await sharp(filled).extract({left:256,top:256,width:1,height:1}).raw().toBuffer();assert.ok(pixel[channel]>240);}
 const character=await prepareArtwork(source,{purpose:'character',mode:'original'},rules);assert.equal((await sharp(character).metadata()).width,200);assert.equal((await sharp(character).metadata()).height,100);const icon=await prepareArtwork(source,{purpose:'icon',mode:'cover'},rules);assert.equal((await sharp(icon).metadata()).width,256);assert.equal(createHash('sha256').update(source).digest('hex'),hash);
 const thin=await sharp({create:{width:1,height:10000,channels:4,background:'#ff0000'}}).png().toBuffer();assert.equal((await sharp(await prepareArtwork(thin,{purpose:'card',mode:'cover'},rules)).metadata()).height,512);
 for(const invalid of [{purpose:'wrong',mode:'cover'},{purpose:'card',mode:'cover',zoom:99},{purpose:'icon',mode:'contain',x:-1},{purpose:'character',mode:'cover'}])await assert.rejects(prepareArtwork(source,invalid,rules));await assert.rejects(prepareArtwork(Buffer.from('<svg width="10" height="10"></svg>'),undefined,rules));
});

test('HTTP destination and artwork endpoints return useful codes and preserve saved draft identity',async t=>{
 const d=await createQuickDraft('en'),server=createCreatorServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+(server.address() as any).port+'/api/projects/'+d.id;t.after(async()=>{await new Promise<void>(r=>server.close(()=>r()));await fs.rm(projectFolder(d.id),{recursive:true,force:true});});
 const state=await fetch(base+'/local-state').then(r=>r.json());assert.equal(state.status,'never');const folder=projectFolder(d.id),saved=await fetch(base+'/local-state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({folder})});assert.equal(saved.status,200);assert.equal((await saved.json()).folder,folder);const invalid=await fetch(base+'/local-state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({folder:'relative-folder'})});assert.equal(invalid.status,400);assert.equal((await invalid.json()).code,'FOLDER');
 const source=await sharp({create:{width:80,height:40,channels:4,background:'#dd3344'}}).png().toBuffer();const image=await fetch(base+'/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base64:source.toString('base64'),framing:{purpose:'icon',mode:'contain'}})});assert.equal(image.status,200);const file=(await image.json()).file;assert.equal((await sharp(await fs.readFile(path.join(projectFolder(d.id),file))).metadata()).width,256);assert.equal((await loadDraft(d.id)).revision,d.revision);
});
// 2026-11-16-2333||codex-clan-editor||clan-creator/tests/creator-beginner-workflow.test.ts||Probar reparación concreta errores localizados deshacer independiente revisión personal registros locales grupos e imágenes encuadradas
// 2026-11-21-1021||codex-clan-editor||clan-creator/tests/creator-beginner-workflow.test.ts||Verificar progreso por contenido y compatibilidad con borradores que conservan marcas antiguas
// 2026-11-21-1829||codex-clan-editor||clan-creator/tests/creator-beginner-workflow.test.ts||Comprobar que la búsqueda conserva todas las recetas compatibles con el tipo de carta
