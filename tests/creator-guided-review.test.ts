import {installationState} from '../src/server/creator/project-state.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReviewPlay,localInstallPath,installLocalClan} from '../src/web/creator/local-play.tsx';
import {creatorRules} from '../src/server/creator/catalog.ts';
import {blankDraft} from '../src/server/creator/model.ts';
import {createCreatorServer} from '../src/server/creator-server.ts';
import {newDraft,saveDraft,projectFolder,loadDraft} from '../src/server/creator/projects.ts';
import {buildOfficialDraft} from '../src/server/creator/official-clans.ts';
import {dataRoot} from '../src/server/paths.ts';
test('install screen has two steps, one prerequisites list and no manual review',async()=>{const rules=await creatorRules();for(const language of ['es','en'] as const){const html=renderToStaticMarkup(React.createElement(ReviewPlay,{rules,language,draft:blankDraft('12345678-1234-1234-1234-123456789abc'),issues:[],onIssue:()=>{},persist:async()=>({revision:0})}));for(const key of ['gameTitle','installTitle'])assert.ok(html.includes(rules.localInstall.text[key][language]));assert.equal((html.match(/>Conductor ↗/g)??[]).length,1);assert.ok(html.includes('role="tooltip"'));assert.doesNotMatch(html,/Check compilation requirements|Select profile and compile|download the clan or its source|runtime\/profile|Review your clan|Revisa tu clan|Review again|Volver a revisar/);assert.match(html,/<input type="checkbox"/);}});
test('destination preview accepts plugins, BepInEx or profile without adding a second plugins folder',()=>{for(const folder of ['C:/Mods/Default','C:/Mods/Default/BepInEx','C:/Mods/Default/BepInEx/plugins/'])assert.equal(localInstallPath(folder,'My clan'),'C:/Mods/Default/BepInEx/plugins/My clan');assert.equal(localInstallPath('C:\\Mods\\Default\\BepInEx\\plugins','My clan'),'C:\\Mods\\Default\\BepInEx\\plugins\\My clan');});
test('single install action saves before preparing and copies only a successfully prepared revision',async()=>{const calls:any[]=[],stages:string[]=[];const saved=async()=>{calls.push('save');return {revision:9};};const api=async(url:string,data:any)=>{calls.push({url,data});return url.endsWith('local-plan')?{token:'checked-files'}:{target:'installed'};};assert.deepEqual(await installLocalClan('project','chosen-folder',saved,s=>stages.push(s),api),{target:'installed'});assert.deepEqual(calls,['save',{url:'/projects/project/local-plan',data:{revision:9,folder:'chosen-folder'}},{url:'/projects/project/local-install',data:{token:'checked-files'}}]);assert.deepEqual(stages,['preparing','copying']);let count=0;await assert.rejects(installLocalClan('p','folder',saved,()=>{},async()=>{count++;throw Error('build failed');}));assert.equal(count,1);});
test('local install API: empty destination fails without opening a native folder dialog',async t=>{const server=createCreatorServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise<void>(r=>server.close(()=>r())));const url='http://127.0.0.1:'+(server.address() as any).port;const draft=await newDraft();t.after(()=>fs.rm(projectFolder(draft.id),{recursive:true,force:true}));const response=await fetch(url+'/api/projects/'+draft.id+'/local-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:0,folder:''})});assert.equal(response.status,400);const failure=await response.json();assert.match(failure.error,/carpeta de mods/);assert.equal(failure.installStage,'preparing');const suggested=await (await fetch(url+'/api/local-destination')).json();assert.equal(typeof suggested.folder,'string');});
test('guided install integration: compile actual clan DLL and copy into isolated plugins without prerequisites or ZIP',{skip:process.env.CLAN_CREATOR_TEST_COMPILE!=='1'},async t=>{let gameRunning=true;const server=createCreatorServer({isGameRunning:async()=>gameRunning});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise<void>(r=>server.close(()=>r())));const url='http://127.0.0.1:'+(server.address() as any).port;const empty=await newDraft(),draft=await buildOfficialDraft('awoken','en');await saveDraft({...draft,id:empty.id,revision:0});t.after(async()=>{await fs.rm(projectFolder(empty.id),{recursive:true,force:true});await fs.rm(path.join(dataRoot,'creator-output',empty.id),{recursive:true,force:true});});const folder=await fs.mkdtemp(path.join(dataRoot,'guided-install-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));const plugins=path.join(folder,'BepInEx/plugins');await fs.mkdir(path.join(plugins,'OtherMod'),{recursive:true});await fs.writeFile(path.join(plugins,'OtherMod/keep.txt'),'unchanged');async function call(action:string,data:any,method='POST'){const res=await fetch(url+'/api/projects/'+empty.id+'/'+action,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),v=await res.json();assert.equal(res.status,200,JSON.stringify(v));return v;}const first=await call('local-plan',{revision:1,folder:plugins});
 const output=path.join(dataRoot,'creator-output',empty.id);
 const builds=await fs.readdir(output);
 const running=await fetch(url+'/api/projects/'+empty.id+'/local-install',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:first.token})});
 assert.equal(running.status,400);
 assert.match((await running.json()).error,/Cierra Monster Train 2/);
 gameRunning=false;
 const retry=await call('local-plan',{revision:1,folder:plugins});
 await fs.mkdir(retry.target);
 const blocked=await fetch(url+'/api/projects/'+empty.id+'/local-install',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:retry.token})});
 assert.equal(blocked.status,400);
 assert.match((await blocked.json()).error,/otro mod/);
 await fs.rmdir(first.target);
 const plan=await call('local-plan',{revision:1,folder:plugins});
 assert.notEqual(first.token,plan.token);
 assert.deepEqual(await fs.readdir(output),builds);
 assert.equal(plan.target,path.join(plugins,'Copy of Awoken'));const installed=await call('local-install',{token:plan.token});const files=await fs.readdir(installed.target),dll=files.find(f=>f.endsWith('.dll'))!;assert.ok(dll);assert.equal((await fs.readFile(path.join(installed.target,dll))).subarray(0,2).toString(),'MZ');assert.ok(files.includes('json'));assert.ok(!files.some(f=>f.endsWith('.zip')));assert.equal(await fs.readFile(path.join(plugins,'OtherMod/keep.txt'),'utf8'),'unchanged');assert.equal(await fs.stat(path.join(folder,'BepInEx/core')).catch(()=>null),null);assert.equal(installed.installationRecorded,true);const receipt=await installationState(await loadDraft(empty.id));assert.equal(receipt.status,'current');assert.equal(receipt.folder,plugins);assert.equal(receipt.lastInstall?.target,installed.target);const edited=await loadDraft(empty.id),uid=edited.cards[0].uid;
 const saved=await call('local-state',{cardTest:{uid,contentHash:receipt.contentHash,note:'Check the trigger',status:'problem'}},'PUT');
 assert.equal(saved.cardNotes[uid].note,'Check the trigger');
 const shared=await call('export',{revision:1,playable:true});
 t.after(()=>fs.rm(path.join(dataRoot,'creator-downloads',shared.id),{recursive:true,force:true}));
 const download=await fetch(url+shared.url);
 assert.match(download.headers.get('content-disposition')??'',/Copy%20of%20Awoken/);
 const zip=Buffer.from(await download.arrayBuffer());
 assert.ok(zip.includes(Buffer.from('Copy of Awoken/manifest.json')));
 assert.ok(zip.includes(Buffer.from('Requires BepInExPack')));
 assert.ok(!zip.includes(Buffer.from('/src/Plugin.cs')));
 edited.cards[0].attack++;assert.equal((await installationState(edited)).status,'pending');
 await saveDraft(edited);
 const stale=await fetch(url+'/api/projects/'+empty.id+'/local-state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({cardTest:{uid,contentHash:receipt.contentHash,status:'works',note:''}})});
 assert.equal(stale.status,400);
 assert.equal((await installationState(await loadDraft(empty.id))).cardNotes[uid].status,'problem');});
// 2026-11-15-2212||codex-clan-editor||clan-creator/tests/creator-guided-review.test.ts||Probar tres pasos sin duplicados destino escrito accion unica errores y compilacion real en perfil aislado

test('clan folder names cannot escape destination and remain valid on Windows',async()=>{const {clanFolderName}=await import('../src/server/creator/clan-folder.ts');assert.equal(clanFolderName('Copy of Awoken'),'Copy of Awoken');for(const name of ['../Escape','..\\Escape','CON','NUL.txt','a/b:c*?','   ...  ']){const folder=clanFolderName(name);assert.ok(folder.length);assert.doesNotMatch(folder,/[<>:"/\\|?*]/);assert.ok(!folder.endsWith('.'));}assert.ok(clanFolderName('a'.repeat(200)).length<=60);});
// 2026-11-15-2239||codex-clan-editor||clan-creator/tests/creator-guided-review.test.ts||Actualizar prueba de vista previa por nombre y cubrir conversion segura de nombres

test('compilation preflight reports missing or outdated SDK before enabling installation',async()=>{const {compilationProblem}=await import('../src/web/creator/local-play.tsx'),rules=await creatorRules();assert.equal(compilationProblem(undefined,rules),'compileChecking');assert.equal(compilationProblem({sdk:'',ready:false},rules),'compileSdkMissing');assert.equal(compilationProblem({sdk:'1.0.0',ready:false},rules),'compileSdkMissing');assert.equal(compilationProblem({sdk:'99.0.0',ready:false,gameRequired:['UnityEngine']},rules),'compileGameMissing');assert.equal(compilationProblem({sdk:'99.0.0',ready:false,gameRequired:[]},rules),'compileCreatorMissing');assert.equal(compilationProblem({sdk:'99.0.0',ready:true,gameRequired:[]},rules),'');});
// 2026-11-15-2239||codex-clan-editor||clan-creator/tests/creator-guided-review.test.ts||Probar aviso temprano de SDK ausente antiguo y archivos de juego o creador sin esperar al error de compilar
// 2026-11-16-2340||codex-clan-editor||clan-creator/tests\creator-guided-review.test.ts||Comprobar recibo actual destino recordado y cambios pendientes tras compilación e instalación HTTP reales

test('Thunderstore profile discovery distinguishes named profiles and ignores folders without plugins',async t=>{
 const {thunderstoreProfiles}=await import('../src/server/creator/local-destination.ts');
 const appData=await fs.mkdtemp(path.join(dataRoot,'profile-list-'));
 t.after(()=>fs.rm(appData,{recursive:true,force:true}));
 const root=path.join(appData,'Thunderstore Mod Manager','DataFolder','MonsterTrain2','profiles');
 for(const name of ['Test clan','Default'])await fs.mkdir(path.join(root,name,'BepInEx','plugins'),{recursive:true});
 await fs.mkdir(path.join(root,'Incomplete'));
 assert.deepEqual(await thunderstoreProfiles(appData),['Default','Test clan'].map(name=>({name,folder:path.join(root,name,'BepInEx','plugins')})));
 assert.deepEqual(await thunderstoreProfiles(path.join(appData,'missing')),[]);
});

test('installation shows automatic issues that link back to the form',async()=>{
 const rules=await creatorRules(),draft=blankDraft('12345678-1234-1234-1234-123456789abc');
 const {draftIssues}=await import('../src/server/creator/validation.ts');
 const html=renderToStaticMarkup(React.createElement(ReviewPlay,{rules,language:'en',draft,issues:draftIssues(draft,rules.steps),onIssue:()=>{},persist:async()=>({revision:0})}));
 assert.match(html,/<button[^>]*>Give your clan a name/);
 assert.match(html,/aria-describedby="install-next"[^>]*disabled/);
});
// 2026-11-19-0752||codex-clan-editor||clan-creator/tests/creator-guided-review.test.ts||Probar perfiles múltiples y tareas pendientes antes de la revisión del servidor
// 2026-11-19-0915||codex-clan-editor||clan-creator/tests/creator-guided-review.test.ts||Verificar fase de error reutilización de compilación nota por versión y paquete jugable
// 2026-11-19-0918||codex-clan-editor||clan-creator/tests/creator-guided-review.test.ts||Probar fallo de copia por choque de destino y reintento sin recompilar
// 2026-11-19-2218||codex-clan-editor||clan-creator/tests/creator-guided-review.test.ts||Probar bloqueo con el juego abierto y repetir la instalación sin interferir con el juego real
// 2026-11-21-1021||codex-clan-editor||clan-creator/tests/creator-guided-review.test.ts||Comprobar dos pasos de instalacion y avisos automaticos sin revision manual
// 2026-11-21-1219||codex-clan-editor||clan-creator/tests/creator-guided-review.test.ts||Preparar los avisos con los pasos configurados
