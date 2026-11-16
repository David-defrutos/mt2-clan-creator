import {createCreatorServer} from '../src/server/creator-server.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import sharp from 'sharp';
import {buildQuickDraft,createQuickDraft} from '../src/server/creator/quick-start.ts';
import {buildOfficialDraft} from '../src/server/creator/official-clans.ts';
import {exportDraftBackup,importDraftBackup} from '../src/server/creator/draft-backup.ts';
import {uploadImage,saveDraft,loadDraft,projectFolder,listDrafts} from '../src/server/creator/projects.ts';
import {reviewDraft,generateClan} from '../src/server/creator/export.ts';
import {creatorRules,readExample,exampleParameters,cloneExampleCard} from '../src/server/creator/catalog.ts';
import {championPreviewData,ChampionPreview} from '../src/web/creator/champion-preview.tsx';
import {effectiveUnitStats} from '../src/web/creator/template-upgrades.ts';
import {description} from '../src/web/creator/presentation.ts';
import {wizardStepOrder} from '../src/web/creator/wizard-navigation.tsx';
import {EffectEditor} from '../src/web/creator/components.tsx';
import {dataRoot} from '../src/server/paths.ts';

test('quick start has valid complete paths, two starters and three independent playable examples',async()=>{
 const rules=await creatorRules();for(const language of ['es','en']){const draft=await buildQuickDraft(language);assert.equal(draft.guidedMode,'quick');assert.equal(draft.cards.length,3);assert.equal(draft.cards.filter(c=>c.banner).length,2);assert.equal(draft.cards.filter(c=>c.kind==='spell').length,1);assert.equal(draft.champions.length,2);assert.ok(draft.champions.every(c=>c.paths.length===3&&c.paths.every(p=>p.levels.length===3)));draft.name='First clan';assert.deepEqual(await reviewDraft(draft),[]);assert.deepEqual(wizardStepOrder(draft,rules),[0,1,5,9,10,11,16]);draft.step=2;assert.equal(wizardStepOrder(draft,rules).length,17);const generated=await generateClan(draft);try{assert.deepEqual(generated.validation.filter((v:any)=>v.severity==='error'),[]);}finally{await fs.rm(generated.root,{recursive:true,force:true});}}
});

test('portable backups restore uploaded artwork, preserve source and create independent project identities',async t=>{
 let source=await createQuickDraft('en');const restoredIds:string[]=[];t.after(async()=>{for(const id of [source.id,...restoredIds])await fs.rm(projectFolder(id),{recursive:true,force:true});});
 const png=await sharp({create:{width:8,height:8,channels:4,background:'#22aaaa'}}).png().toBuffer(),image=await uploadImage(source.id,png.toString('base64'));source=await saveDraft({...source,name:'Portable draft',icon:image.file,cards:source.cards.map((c,i)=>i?c:{...c,image:image.file,characterImage:image.file})});
 const original=await fs.readFile(path.join(projectFolder(source.id),'draft.json')),backup=await exportDraftBackup(source.id);assert.equal(backup.assets.length,1);const restored=await importDraftBackup(backup);restoredIds.push(restored.id);assert.notEqual(restored.id,source.id);assert.equal(restored.name,source.name);assert.equal(restored.guidedMode,'quick');assert.deepEqual(await fs.readFile(path.join(projectFolder(restored.id),image.file)),png);assert.deepEqual(await fs.readFile(path.join(projectFolder(source.id),'draft.json')),original);assert.equal(restored.cards[0].characterImage,image.file);const second=await importDraftBackup(backup);restoredIds.push(second.id);assert.notEqual(second.id,restored.id);
 const ownBefore=await Promise.all([source.id,...restoredIds].map(async id=>[id,await fs.readFile(path.join(projectFolder(id),'draft.json'),'utf8')] as const));for(const corrupt of [{...backup,draft:{...backup.draft,name:'changed'}},{...backup,assets:[]},{...backup,assets:[{...backup.assets[0],name:'../../outside.png'}]},{...backup,assets:[...backup.assets,...backup.assets]},{...backup,version:99},{...backup,assets:[{...backup.assets[0],base64:'AA=='}]}])await assert.rejects(importDraftBackup(corrupt));for(const [id,content] of ownBefore)assert.equal(await fs.readFile(path.join(projectFolder(id),'draft.json'),'utf8'),content);
});

test('champion preview shows base or exact edited path level without modifying the draft',async()=>{
 const draft=await buildOfficialDraft('awoken','en'),before=JSON.stringify(draft),champion=draft.champions[0],detailFor=async(id:string)=>{const e=await readExample(id);return {example:e,parameters:exampleParameters(e),card:cloneExampleCard(e,'preview','en')};},base=await detailFor(champion.card.templateId!),details:Record<string,any>={};
 for(const p of champion.paths)for(const l of p.levels)if(l.native)details[l.native.templateId]=await detailFor(l.native.templateId);
 const view=championPreviewData(champion,base,null,0,details);assert.equal(effectiveUnitStats(view.card,view.template).health,champion.card.health);assert.equal(effectiveUnitStats(view.card,view.template).attack,champion.card.attack);
 for(let p=0;p<3;p++)for(let l=0;l<3;l++){const result=championPreviewData(champion,base,p,l,details),stats=effectiveUnitStats(result.card,result.template);assert.equal(result.unavailable,false);assert.equal(stats.health,champion.card.health+champion.paths[p].levels[l].health);assert.equal(stats.attack,champion.card.attack+champion.paths[p].levels[l].attack);assert.ok(description(result.card,result.template,'en',await creatorRules()).trim());}
 assert.equal(JSON.stringify(draft),before);const changed=structuredClone(champion);changed.paths[1].levels[2].attack=123;const altered=championPreviewData(changed,base,1,2,details);assert.equal(effectiveUnitStats(altered.card,altered.template).attack,champion.card.attack+123);
 const rules=await creatorRules(),html=renderToStaticMarkup(React.createElement(ChampionPreview,{champion,detail:base,details,config:{rules,catalog:{items:[]}},language:'en',projectId:draft.id}));assert.match(html,/Preview path/);assert.match(html,/Base stats only/);assert.match(html,/Enlarge card/);
});

test('guided effects retain target and duration controls and all new explanatory text is bilingual',async()=>{
 const rules=await creatorRules(),effect={recipe:'armor',amount:7,target:'friendly',when:'on_death',duration:'run'};for(const language of ['es','en'] as const){for(const value of Object.values(rules.usabilityText) as any[])assert.ok(value[language]?.trim());const html=renderToStaticMarkup(React.createElement(EffectEditor,{effects:[effect as any],onChange:()=>{},rules,language,t:(key:string)=>rules.labels[key]?.[language]??key}));assert.match(html,/effect-basics/);assert.match(html,/value="run"/);assert.match(html,/value="friendly"/);assert.ok(html.indexOf(rules.labels.when[language])<html.indexOf(rules.labels.mechanics[language]));}
 const launcher=await fs.readFile('Launch-Creator.cmd','utf8');assert.match(launcher,/runtime\/node.exe/);assert.match(launcher,/Opening MT2 Clan Creator/);const packageScript=await fs.readFile('scripts/package-creator.mjs','utf8');assert.match(packageScript,/'Launch-Creator.cmd','README.txt'/);
});
// 2026-11-16-2150||codex-clan-editor||clan-creator/tests/creator-improvements.test.ts||Probar clan mínimo generación copias con imágenes y restauración segura senda nivel y formularios bilingües


test('HTTP quick start and backup restoration work without compiling or replacing the source',async t=>{
 const server=createCreatorServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address() as any,base='http://127.0.0.1:'+address.port,ids:string[]=[];t.after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));for(const id of ids)await fs.rm(projectFolder(id),{recursive:true,force:true});});
 const call=async(url:string,data?:any)=>{const response=await fetch(base+'/api'+url,data===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const value=await response.json();assert.ok(response.ok,JSON.stringify(value));return value;};
 const first=await call('/projects/quick-start',{language:'en'});ids.push(first.id);const backup=await call('/projects/'+first.id+'/backup');assert.equal(backup.format,'mt2-clan-draft');const copy=await call('/projects/restore-backup',backup);ids.push(copy.id);assert.notEqual(copy.id,first.id);assert.equal(copy.guidedMode,'quick');assert.deepEqual(copy.cards,first.cards);assert.equal((await loadDraft(first.id)).revision,first.revision);
 const blocked=await fetch(base+'/api/projects/restore-backup',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.invalid'},body:JSON.stringify(backup)});assert.equal(blocked.status,403);
});
// 2026-11-16-2158||codex-clan-editor||clan-creator/tests/creator-improvements.test.ts||Comprobar recorrido y copia restauración por HTTP con identidad independiente y bloqueo de origen ajeno
// 2026-11-16-2203||codex-clan-editor||clan-creator/tests/creator-improvements.test.ts||Aislar comprobación de restauración a sus propios borradores sin contar proyectos de otras pruebas paralelas o del usuario
