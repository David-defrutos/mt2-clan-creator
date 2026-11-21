import {exampleMatcher,matchesExample} from '../src/web/creator/catalog-search.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {blankDraft} from '../src/server/creator/model.ts';
import {creatorRules,exampleList,readExample,cloneExampleCard,exampleParameters} from '../src/server/creator/catalog.ts';
import {validateDraftShape} from '../src/server/creator/projects.ts';
import {generateClan,reviewDraft} from '../src/server/creator/export.ts';
import {scanClan} from '../src/server/scan.ts';
import {exampleSearchText} from '../src/server/creator/example-search-text.ts';
import {wizardProgress} from '../src/web/creator/progress.ts';
import {zipBuffers} from '../src/server/creator/zip.ts';
test('avance guiado identifica el primer dato pendiente y no exige arte personalizado',async()=>{const d=blankDraft(randomUUID()),rules=await creatorRules();assert.equal(wizardProgress(d,rules.steps).pending,0);d.name='Mi clan';d.author='David';assert.equal(wizardProgress(d,rules.steps).pending,1);d.champions.forEach(c=>{c.card.name='Campeón';c.paths.forEach(p=>p.name='Senda');});d.starters.forEach(c=>c.name='Inicial');assert.equal(wizardProgress(d,rules.steps).pending,10);});
test('la distribución comprimida produce entradas ZIP estándar que se pueden descomprimir',()=>{const source=Buffer.from('clan creator '.repeat(1000));const zip=zipBuffers([{name:'Creator/program.js',bytes:source}],{compress:true});assert.equal(zip.readUInt16LE(8),8);const start=30+zip.readUInt16LE(26)+zip.readUInt16LE(28);const compressed=zip.readUInt32LE(18);assert.deepEqual(inflateRawSync(zip.subarray(start,start+compressed)),source);assert.ok(zip.length<source.length);});
test('se guardan y generan cartas sin PNG, costes X, equipos y artefactos nativos sin meter plagas en recompensas',async t=>{const rows=(await exampleList()).items.filter(e=>e.official);if(!rows.length){t.skip('Recursos oficiales locales no publicados en Git');return;}assert.ok(rows.some(e=>e.clan==='punished'));assert.ok(rows.filter(e=>e.kind!=='artifact'&&!e.championPath).length>=577);assert.ok(rows.filter(e=>e.kind==='artifact').length>=221);assert.ok(!exampleParameters(await readExample('official-relic-RagePreservedOnFriendlies')).some(p=>p.path.at(-1)==='count'));const d=blankDraft(randomUUID());d.name='Todos pueden crear';d.author='Pruebas';const missing=rows.find(e=>e.kind==='unit'&&!e.picture)!;assert.ok(missing);for(let i=0;i<2;i++){d.champions[i].card=cloneExampleCard(await readExample(i?'official-TrainStewardShield':missing.id),'champion-'+i);d.champions[i].paths.forEach(p=>p.name='Senda');d.starters[i]=cloneExampleCard(await readExample(i?'official-StarterHeal':'official-StarterTorch'),'starter-'+i);}
 for(const kind of ['equipment','blight','junk','artifact']){const e=rows.find(e=>e.kind===kind)!;d.cards.push(cloneExampleCard(await readExample(e.id),randomUUID()));}for(const id of ['official-TrainStewardShield','official-TrainStewardSpear','official-StarterTorch']){const c=cloneExampleCard(await readExample(id),randomUUID());if(c.kind==='unit')c.banner=true;d.cards.push(c);}const x=rows.find(e=>e.costType==='x')!;d.cards.push(cloneExampleCard(await readExample(x.id),randomUUID()));await validateDraftShape(d);assert.deepEqual(await reviewDraft(d),[]);const result=await generateClan(d);try{const clan=await scanClan(result.root);for(const e of clan.entries.filter(e=>e.section==='cards'&&['blight','junk'].includes(String(e.data.card_type))))assert.deepEqual(e.data.pools,[]);assert.ok(clan.entries.some(e=>e.section==='cards'&&e.data.card_type==='equipment'));assert.ok(clan.entries.some(e=>e.section==='cards'&&e.data.cost_type==='x'));assert.ok(clan.entries.some(e=>e.section==='relics'));assert.ok(!clan.entries.some(e=>e.section==='sprites'&&String(e.data.path).endsWith('/.png')));}finally{await fs.rm(result.root,{recursive:true,force:true});}});
// 2026-11-15-1228||codex-clan-editor||clan-creator/tests/creator-usability.test.ts||Verificar avance, ZIP comprimido y generación funcional sin imágenes ni recompensas accidentales
// 2026-11-15-1234||codex-clan-editor||clan-creator/tests/creator-usability.test.ts||Verificar que no se permite editar una cantidad que el efecto nativo ignora

test('buscar curar, robar y furia encuentra comportamientos conocidos sin acentos',async()=>{const rules=await creatorRules();assert.ok(matchesExample({names:{english:'Restore'},descriptions:{spanish:'Restaura 2 de salud.'}},'curar','es',rules));assert.ok(matchesExample({descriptions:{english:'Draw 2 cards.'}},'robar','es',rules));assert.ok(matchesExample({descriptions:{spanish:'La [rage] no se reduce.'}},'furia','es',rules));assert.ok(!matchesExample({descriptions:{spanish:'Inflige 3 de daño.'}},'curar','es',rules));});
test('catalog search finds natural phrases and Spanish forms of known mechanics',async()=>{
 const rules=await creatorRules();
 const cards=[
  {id:'strike',descriptions:{english:'Deal 5 damage.'}},
  {id:'space',descriptions:{english:'Gain 2 capacity.'}},
  {id:'daze',descriptions:{spanish:'Aplica Aturdimiento.'}},
  {id:'poison',descriptions:{english:'Apply poison.'}},
  {id:'shield',descriptions:{spanish:'Consigue Escudo de daño.'}},
  {id:'decoy',descriptions:{english:'A workshop repairs armor.'}},
 ];
 const search=(query:string)=>cards.filter(exampleMatcher(query,rules)).map(card=>card.id);
 assert.deepEqual(search('hacer daño'),['strike','shield']);
 assert.deepEqual(search('más capacidad'),['space']);
 assert.deepEqual(search('aturdir'),['daze']);
 assert.deepEqual(search('aturdido'),['daze']);
 assert.deepEqual(search('envenenar'),['poison']);
 assert.deepEqual(search('proteger'),['shield']);
 assert.deepEqual(search('proteger y daño'),['shield']);
 assert.deepEqual(search('shop'),[]);
});

test('the catalogue indexes copied community mechanics and official units with no card description',async()=>{
 const rules=await creatorRules(),{items}=await exampleList();
 const desire=await readExample('succclan-DesireCrystal');
 const text=exampleSearchText({...desire,descriptions:{}},rules);
 assert.match(text,/first Ghost.*Draw 1 card/i);
 assert.match(text,/Roba 1 carta/);
 assert.ok(exampleMatcher('robar fantasma',rules)({searchText:text}));
 assert.ok(items.filter(item=>!item.official).every(item=>item.searchText?.trim()));
 const custodian=items.find(item=>item.id==='official-WildwoodCustodian');
 if(custodian){
  assert.equal(custodian.descriptions.english,undefined);
  assert.match(custodian.searchText??'',/Draw \+1 each turn/);
  assert.ok(exampleMatcher('robar cada turno',rules)(custodian));
 }
});
// 2026-11-15-1240||codex-clan-editor||clan-creator/tests/creator-usability.test.ts||Comprobar búsquedas semánticas sencillas con ejemplos que no contienen el término exacto escrito
// 2026-11-15-1425||codex-clan-editor||clan-creator/tests\creator-usability.test.ts||Contar cartas base oficiales sin confundir variantes de senda con cartas nuevas
// 2026-11-15-1851||codex-clan-editor||clan-creator/tests\creator-usability.test.ts||Comprobar ampliación real del catálogo sin exigir recuentos de la extracción anterior
// 2026-11-15-1852||codex-clan-editor||clan-creator/tests\creator-usability.test.ts||Aceptar nuevos recuentos únicos auditados en lugar de contar duplicados de archivos de extracción
// 2026-11-21-2046||codex-clan-editor||clan-creator/tests/creator-usability.test.ts||Verificar consultas naturales, límites de coincidencia e índice lingüístico de los catálogos
// 2026-11-21-2046||codex-clan-editor||clan-creator/tests/creator-usability.test.ts||Comprobar la combinación de dos efectos escritos con una conjunción
