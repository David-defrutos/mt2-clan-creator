import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {generateClan} from '../src/server/creator/export.ts';
import {blankCard,blankDraft} from '../src/server/creator/model.ts';
import {dataRoot} from '../src/server/paths.ts';
import {createCreatorServer} from '../src/server/creator-server.ts';
import {projectFolder} from '../src/server/creator/projects.ts';
import type {AddressInfo} from 'node:net';

test('individual JSON uses edited card values and works before the clan is complete',async t=>{
 const draft=blankDraft(randomUUID());
 const cleanup=path.join(dataRoot,'creator-output',draft.id);
 t.after(()=>fs.rm(cleanup,{recursive:true,force:true}));
 const selected={...blankCard('spell','selected'),name:'Exact card',cost:4,effects:[{recipe:'damage',amount:21,target:'enemy',when:'on_spawn'}] as const};
 draft.pendingCard={card:{...selected,effects:[...selected.effects]},stage:3};
 draft.cards.push({...blankCard('unit','other'),name:'Unrelated unit'});
 const result=await generateClan(draft,selected.uid);
 const data=JSON.parse(result.cardJson!);
 assert.equal(data.cards.length,1);
 assert.equal(data.cards[0].names.english,'Exact card');
 assert.equal(data.cards[0].cost,4);
 assert.equal(data.effects[0].param_int,21);
 assert.ok(data.game_objects.length);
 assert.ok(!result.cardJson!.includes('Unrelated unit'));
 assert.deepEqual(await fs.readdir(cleanup),[]);
 await assert.rejects(generateClan(draft,'absent'),/No se encuentra esa carta/);
});
// 2026-11-21-0953||codex-clan-editor||clan-creator/tests/creator-card-json.test.ts||Verificar JSON individual y de carta pendiente con borrador incompleto
// 2026-11-21-0954||codex-clan-editor||clan-creator/tests/creator-card-json.test.ts||Crear borrador de prueba con identidad valida

test('card JSON is available through the editor API for the saved revision',async t=>{
 const server=createCreatorServer();
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
 const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/projects/';
 const post=(target:string,body:unknown)=>fetch(url+target,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const created=await post('quick-start',{language:'en'});
 assert.equal(created.status,201);
 const draft=await created.json() as ReturnType<typeof blankDraft>;
 t.after(async ()=>{
  await fs.rm(projectFolder(draft.id),{recursive:true,force:true});
  await fs.rm(path.join(dataRoot,'creator-output',draft.id),{recursive:true,force:true});
 });
 const card=draft.cards[0];
 const response=await post(draft.id+'/card-json',{uid:card.uid,revision:draft.revision});
 assert.equal(response.status,200);
 const preview=await response.json();
 assert.equal(preview.readOnly,true);
 assert.ok(JSON.parse(preview.content).cards.some((c:{names:{english:string}})=>c.names.english===card.name));
 assert.equal((await post(draft.id+'/card-json',{uid:card.uid,revision:draft.revision-1})).status,400);
});
// 2026-11-21-0955||codex-clan-editor||clan-creator/tests\creator-card-json.test.ts||Comprobar la ruta real del visor y el rechazo de revisiones antiguas
