import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {blankDraft,blankCard} from '../src/server/creator/model.ts';
import {readExample,cloneExampleCard,exampleParameters} from '../src/server/creator/catalog.ts';
import {saveDraft,newDraft} from '../src/server/creator/projects.ts';
import {generateClan,reviewDraft} from '../src/server/creator/export.ts';
import {detectRuntime} from '../src/server/creator/dependencies.ts';
import {buildOffline} from '../src/server/offline-build.ts';
import {packageFiles} from '../src/server/creator/zip.ts';
import {dataRoot} from '../src/server/paths.ts';
for(const id of ['official-TrainStewardShield','official-HornbreakerChampion','official-StarterHeal','official-StarterTorch','official-AnimusOfWill','official-Sting','official-EngineUpgrade','official-relic-RagePreservedOnFriendlies','official-Irontongue','official-TitanCorruption','official-ScourgeT3'])await readExample(id);
const draft=await newDraft();draft.name='Oficiales · demostración';draft.author='Clan Creator';draft.description='Clan generado íntegramente desde el asistente, con ejemplos y arte incluidos.';
for(let i=0;i<2;i++){draft.champions[i].card=cloneExampleCard(await readExample(i?'official-HornbreakerChampion':'official-TrainStewardShield'),'champion-'+i);draft.champions[i].card.name=i?'Bruma':'Aurora';draft.champions[i].card.attack=i?12:15;draft.champions[i].card.health=25;for(let p=0;p<3;p++){draft.champions[i].paths[p].name=['Fuerza','Resistencia','Protección'][p];draft.champions[i].paths[p].levels=[1,2,3].map(n=>({attack:p===0?n*10:0,health:p===1?n*15:0,size:0,effects:p===2?[{recipe:'armor',amount:n*3,target:'friendly',when:'on_spawn'}]:[]}));}draft.starters[i]=cloneExampleCard(await readExample(i?'official-StarterHeal':'official-StarterTorch'),'starter-'+i);}
for(const id of ['official-TrainStewardShield','official-AnimusOfWill','official-Sting','official-EngineUpgrade','official-relic-RagePreservedOnFriendlies','official-Irontongue','official-TitanCorruption','official-ScourgeT3']){const c=cloneExampleCard(await readExample(id),randomUUID());if(c.kind==='unit')c.banner=true;if(c.kind==='room'&&!id.startsWith('official-')){const p=exampleParameters(await readExample(id)).find(p=>p.path.at(-1)==='count');if(p)c.parameters[p.key]=2;}draft.cards.push(c);}
const room=blankCard('room',randomUUID());room.name='Jardín de raíces';room.passive={recipe:'room_rooted',amount:2};draft.cards.push(room);
const relic=blankCard('artifact',randomUUID());relic.name='Reserva de ember';relic.passive={recipe:'relic_ember',amount:1};draft.cards.push(relic);
draft.step=16;await saveDraft(draft);const issues=await reviewDraft(draft);if(issues.length)throw Error(JSON.stringify(issues));
const runtime=await detectRuntime();if(!runtime.ready)throw Error('Componentes de compilación pendientes: '+JSON.stringify(runtime));
const generated=await generateClan(draft);const result=await buildOffline(generated.root,generated.project);if(!result.ok)throw Error(result.log);
const folder=path.join(dataRoot,'official-demo');await fs.mkdir(folder,{recursive:true});const zip=await packageFiles(generated.root,'GuardianesDelAlba',false,result.dll);await fs.writeFile(path.join(folder,'OficialesDemo.zip'),zip);await fs.writeFile(path.join(folder,'draft.json'),JSON.stringify(draft,null,2));const report={projectId:draft.id,root:generated.root,project:generated.project,dll:result.dll,dllSha256:result.sha256,zip:path.join(folder,'OficialesDemo.zip'),zipSha256:createHash('sha256').update(zip).digest('hex'),runtime,validation:generated.validation};await fs.writeFile(path.join(folder,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
// 2026-11-15-0914||codex-clan-editor||clan-creator/scripts/smoke-creator.mjs||Prueba integral reproducible: clan con tres fuentes, arte, sendas, sala y reliquia propias, DLL y ZIP jugable
// 2026-11-15-1029||codex-clan-editor||clan-creator/scripts/smoke-official.mjs||Compilar un clan real con cartas oficiales, prefabs nativos y marcos originales
// 2026-11-15-1236||codex-clan-editor||clan-creator/scripts/smoke-official.mjs||Ampliar la demostración compilable con artefactos nativos sin PNG, equipo y cartas generadas
// 2026-11-15-1237||codex-clan-editor||clan-creator/scripts/smoke-official.mjs||Comprobar todos los ejemplos antes de crear el borrador de la demostración y corregir Irontongue
