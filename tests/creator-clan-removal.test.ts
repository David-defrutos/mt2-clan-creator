import {recordInstallation,gameContentHash} from '../src/server/creator/project-state.ts';
import {runBulkRemoval,registeredInstalls} from '../src/web/creator/bulk-removal.tsx';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {newDraft,loadDraft,projectFolder,listDrafts,trashDraft,restoreDraft,deletedDrafts,deletedProjectDirectory} from '../src/server/creator/projects.ts';
import {planClanUninstall,uninstallClan} from '../src/server/creator/install-clan.ts';
import {dataRoot} from '../src/server/paths.ts';
import {createCreatorServer} from '../src/server/creator-server.ts';
import {creatorRules} from '../src/server/creator/catalog.ts';
import {ClanRemoval} from '../src/web/creator/clan-removal.tsx';
test('delete draft is recoverable, preserves all saved files, and never touches installation',async t=>{const d=await newDraft();t.after(async()=>{await fs.rm(projectFolder(d.id),{recursive:true,force:true});await fs.rm(path.join(deletedProjectDirectory,d.id),{recursive:true,force:true});});const original=await fs.readFile(path.join(projectFolder(d.id),'draft.json'));await fs.mkdir(path.join(projectFolder(d.id),'upload'));await fs.writeFile(path.join(projectFolder(d.id),'upload/art.png'),'saved art');await assert.rejects(trashDraft(d.id,99),/ha cambiado/);await trashDraft(d.id,0);assert.ok(!(await listDrafts()).some(x=>x.id===d.id));assert.ok((await deletedDrafts()).some(x=>x.id===d.id));await assert.rejects(loadDraft(d.id));await restoreDraft(d.id);assert.deepEqual(await fs.readFile(path.join(projectFolder(d.id),'draft.json')),original);assert.equal(await fs.readFile(path.join(projectFolder(d.id),'upload/art.png'),'utf8'),'saved art');assert.ok(!(await deletedDrafts()).some(x=>x.id===d.id));assert.ok((await listDrafts()).some(x=>x.id===d.id));});
test('uninstall matches creator identity despite renamed folder, blocks running game and changed files, backs up only owned clan',async t=>{const profile=await fs.mkdtemp(path.join(dataRoot,'removal-test-'));t.after(()=>fs.rm(profile,{recursive:true,force:true}));const plugins=path.join(profile,'BepInEx/plugins'),own=path.join(plugins,'Recognizable clan'),other=path.join(plugins,'Other clan'),id=randomUUID();await fs.mkdir(own,{recursive:true});await fs.mkdir(other);await fs.writeFile(path.join(own,'clan-creator.json'),JSON.stringify({projectId:id}));await fs.writeFile(path.join(own,'Clan.dll'),'owned bytes');await fs.writeFile(path.join(other,'Clan.dll'),'other bytes');await fs.writeFile(path.join(other,'clan-creator.json'),JSON.stringify({projectId:randomUUID()}));await assert.rejects(planClanUninstall(plugins,randomUUID()),/No se encuentra/);const plan=await planClanUninstall(plugins,id);assert.equal(plan.target,own);await assert.rejects(uninstallClan(plan,{isRunning:async()=>true}),/Cierra/);await fs.writeFile(path.join(own,'Clan.dll'),'updated bytes');await assert.rejects(uninstallClan(plan,{isRunning:async()=>false}),/ha cambiado/);const fresh=await planClanUninstall(profile,id),result=await uninstallClan(fresh,{isRunning:async()=>false});assert.equal(await fs.stat(own).catch(()=>null),null);assert.equal(await fs.readFile(path.join(result.backup,'Clan.dll'),'utf8'),'updated bytes');assert.equal(await fs.readFile(path.join(other,'Clan.dll'),'utf8'),'other bytes');assert.ok(!result.backup.startsWith(plugins+path.sep));await assert.rejects(planClanUninstall(profile,id),/No se encuentra/);});
test('draft API deletes and restores by revision and uninstall cannot accept an arbitrary target',async t=>{const server=createCreatorServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise<void>(r=>server.close(()=>r())));const url='http://127.0.0.1:'+(server.address() as any).port,d=await newDraft();t.after(async()=>{await fs.rm(projectFolder(d.id),{recursive:true,force:true});await fs.rm(path.join(deletedProjectDirectory,d.id),{recursive:true,force:true});});async function post(action:string,data:any){return fetch(url+'/api/projects/'+d.id+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}assert.equal((await post('trash-draft',{revision:99})).status,400);assert.equal((await post('trash-draft',{revision:0})).status,200);const deleted=await (await fetch(url+'/api/deleted-projects')).json();assert.ok(deleted.some((x:any)=>x.id===d.id));assert.equal((await post('restore-draft',{})).status,200);assert.equal((await post('uninstall',{token:'invented',target:'C:/unrelated'})).status,400);assert.equal((await loadDraft(d.id)).id,d.id);});
test('removal dialog clearly distinguishes draft from game copy and requires an explicit confirmation step',async()=>{const rules=await creatorRules();for(const language of ['es','en'] as const){const html=renderToStaticMarkup(React.createElement(ClanRemoval,{project:{id:randomUUID(),name:'Example',revision:0},rules,language,onClose:()=>{},onChanged:async()=>{}}));assert.ok(html.includes(rules.clanRemoval.draftHelp[language]));assert.ok(html.includes(rules.clanRemoval.gameHelp[language]));assert.ok(html.includes('aria-labelledby="clan-removal-title"'));assert.doesNotMatch(html,/>Confirm draft deletion<|>Confirm uninstall</);}});
// 2026-11-15-2301||codex-clan-editor||clan-creator/tests/creator-clan-removal.test.ts||Probar borrado recuperable restauracion desinstalacion aislada guardas de juego revision y destinos y claridad de opciones

test('bulk removal protects the game and foreign mods, records trashed installs and preserves recoverable drafts',async t=>{
 let running=true;
 const server=createCreatorServer({isGameRunning:async()=>running});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
 const base='http://127.0.0.1:'+(server.address() as any).port+'/api';
 async function call<T=any>(route:string,data?:unknown):Promise<T>{
  const response=await fetch(base+route,data===undefined?undefined:{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),
  });
  const result=await response.json();
  if(!response.ok)throw Error(result.error);
  return result;
 }
 const profile=await fs.mkdtemp(path.join(dataRoot,'bulk-removal-test-'));
 t.after(()=>fs.rm(profile,{recursive:true,force:true}));
 const active=await newDraft(),deleted=await newDraft(),never=await newDraft();
 const drafts=[active,deleted,never];
 t.after(async()=>{for(const draft of drafts){
  await fs.rm(projectFolder(draft.id),{recursive:true,force:true});
  await fs.rm(path.join(deletedProjectDirectory,draft.id),{recursive:true,force:true});
 }});
 const plugins=path.join(profile,'BepInEx/plugins'),other=path.join(plugins,'Unrelated mod');
 await fs.mkdir(other,{recursive:true});
 await fs.writeFile(path.join(other,'Keep.dll'),'other mod');
 for(const draft of [active,deleted]){
  const folder=path.join(plugins,draft.id);
  await fs.mkdir(folder);
  await fs.writeFile(path.join(folder,'clan-creator.json'),JSON.stringify({projectId:draft.id}));
  await fs.writeFile(path.join(folder,'Clan.dll'),'playable');
  await recordInstallation(draft,gameContentHash(draft),{target:folder},plugins);
 }
 await trashDraft(deleted.id,deleted.revision);
 const knownIds=new Set(drafts.map(draft=>draft.id));
 const installations=async()=>registeredInstalls([
  ...await call('/projects'),...await call('/deleted-projects'),
 ].filter(item=>knownIds.has(item.id)));
 const items=await installations();
 assert.equal(items.length,2);
 const blocked=await runBulkRemoval('uninstall',items,'changed',call);
 assert.equal(blocked.done,0);
 assert.equal(blocked.failed.length,2);
 assert.match(String(blocked.failed[0].error),/Cierra Monster Train 2/);
 running=false;
 const complete=await runBulkRemoval('uninstall',items,'changed',call);
 assert.equal(complete.done,2);
 assert.deepEqual(complete.failed,[]);
 assert.deepEqual(await installations(),[]);
 assert.equal(await fs.readFile(path.join(other,'Keep.dll'),'utf8'),'other mod');
 assert.equal((await fs.readdir(path.join(profile,'ClanCreator-backups'))).length,2);
 assert.equal((await loadDraft(active.id)).id,active.id);
 const toTrash=(await call('/projects')).filter((item:any)=>knownIds.has(item.id));
 const trashed=await runBulkRemoval('trash',toTrash,'changed',call);
 assert.equal(trashed.done,2);
 assert.ok((await deletedDrafts()).some(item=>item.id===active.id&&item.status==='removed'));
 assert.equal(await fs.readFile(path.join(other,'Keep.dll'),'utf8'),'other mod');
 await restoreDraft(active.id);
 assert.equal((await loadDraft(active.id)).id,active.id);
});

test('bulk uninstall keeps going after a folder differs from the confirmation',async()=>{
 const items=[
  {id:'old',name:'Moved clan',revision:0,lastInstall:{target:'C:/Profile/plugins/Old'}},
  {id:'same',name:'Confirmed clan',revision:0,lastInstall:{target:'C:/Profile/plugins/Same'}},
 ];
 const calls:string[]=[];
 const call=async<T=any>(url:string):Promise<T>=>{
  calls.push(url);
  return {token:'planned',target:url.includes('/old/')?'C:/Profile/plugins/New':items[1].lastInstall.target} as T;
 };
 const result=await runBulkRemoval('uninstall',items,'changed',call);
 assert.equal(result.done,1);
 assert.equal(result.failed[0].item.id,'old');
 assert.deepEqual(calls,['/projects/old/uninstall-plan','/projects/same/uninstall-plan','/projects/same/uninstall']);
});
// 2026-11-19-2224||codex-clan-editor||clan-creator/tests/creator-clan-removal.test.ts||Probar borrado masivo recuperable y desinstalación confirmada sin tocar el perfil real
