import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CardEditor} from '../src/web/creator/editors.tsx';
import {NativePathEffects} from '../src/web/creator/native-path-effects.tsx';
import path from 'node:path';
import {buildOfficialDraft} from '../src/server/creator/official-clans.ts';
import {championBaseDetail,currentCardParameters} from '../src/web/creator/champion-copy.ts';
import {championPreviewData} from '../src/web/creator/champion-preview.tsx';
import {effectiveUnitStats} from '../src/web/creator/template-upgrades.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {creatorRules,exampleList,readExample,cloneExampleCard,applyExampleParameters,exampleParameters} from '../src/server/creator/catalog.ts';
import {newDraft,saveDraft,loadDraft,projectFolder} from '../src/server/creator/projects.ts';
import {generateClan} from '../src/server/creator/export.ts';
import {description} from '../src/web/creator/presentation.ts';
import {scanClan} from '../src/server/scan.ts';
test('cada clan oficial ofrece seis variantes de campeón: tres sendas por dos campeones, nivel 1',async t=>{const rows=(await exampleList()).items.filter(e=>e.official&&e.championPath);if(!rows.length){t.skip('Catálogo oficial local no incluido en Git');return;}const clans=new Set(rows.map(e=>e.clan));assert.ok(clans.has('punished'));assert.equal(rows.length,clans.size*6);for(const clan of clans){const entries=rows.filter(e=>e.clan===clan);assert.equal(entries.length,6);assert.equal(new Set(entries.map(e=>e.championPath!.baseId)).size,2);for(const base of new Set(entries.map(e=>e.championPath!.baseId))){const paths=entries.filter(e=>e.championPath!.baseId===base);assert.deepEqual(paths.map(e=>e.championPath!.path).sort(),[1,2,3]);for(const summary of paths){const e=await readExample(summary.id),p=e.championPath!;assert.equal(p.level,1);assert.ok(e.document.cards.find(c=>c.id===e.root.id)!.initial_upgrades.includes('@'+p.localUpgradeId));assert.equal(p.upgrade.id,p.upgradeId);}}}});
test('copiar, guardar y generar conserva efectos nativos, condiciones y mejoras de senda; atributos se editan independientemente',async t=>{const list=(await exampleList()).items;if(!list.some(e=>e.championPath)){t.skip('Catálogo oficial local no incluido en Git');return;}let d=await newDraft();t.after(()=>fs.rm(projectFolder(d.id),{recursive:true,force:true}));d.name='Efectos y sendas';d.author='Pruebas';const path=list.find(e=>e.championPath?.baseId==='official-HornbreakerChampion'&&e.championPath.path===1)!;const original=await readExample(path.id);d.champions[0].card=cloneExampleCard(original,'champion-0');d.champions[1].card=cloneExampleCard(await readExample('official-TrainStewardShield'),'champion-1');d.champions.forEach(c=>c.paths.forEach((p,i)=>p.name='Senda '+i));d.starters=[cloneExampleCard(await readExample('official-StarterTorch'),'starter-0'),cloneExampleCard(await readExample('official-StarterHeal'),'starter-1')];for(const id of ['official-TrainStewardShield','official-TrainStewardSpear']){const c=cloneExampleCard(await readExample(id),randomUUID());c.banner=true;d.cards.push(c);}d.cards.push(cloneExampleCard(await readExample('official-StarterTorch'),randomUUID()));d.champions[0].card.attack+=3;d=await saveDraft(d);const reopened=await loadDraft(d.id);assert.equal(reopened.champions[0].card.templateId,path.id);const copied=applyExampleParameters(original,reopened.champions[0].card);assert.deepEqual(copied.effects,original.document.effects);assert.deepEqual(copied.character_triggers,original.document.character_triggers);assert.deepEqual(copied.cards[0].initial_upgrades,original.document.cards[0].initial_upgrades);const rules=await creatorRules();const preview=description(d.champions[0].card,{example:original,parameters:[]},'es',rules);assert.match(preview,/10/);assert.match(preview,/1/);const generated=await generateClan(reopened);t.after(()=>fs.rm(generated.root,{recursive:true,force:true}));const clan=await scanClan(generated.root);const root=clan.entries.find(e=>e.section==='cards'&&(e.data.names as any)?.spanish===d.champions[0].card.name)!;const localRefs=root.data.initial_upgrades as string[];assert.ok(localRefs.some(ref=>ref.startsWith('@')&&clan.entries.some(e=>e.section==='upgrades'&&'@'+e.id===ref)));assert.ok(!localRefs.includes(original.championPath!.upgradeId));assert.ok(clan.entries.some(e=>e.section==='effects'&&e.data.name==='CardEffectDamage'));assert.ok(clan.entries.some(e=>e.section==='effects'&&e.data.name==='CardEffectHeal'));assert.ok(clan.entries.some(e=>e.section==='effects'&&e.data.name==='CardEffectAddStatusEffect'));const e=await readExample('official-StarterTorch');assert.deepEqual(e.document,(await readExample('official-StarterTorch')).document);});
// 2026-11-15-1427||codex-clan-editor||clan-creator/tests/creator-champion-paths.test.ts||Verificar 72 sendas de nivel uno y persistencia y generación de efectos al copiar cartas y editar atributos
// 2026-11-15-1427||codex-clan-editor||clan-creator/tests\creator-champion-paths.test.ts||Completar recompensa normal requerida en el clan de prueba
// 2026-11-15-1826||codex-clan-editor||clan-creator/tests\creator-champion-paths.test.ts||Comprobar referencias a mejoras propias editables en vez de reutilizar mejoras globales oficiales
// 2026-11-15-1849||codex-clan-editor||clan-creator/tests\creator-champion-paths.test.ts||Exigir seis sendas iniciales por clan descubierto e incluir The Punished sin fijar un número máximo

test('Fel moves previously edited stat bonuses to Vanguardian I and shows the generated stats',async t=>{
 const empty=await newDraft();
 t.after(()=>fs.rm(projectFolder(empty.id),{recursive:true,force:true}));
 const draft=await buildOfficialDraft('banished','en');
 const fel=draft.champions[0],example=await readExample(fel.card.templateId!);
 const detail={example,parameters:exampleParameters(example)};
 const attackKey='upgrades|'+example.championPath!.localUpgradeId+'|bonus_damage';
 const healthKey='upgrades|'+example.championPath!.localUpgradeId+'|bonus_hp';
 assert.ok(currentCardParameters(detail).some((parameter:any)=>parameter.key===attackKey));
 assert.ok(!currentCardParameters(championBaseDetail(detail)).some((parameter:any)=>[attackKey,healthKey].includes(parameter.key)));
 fel.card.parameters[attackKey]=5;
 fel.card.parameters[healthKey]=30;
 fel.paths[0].levels[0].health=12;
 await fs.writeFile(path.join(projectFolder(empty.id),'draft.json'),JSON.stringify({...draft,id:empty.id}));
 const reopened=await loadDraft(empty.id),champion=reopened.champions[0];
 assert.equal(champion.paths[0].levels[0].attack,5);
 assert.equal(champion.paths[0].levels[0].health,12);
 assert.equal(champion.card.parameters[attackKey],undefined);
 const details={[example.id]:{...detail,card:champion.card}};
 const rules=await creatorRules();
 const config={rules,catalog:{items:[]}};
 const editor=renderToStaticMarkup(React.createElement(CardEditor,{
  card:champion.card,template:details[example.id],champion:true,championDraft:champion,config,details,
  language:'en',projectId:empty.id,onChange:()=>{},onChoose:()=>{},onUpload:()=>{},
 }));
 assert.doesNotMatch(editor,/value="on_hit" selected=""/);
 assert.match(editor,/Multistrike/);
 const pathEditor=renderToStaticMarkup(React.createElement(NativePathEffects,{
  level:champion.paths[0].levels[0],detail:details[example.id],rules,language:'en',onChange:()=>{},
 }));
 assert.match(pathEditor,/value="on_hit" selected="">Revenge/);
 assert.match(pathEditor,/Apply statuses: Valor 1/);
 const base=championPreviewData(champion,detail,null,0,details);
 assert.equal(effectiveUnitStats(base.card,base.template).attack,1);
 const level=championPreviewData(champion,detail,0,0,details);
 assert.equal(effectiveUnitStats(level.card,level.template).attack,6);
 const generated=await generateClan(reopened);
 t.after(()=>fs.rm(generated.root,{recursive:true,force:true}));
 const clan=await scanClan(generated.root);
 const upgrade=clan.entries.find(e=>e.section==='upgrades'&&e.id==='Champion0Path0Level0');
 assert.equal(upgrade?.data.bonus_damage,5);
 assert.equal(upgrade?.data.bonus_hp,12);
});
// 2026-11-19-2126||codex-clan-editor||clan-creator/tests/creator-champion-paths.test.ts||Probar recuperación de Extra attack 5 de Fel con vista previa y JSON del nivel Vanguardian I
// 2026-11-19-2126||codex-clan-editor||clan-creator/tests/creator-champion-paths.test.ts||Importar el inspector de campos de la plantilla en la prueba de Fel
// 2026-11-19-2129||codex-clan-editor||clan-creator/tests/creator-champion-paths.test.ts||Verificar que Revenge y Valor solo se editan en Vanguardian I y que la base conserva Multistrike
// 2026-11-21-1050||codex-clan-editor||clan-creator/tests/creator-champion-paths.test.ts||Contar seis sendas solo para clanes oficiales al verificar su cobertura
// 2026-11-21-1829||codex-clan-editor||clan-creator/tests/creator-champion-paths.test.ts||Comprobar Revenge en la activación de la senda y no en el texto duplicado de la acción
