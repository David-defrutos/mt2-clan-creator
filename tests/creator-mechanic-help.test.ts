import {replaceCopiedEffect} from '../src/web/creator/copied-effect-replacement.tsx';
import {templateEffects} from '../src/server/creator/template-effects.ts';
import {blankCard} from '../src/server/creator/model.ts';
import {effectOptions} from '../src/web/creator/effect-options.ts';
import {visibleSearchOptions} from '../src/web/creator/search-select.tsx';
import {replaceCard} from '../src/web/creator/replacement.tsx';
import {TemplateEffectsEditor} from '../src/web/creator/template-effects-editor.tsx';
import {nativeEffectText} from '../src/server/creator/template-effect-text.ts';
import {applyExampleParameters} from '../src/server/creator/catalog.ts';
import {unitAuras} from '../src/server/creator/unit-auras.ts';
import {newDraft,saveDraft,loadDraft,projectFolder,validateDraftShape} from '../src/server/creator/projects.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readExample,exampleList,exampleParameters,cloneExampleCard,creatorRules} from '../src/server/creator/catalog.ts';
import {buildOfficialDraft} from '../src/server/creator/official-clans.ts';
import {generateClan} from '../src/server/creator/export.ts';
import {scanClan} from '../src/server/scan.ts';
import {description} from '../src/web/creator/presentation.ts';
import {UnitAbilities} from '../src/web/creator/unit-abilities.tsx';
import {MechanicHelp,effectHelp} from '../src/web/creator/mechanic-help.tsx';
test('Wildwood Custodian: aura visible y cantidad editable en copia completa de Awoken sin alterar el original',async t=>{const e=await readExample('official-WildwoodCustodian'),original=JSON.stringify(e),parameters=exampleParameters(e),rules=await creatorRules(),card=cloneExampleCard(e,'custodian','en'),p=parameters.find(p=>p.label==='RoomStateHandSizeModifier');assert.ok(p);assert.match(description(card,{example:e,parameters},'en',rules),/Draw \+1 each turn/);assert.match(description(card,{example:e,parameters},'es',rules),/Roba \+1 cada turno/);const d=await buildOfficialDraft('awoken','en'),c=d.cards.find(c=>c.templateId===e.id)!;c.parameters[p.key]=3;assert.match(description(c,{example:e,parameters},'en',rules),/Draw \+3 each turn/);const g=await generateClan(d);t.after(()=>fs.rm(g.root,{recursive:true,force:true}));const scan=await scanClan(g.root);assert.ok(scan.entries.some(e=>e.section==='room_modifiers'&&e.data.name==='RoomStateHandSizeModifier'&&e.data.param_int===3));assert.equal(JSON.stringify(e),original);});
test('ayudas: Trample y Skewer tienen explicacion localizada y tooltip accesible en capacidades asignadas',async()=>{const rules=await creatorRules();for(const language of ['es','en'] as const){const html=renderToStaticMarkup(React.createElement(UnitAbilities,{value:[{status:'trample',count:1},{status:'Conductor_pierce',count:2}],onChange:()=>{},rules,language}));assert.equal((html.match(/role="tooltip"/g)??[]).length,2);assert.match(html,/aria-describedby/);assert.match(html,language==='es'?/daño sobrante/:/excess damage/);assert.match(html,language==='es'?/detrás del objetivo/:/behind the attacked unit/);const recipe=rules.recipes.find((r:any)=>r.id==='damage');assert.ok(effectHelp(recipe,rules,language,9,'enemy').includes('9'));}});
// 2026-11-15-2028||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.tsx||Probar aura visible y editable de Custodian y tooltips localizados para capacidades oficiales y Conductor

test('auras de Shard Channeler y Edge Prior se muestran con cantidades reales y sin etiquetas sin resolver',async()=>{const rules=await creatorRules();for(const [id,pattern]of [['official-ShardChanneler',/Spikes.*\+1 damage per stack/i],['official-EdgePrior',/cost -1.*on this floor/i]] as const){const example=await readExample(id),parameters=exampleParameters(example),card=cloneExampleCard(example,'copy','en');const text=description(card,{example,parameters},'en',rules);assert.match(text,pattern);assert.doesNotMatch(text,/powerabs|paramint|\[power\]/);assert.ok(parameters.some(p=>p.section==='room_modifiers'));}});
// 2026-11-15-2030||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Incluir regresiones de Custodian Shard Channeler Edge Prior y ayudas en la suite habitual

test('eliminar aura de Custodian: guardar, reabrir y generar sin robar cartas ni cambiar Shard Channeler o el original',async t=>{const e=await readExample('official-WildwoodCustodian'),snapshot=JSON.stringify(e),d=await buildOfficialDraft('awoken','en'),c=d.cards.find(c=>c.templateId===e.id)!;const aura=unitAuras(e.document,e.root)[0];assert.ok(aura);c.removedAuras=[aura.id];assert.doesNotMatch(description(c,{example:e,parameters:exampleParameters(e)},'en',await creatorRules()),/Draw|each turn/);assert.equal(unitAuras(applyExampleParameters(e,c),e.root).length,0);const invalid=structuredClone(d);invalid.cards.find(c=>c.templateId===e.id)!.removedAuras=['not-a-unit-aura'];await assert.rejects(validateDraftShape(invalid));const empty=await newDraft();t.after(()=>fs.rm(projectFolder(empty.id),{recursive:true,force:true}));await saveDraft({...d,id:empty.id,revision:empty.revision});const restored=await loadDraft(empty.id);assert.deepEqual(restored.cards.find(c=>c.templateId===e.id)!.removedAuras,[aura.id]);const g=await generateClan(restored);t.after(()=>fs.rm(g.root,{recursive:true,force:true}));const scan=await scanClan(g.root),custodian=scan.entries.find(e=>e.section==='characters'&&e.data.names?.english==='Wildwood Custodian')!,shard=scan.entries.find(e=>e.section==='characters'&&e.data.names?.english==='Shard Channeler')!;assert.equal(custodian.data.room_modifiers.length,0);assert.equal(shard.data.room_modifiers.length,1);assert.equal(JSON.stringify(e),snapshot);});
// 2026-11-15-2042||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Verificar eliminacion real del aura de Custodian persistencia validacion e independencia de otras cartas

test('Just Cause names Advance in the editor and moving to the back is Retreat',async()=>{
 const rules=await creatorRules(),example=await readExample('official-JustCause');
 const template={example,parameters:exampleParameters(example)};
 const card=cloneExampleCard(example,'just-cause','en');
 const move=example.document.effects.find(effect=>effect.name==='CardEffectFloorRearrange')!;
 for(const language of ['en','es'] as const){
  const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{card,template,rules,language,onChange:()=>{}}));
  assert.ok(html.includes('value="'+rules.statusLabels.advance[language]+'"'));
  assert.equal(html.split('>'+rules.usabilityText.spellWhen[language]+'</span>').length-1,2);
  assert.equal(html.split('>'+rules.labels.target[language]+'</span>').length-1,2);
  assert.ok(html.includes(rules.nativeTargetLabels.drop_target_character[language]));
  assert.ok(html.includes(rules.nativeTargetLabels.last_targeted_characters[language]));
  assert.equal(nativeEffectText(example.document,'effects',{...move,param_int:1},language,rules),rules.statusLabels.retreat[language]);
 }
});
// 2026-11-19-2135||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Comprobar Avanzar en Just Cause y distinguir el movimiento hacia atrás

test('edit Advance on a saved clan copy from Just Cause or replace the starter entirely',async t=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('banished','en'),empty=await newDraft();
 t.after(()=>fs.rm(projectFolder(empty.id),{recursive:true,force:true}));
 const index=draft.starters.findIndex(card=>card.templateId==='official-JustCause');
 assert.ok(index>=0);
 const card=draft.starters[index],example=await readExample(card.templateId!);
 const parameters=exampleParameters(example),movement=parameters.find(p=>p.label==='CardEffectFloorRearrange')!;
 assert.deepEqual(movement.choices,[0,1]);
 delete card.parameters[movement.key];
 const saved=await saveDraft({...draft,id:empty.id});
 saved.starters[index].parameters[movement.key]=1;
 const edited=await saveDraft(saved);
 const reopened=await loadDraft(empty.id),changed=reopened.starters[index];
 const template={example,parameters};
 assert.match(description(changed,template,'en',rules),/Retreat/);
 assert.doesNotMatch(description(changed,template,'en',rules),/Advance/);
 assert.match(description(changed,template,'en',rules),/Valor 2/);
 const generated=await generateClan(reopened);
 t.after(()=>fs.rm(generated.root,{recursive:true,force:true}));
 const scan=await scanClan(generated.root),root=scan.entries.find(e=>e.section==='cards'&&e.data.names?.english==='Just Cause')!;
 assert.match(root.data.descriptions.english,/\[retreat\]/);
 assert.ok(scan.entries.some(e=>e.section==='effects'&&root.data.effects.includes('@'+e.id)&&e.data.name==='CardEffectFloorRearrange'&&e.data.param_int===1));
 const replacement=await readExample('official-StarterHeal');
 edited.starters[index]=replaceCard(changed,cloneExampleCard(replacement,'example','en'),{example:replacement},'all',rules);
 await saveDraft(edited);
 const final=await loadDraft(empty.id);
 assert.equal(final.starters[index].uid,changed.uid);
 assert.equal(final.starters[index].templateId,replacement.id);
 assert.equal((await readExample(example.id)).document.effects.find(e=>e.name==='CardEffectFloorRearrange')?.param_int,undefined);
});
// 2026-11-19-2138||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Probar cambio de movimiento y sustitución total de Just Cause en una copia guardada

test('find and add Advance or Retreat from scratch, producing the correct in-floor movement',async t=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('banished','en');
 for(const [index,id] of ['advance','retreat'].entries()){
  const label=rules.recipes.find((recipe:any)=>recipe.id===id).label.en;
  assert.ok(visibleSearchOptions(effectOptions(rules,'en',false),label.slice(0,3),true).some(option=>option.value===id));
  const card=blankCard('spell','movement-'+id);
  card.name='Test '+label;
  card.effects=[{recipe:id,amount:1,target:'spell_target',when:'on_spawn'}];
  draft.starters[index]=card;
  assert.equal(description(card,undefined,'en',rules),label+'.');
 }
 await validateDraftShape(draft);
 const generated=await generateClan(draft);
 t.after(()=>fs.rm(generated.root,{recursive:true,force:true}));
 const scan=await scanClan(generated.root);
 for(const [i,label] of ['Advance','Retreat'].entries()){
  const root=scan.entries.find(e=>e.section==='cards'&&e.data.names?.english==='Test '+label)!;
  assert.ok(scan.entries.some(e=>e.section==='effects'&&root.data.effects.includes('@'+e.id)&&e.data.name==='CardEffectFloorRearrange'&&e.data.param_int===i&&e.data.target_mode==='drop_target_character'&&e.data.target_team==='both'));
 }
});
// 2026-11-19-2142||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Probar búsqueda y generación de Advance y Retreat en un hechizo desde cero
// 2026-11-19-2211||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Verificar que Just Cause solo muestra el objetivo conocido y omite el momento genérico
// 2026-11-19-2213||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Verificar el momento y los destinatarios distintos de Advance y Valor en Just Cause

test('all room examples render copied rules and Bloodsoaked Arena uses its actual Slay effect',async()=>{
 const rules=await creatorRules(),catalog=await exampleList();
 for(const item of catalog.items.filter(item=>item.kind==='room')){
  const example=await readExample(item.id),parameters=exampleParameters(example);
  for(const language of ['en','es'] as const){
   const card=cloneExampleCard(example,'room-copy',language);
   const render=()=>renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
    card,template:{example,parameters},rules,language,onChange:()=>{},
   }));
   const html=render();
   assert.doesNotMatch(html,/As defined by this effect|As defined by the effect’s selection|Special effect|Efecto especial/);
   if(item.id==='official-BloodsoakedArena'){
    assert.ok(html.includes(rules.triggerLabels.on_kill[language]));
    assert.ok(html.includes(rules.nativeRoomTeams.monsters[language]));
    assert.match(html,/Valor 6/);
    assert.equal((html.match(/native-effect-card/g)??[]).length,1);
    const amount=parameters.find(p=>p.status==='valor')!;
    card.parameters[amount.key]=8;
    assert.match(render(),/Valor 8/);
    assert.match(description(card,{example,parameters},language,rules),/Valor 8/);
    assert.equal(applyExampleParameters(example,card).effects.find(e=>e.param_status_effects)?.param_status_effects[0].count,8);
   }
   if(item.id==='official-InfernoRoom'){
    assert.ok(html.includes(rules.nativeRoomTiming.RoomStateAddEffectPreCombatModifier[language]));
    assert.ok(html.includes('<option value="all_units" selected="">'+rules.targets.find((option:any)=>option.value==='all_units').label[language]+'</option>'));
    assert.ok(html.includes('50'));
   }
  }
 }
});
// 2026-11-19-2216||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Comprobar todas las salas en ambos idiomas y editar la cantidad real de Bloodsoaked Arena
// 2026-11-19-2216||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Exigir texto concreto al abrir las 39 salas del catálogo

test('removing a spell effect preserves the selection used by the next effect',async t=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('banished','en');
 for(const [exampleId,mode,team] of [
  ['official-JustCause','drop_target_character','both'],
  ['official-CryptBuilder','front_in_room','heroes'],
 ]){
  const example=await readExample(exampleId);
  const card=cloneExampleCard(example,'target-test','en');
  const first=templateEffects(example.document,example.root).find(row=>row.field==='effects'&&row.ownerId===example.root.id&&row.index===0)!;
  card.removedTemplateEffects=[first.key];
  const edited=applyExampleParameters(example,card);
  const root=edited.cards.find(node=>node.id===example.root.id)!;
  const remaining=edited.effects.find(effect=>root.effects[0]==='@'+effect.id)!;
  assert.equal(remaining.target_mode,mode);
  assert.equal(remaining.target_team,team);
  assert.equal(example.document.effects.find(effect=>effect.id===remaining.id)?.target_mode,'last_targeted_characters');
  if(exampleId==='official-JustCause'){
   const index=draft.starters.findIndex(item=>item.templateId===exampleId);
   draft.starters[index]={...card,uid:draft.starters[index].uid};
   const parameters=exampleParameters(example);
   const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
    card,template:{example,parameters},rules,language:'en',onChange:()=>{},
   }));
   assert.match(html,/Valor 2/);
   assert.ok(html.includes(rules.nativeTargetLabels.drop_target_character.en));
   assert.ok(html.includes(rules.guidedText.preservedEffectTarget.en));
   assert.doesNotMatch(html,/targeted by the previous effect/);
  }
 }
 const generated=await generateClan(draft);
 t.after(()=>fs.rm(generated.root,{recursive:true,force:true}));
 const scan=await scanClan(generated.root);
 const root=scan.entries.find(entry=>entry.section==='cards'&&entry.data.names?.english==='Just Cause')!;
 const effect=scan.entries.find(entry=>entry.section==='effects'&&root.data.effects.includes('@'+entry.id))!;
 assert.equal(effect.data.target_mode,'drop_target_character');
 assert.equal(effect.data.param_status_effects[0].count,2);
});
// 2026-11-19-2221||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Verificar el objetivo conservado en el editor y el clan generado con Just Cause y Crypt Builder

test('Flight in an official clan copy has editable cooldown and floor targeting that reach exported JSON',async t=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('punished','en');
 const archus=draft.champions.find(champion=>champion.card.name==='Archus')!.card;
 const example=await readExample(archus.templateId!),before=JSON.stringify(example);
 const ability=example.document.cards.find(definition=>definition.is_an_ability&&definition.names?.english==='Flight')!;
 const parameters=exampleParameters(example),key=(field:string)=>parameters.find(p=>p.id===ability.id&&p.path[0]===field)!.key;
 assert.equal(ability.cooldown,2);
 assert.equal(ability.can_ability_target_other_floors,true);
 const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
  card:archus,template:{example,parameters},rules,language:'en',onChange:()=>{},
 }));
 assert.match(html,/Cooldown \(turns\)/);
 assert.match(html,/Which floors you can target/);
 assert.match(html,/When you activate this ability/);
 archus.parameters[key('cooldown')]=4;
 archus.parameters[key('initial_cooldown')]=1;
 archus.parameters[key('can_ability_target_other_floors')]=0;
 const invalid=structuredClone(draft);
 invalid.champions.find(champion=>champion.card.name==='Archus')!.card.parameters[key('cooldown')]=-1;
 await assert.rejects(validateDraftShape(invalid),/cantidad/);
 const saved=await newDraft();
 t.after(()=>fs.rm(projectFolder(saved.id),{recursive:true,force:true}));
 await saveDraft({...draft,id:saved.id,revision:saved.revision});
 const reloaded=await loadDraft(saved.id);
 const generated=await generateClan(reloaded,archus.uid);
 const flight=JSON.parse(generated.cardJson!).cards.find((d:any)=>d.names?.english==='Flight');
 assert.equal(flight.cooldown,4);
 assert.equal(flight.initial_cooldown,1);
 assert.equal(flight.can_ability_target_other_floors,false);
 assert.match(flight.descriptions.english,/on the current floor/);
 assert.match(flight.descriptions.spanish,/del piso actual/);
 assert.equal(JSON.stringify(await readExample(example.id)),before);
});

test('replace one copied spell effect without discarding its other effects, identity or artwork',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('banished','en');
 const index=draft.starters.findIndex(card=>card.name==='Just Cause');
 const card=draft.starters[index],example=await readExample(card.templateId!),parameters=exampleParameters(example);
 const native=templateEffects(example.document,example.root).find(row=>row.definition.name==='CardEffectFloorRearrange')!;
 const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
  card,template:{example,parameters},rules,language:'en',onChange:()=>{},
 }));
 assert.match(html,/role="combobox" aria-label="What it does"[^>]+value="Advance"/);
 const edited=replaceCopiedEffect(card,native.key,'on_spawn',rules.recipes.find((r:any)=>r.id==='damage'));
 draft.starters[index]=edited;
 await validateDraftShape(draft);
 assert.equal(edited.name,card.name);
 assert.equal(edited.templateId,card.templateId);
 assert.equal(edited.image,card.image);
 const json=JSON.parse((await generateClan(draft,edited.uid)).cardJson!);
 const root=json.cards.find((d:any)=>d.names?.english==='Just Cause');
 const active=json.effects.filter((e:any)=>root.effects.includes('@'+e.id));
 assert.ok(active.some((e:any)=>e.name==='CardEffectDamage'));
 assert.ok(active.some((e:any)=>e.name==='CardEffectAddStatusEffect'));
 assert.ok(active.every((e:any)=>e.name!=='CardEffectFloorRearrange'));
});
// 2026-11-21-1018||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Probar cambios en habilidades copiadas reales y sustitucion de un efecto en el JSON generado
// 2026-11-21-1301||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Comprobar el desplegable incorporado en Qué hace en lugar del botón que sustituye
// 2026-11-21-1321||codex-clan-editor||clan-creator/tests/creator-mechanic-help.test.ts||Verificar que Inferno selecciona los dos equipos en el desplegable editable
