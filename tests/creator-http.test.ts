import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createCreatorServer} from '../src/server/creator-server.ts';
import {blankCard} from '../src/server/creator/model.ts';
import {projectFolder} from '../src/server/creator/projects.ts';
import {dataRoot} from '../src/server/paths.ts';

test('API del asistente: guardar, copiar ejemplos, revisar, generar y descargar un proyecto autónomo; bloquea origen ajeno y revisión obsoleta',async t=>{
 const server=createCreatorServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address() as any,url='http://127.0.0.1:'+address.port;let projectId='',downloadId='';
 t.after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));if(projectId){await fs.rm(projectFolder(projectId),{recursive:true,force:true});await fs.rm(path.join(dataRoot,'creator-output',projectId),{recursive:true,force:true});}if(downloadId)await fs.rm(path.join(dataRoot,'creator-downloads',downloadId),{recursive:true,force:true});});
 async function call(route:string,data?:any,method='POST'){const response=await fetch(url+'/api'+route,data===undefined?undefined:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const json=await response.json();assert.equal(response.ok,true,JSON.stringify(json));return json;}
 const config=await call('/creator');assert.deepEqual(config.rules.steps.slice(-4).map((step:any)=>step.id),['stones','clan-assets','art','review']);assert.ok(config.instance);assert.ok(config.catalog.items.length>=40);
 const foreign=await fetch(url+'/api/projects',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://evil.invalid'},body:'{}'});assert.equal(foreign.status,403);
 let draft=await call('/projects',{});projectId=draft.id;draft.name='Clan HTTP';draft.author='Pruebas';draft.champions.forEach((c:any,i:number)=>{c.card.name='Campeón '+i;c.paths.forEach((p:any,j:number)=>p.name='Senda '+j);});draft.starters.forEach((c:any,i:number)=>c.name='Inicial '+i);
 for(const id of ['ww-WW_T01','succclan-SpawnVrolikai','freecompany-PaymastersTent']){const example=await call('/examples/'+id);const card=example.card;card.uid=randomUUID();if(card.kind==='unit')card.banner=true;draft.cards.push(card);}
 const artifact=blankCard('artifact',randomUUID());artifact.name='Más espacio';artifact.passive={recipe:'relic_capacity',amount:1};draft.cards.push(artifact);const reviewStep=config.rules.steps.findIndex((step:any)=>step.id==='review');draft.step=reviewStep;
 draft=await call('/projects/'+projectId,draft,'PUT');assert.equal((await call('/projects/'+projectId)).step,reviewStep);const review=await call('/projects/'+projectId+'/review');assert.deepEqual(review.issues,[]);
 const stale=await fetch(url+'/api/projects/'+projectId+'/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:0,playable:false})});assert.equal(stale.status,400);
 const generated=await call('/projects/'+projectId+'/export',{revision:draft.revision,playable:false});downloadId=generated.id;assert.equal(generated.playable,false);const download=await fetch(url+generated.url);assert.equal(download.headers.get('content-type'),'application/zip');const bytes=Buffer.from(await download.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),generated.sha256);assert.ok(bytes.includes(Buffer.from('/manifest.json')));assert.ok(bytes.includes(Buffer.from('/src/Plugin.cs')));assert.ok(!bytes.includes(Buffer.from('TrainworksReloaded.Base.dll')));assert.ok(!bytes.includes(Buffer.from('mt2_succclan.Plugin.dll')));
});
// 2026-11-15-0923||codex-clan-editor||clan-creator/tests/creator-http.test.ts||Prueba del recorrido HTTP real con los tres clanes, reanudación, revisión, generación, ZIP y restricciones de origen
// 2026-11-21-1219||codex-clan-editor||clan-creator/tests/creator-http.test.ts||Verificar la navegación completa con el paso de Equipo
// 2026-11-21-1338||codex-clan-editor||clan-creator/tests/creator-http.test.ts||Probar navegación y exportación HTTP con los dos pasos añadidos
// 2026-11-21-1400||codex-clan-editor||clan-creator/tests/creator-http.test.ts||Comprobar que Arte de cartas es el último paso antes de instalar
