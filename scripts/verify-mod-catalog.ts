import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {dataRoot} from '../src/server/paths.js';
import {blankDraft} from '../src/server/creator/model.js';
import {exampleList,readExample,cloneExampleCard} from '../src/server/creator/catalog.js';
import {generateClan} from '../src/server/creator/export.js';
import {detectRuntime} from '../src/server/creator/dependencies.js';
import {buildOffline} from '../src/server/offline-build.js';
const d=blankDraft(randomUUID());d.name='Auditoría de ejemplos compatibles';d.author='codex-clan-editor';for(let i=0;i<2;i++){d.champions[i].card=cloneExampleCard(await readExample(i?'ww-WW_T02':'ww-WW_T01'),'champion-'+i);d.champions[i].paths.forEach((p,j)=>p.name='Senda '+j);d.starters[i]=cloneExampleCard(await readExample('freecompany-Bless'),'starter-'+i);}
const rows=(await exampleList()).items.filter(e=>!e.official&&!e.legacy);for(const row of rows){const c=cloneExampleCard(await readExample(row.id),randomUUID(),'en');c.banner=c.kind==='unit';d.cards.push(c);}const runtime=await detectRuntime();if(!runtime.ready)throw Error('Faltan componentes de compilación');const generated=await generateClan(d),build=await buildOffline(generated.root,generated.project);if(!build.ok)throw Error(build.log);const receipt={createdAt:new Date().toISOString(),examples:rows.length,counts:Object.fromEntries(['freecompany','succclan','ww'].map(id=>[id,rows.filter(r=>r.sourceId===id).length])),root:generated.root,dll:build.dll,sha256:build.sha256,sdk:runtime.sdk,versions:runtime.versions,validationErrors:generated.validation.filter((v:any)=>v.severity==='error').length,zipGenerated:false,installedInGame:false,gameplayTested:false};const report=path.join(dataRoot,'acceptance/mod-catalog-compile.json');await fs.writeFile(report,JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
// 2026-11-15-1919||codex-clan-editor||clan-creator/scripts/verify-mod-catalog.ts||Compilar un clan real con todos los ejemplos aprobados de los tres mods y solo las referencias incluidas, sin ZIP ni instalación
