import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {dataRoot,projectRoot} from '../src/server/paths.ts';
import {buildOfficialDraft} from '../src/server/creator/official-clans.ts';
import {readExample,exampleParameters,cloneExampleCard,creatorRules} from '../src/server/creator/catalog.ts';
import {generateClan,reviewDraft} from '../src/server/creator/export.ts';
import {templateEffects} from '../src/server/creator/template-effects.ts';
import {draftIssues} from '../src/server/creator/validation.ts';
import {newDraft,projectFolder,loadDraft,saveDraft} from '../src/server/creator/projects.ts';
import {scanClan} from '../src/server/scan.ts';
import {duplicateCard} from '../src/web/creator/card-kind.ts';
import {copyOfficialMechanics} from '../src/web/creator/copy-mechanics.ts';
import {championPreviewData} from '../src/web/creator/champion-preview.tsx';
import {description} from '../src/web/creator/presentation.ts';

test('Fel base preview keeps the mechanics that export after a mechanics-only copy',async t=>{
 const draft=await buildOfficialDraft('banished','en'),fel=draft.champions[0];
 const example=await readExample(fel.card.templateId!),detail={example,parameters:exampleParameters(example)};
 const rules=await creatorRules();
 const before=championPreviewData(fel,detail,null,0,{});
 assert.doesNotMatch(description(before.card,before.template,'en',rules),/Revenge/);
 fel.card=copyOfficialMechanics(fel.card,cloneExampleCard(example,'preview','en'),detail);
 const after=championPreviewData(fel,detail,null,0,{});
 assert.match(description(after.card,after.template,'en',rules),/Revenge.*Valor 1/);
 const generated=await generateClan(draft);
 t.after(()=>fs.rm(path.join(dataRoot,'creator-output',draft.id),{recursive:true,force:true}));
 const scan=await scanClan(generated.root),base=scan.entries.find(row=>row.section==='cards'&&row.data.names?.english==='Fel')!;
 const upgrade=scan.entries.find(row=>row.section==='upgrades'&&base.data.initial_upgrades.includes('@'+row.id))!;
 assert.ok(scan.entries.some(row=>row.section==='character_triggers'&&upgrade.data.trigger_upgrades.includes('@'+row.id)&&row.data.trigger==='on_hit'));
});

test('the editor and server reject a copied spell with all of its actions removed',async()=>{
 const draft=await buildOfficialDraft('banished','en'),spell=draft.starters.find(card=>card.templateId==='official-JustCause')!;
 const example=await readExample(spell.templateId!);
 const rows=templateEffects(example.document,example.root).filter(row=>row.ownerId===example.root.id&&row.field==='effects');
 spell.removedTemplateEffects=[rows[0].key];
 assert.deepEqual(await reviewDraft(draft),[]);
 spell.removedTemplateEffects=rows.map(row=>row.key);
 const issues=await reviewDraft(draft);
 assert.deepEqual(draftIssues(draft,(await creatorRules()).steps,()=>example),issues);
 assert.ok(issues.some(issue=>issue.step===9&&issue.uid===spell.uid&&issue.field==='effects'));
 await assert.rejects(generateClan(draft),/Just Cause necesita al menos un efecto/);
 spell.effects=[{recipe:'damage',amount:5,target:'enemy',when:'on_spawn'}];
 assert.deepEqual(await reviewDraft(draft),[]);
});

test('duplicates stay within the name limit and can be saved and reopened',async t=>{
 const draft=await newDraft();
 t.after(()=>fs.rm(projectFolder(draft.id),{recursive:true,force:true}));
 const card=structuredClone(draft.champions[0].card);
 card.name='A'.repeat(71)+'😀'+'Z'.repeat(7);
 assert.equal(card.name.length,80);
 const duplicate=duplicateCard(card,'long-name-copy','Copy of');
 assert.equal(duplicate.name.length,79);
 assert.equal(duplicate.name,'Copy of '+'A'.repeat(71));
 draft.cards.push(duplicate);
 await saveDraft(draft);
 assert.equal((await loadDraft(draft.id)).cards[0].name,duplicate.name);
});

test('runtime finds a secondary Steam library and persists a manually specified game folder', async t=>{
 const home=await fs.mkdtemp(path.join(dataRoot,'runtime-audit-'));
 t.after(()=>fs.rm(home,{recursive:true,force:true}));
 await fs.cp(path.join(projectRoot,'config'),path.join(home,'config'),{recursive:true});
 const primary=path.join(home,'Primary Steam','steamapps');
 const library=path.join(home,'Secondary library');
 const extra=path.join(library,'steamapps','common','Monster Train 2','MonsterTrain2_Data','Managed');
 const manual=path.join(home,'Manual Game');
 const manualManaged=path.join(manual,'MonsterTrain2_Data','Managed');
 await fs.mkdir(primary,{recursive:true});
 await fs.mkdir(extra,{recursive:true});
 await fs.mkdir(manualManaged,{recursive:true});
 for(const folder of [extra,manualManaged])for(const file of ['UnityEngine.dll','UnityEngine.CoreModule.dll'])await fs.writeFile(path.join(folder,file),'runtime detection fixture');
 const data=path.join(home,'config','creator.json');
 const rules=JSON.parse(await fs.readFile(data,'utf8'));
 rules.runtime.searchDirectories=[path.join(primary,'common','Monster Train 2','MonsterTrain2_Data','Managed')];
 await fs.writeFile(data,JSON.stringify(rules));
 await fs.writeFile(path.join(primary,'libraryfolders.vdf'),'"libraryfolders"\n{\n "1"\n {\n  "path" '+JSON.stringify(library)+'\n }\n}\n');
 const probe=`
  import assert from 'node:assert/strict';
  import fs from 'node:fs/promises';
  import path from 'node:path';
  import {createCreatorServer} from './src/server/creator-server.ts';
  const server=createCreatorServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/api/runtime';
  const home=process.env.CLAN_CREATOR_HOME,receipt=path.join(home,'data','creator-runtime.json');
  const read=async()=>JSON.parse(await fs.readFile(receipt,'utf8'));
  async function select(folder){return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({folder})});}
  try{
   assert.deepEqual((await (await fetch(url)).json()).gameRequired,[]);
   assert.match((await read()).references.UnityEngine,/Secondary library/);
   assert.equal((await select('relative')).status,400);
   assert.equal((await select(path.join(home,'Primary Steam'))).status,400);
   const manual=await select(path.join(home,'Manual Game'));
   assert.equal(manual.status,200);
   assert.deepEqual((await manual.json()).gameRequired,[]);
   await fetch(url);
   assert.match((await read()).references.UnityEngine,/Manual Game/);
  }finally{await new Promise(resolve=>server.close(resolve));}
 `;
 await promisify(execFile)(process.execPath,['--import','tsx','--input-type=module','-e',probe],{
  cwd:projectRoot,env:{...process.env,CLAN_CREATOR_HOME:home},timeout:20000,
 });
});
// 2026-11-20-0902||codex-clan-editor||clan-creator/tests/creator-functional-audit.test.ts||Cubrir los cuatro errores de la auditoría con pruebas de regresión
// 2026-11-21-0949||codex-clan-editor||clan-creator/tests/creator-functional-audit.test.ts||Probar deteccion de Steam y ruta manual sin binarios locales
// 2026-11-21-1219||codex-clan-editor||clan-creator/tests/creator-functional-audit.test.ts||Comparar validación con los pasos vigentes
