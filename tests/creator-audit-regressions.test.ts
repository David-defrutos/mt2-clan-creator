import test from 'node:test';
import fs from 'node:fs/promises';
import {createCreatorServer} from '../src/server/creator-server.ts';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {creatorRules,readExample,cloneExampleCard,exampleParameters} from '../src/server/creator/catalog.ts';
import {templateEffects} from '../src/server/creator/template-effects.ts';
import {buildOfficialDraft} from '../src/server/creator/official-clans.ts';
import {generateClan,reviewDraft} from '../src/server/creator/export.ts';
import {projectFolder,validateDraftShape} from '../src/server/creator/projects.ts';
import {description} from '../src/web/creator/presentation.ts';
import {replaceCopiedEffect} from '../src/web/creator/copied-effect-replacement.tsx';
import {TemplateEffectsEditor} from '../src/web/creator/template-effects-editor.tsx';
import {SimplifiedEffectsNotice} from '../src/web/creator/simplified-effects-notice.tsx';
import {parameterLabel} from '../src/web/creator/components.tsx';


test('audited example amounts and artifact conditions remain editable through export',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 const cases=[
  ['official-relic-IncreaseMagicPowerOnSpellsPlayed',{RelicEffectModifyCardMagicPowerOnCardPlayed:2,RelicSpellCountThreshold:2},/2 spells.*\+2/i],
  ['official-relic-MoonPhaseModifyEmber',{RelicEffectModifyEnergyOnMoonPhase:3,RelicActiveMoonPhase:1},/new.*3/i],
  ['official-relic-CorruptionBattleStart',{RelicEffectModifyCorruptionStartOfCombat:4},/4/],
  ['official-relic-BalatroEventCanio',{RelicEffectAddGoldOnPurge:100},/100/],
  ['official-TotalRecallRoom',{RoomStateDrawRandomConsumedCardsPreCombatModifier:3},/3 random consumed spells/],
  ['official-Bonk',{CardEffectAdjustForgePoints:5},/forge.*5/i],
 ];
 for(const [id,changes,preview] of cases){
  const {example,card,parameters}=await fixture(id);
  const edited=parameters.filter(p=>Object.hasOwn(changes,p.label));
  assert.equal(edited.length,Object.keys(changes).length,id);
  for(const p of edited)card.parameters[p.key]=changes[p.label];
  const {doc}=await jsonFor(draft,card);
  for(const p of edited){
   const def=doc[p.section].find(item=>p.section==='relic_effect_conditions'||item.name===example.document[p.section].find(source=>source.id===p.id)?.name);
   assert.equal(def[p.path[0]],changes[p.label],id+' '+p.label);
  }
  assert.match(description(card,{example,parameters},'en',rules),preview,id);
 }
});

test('all room abilities use their native activation and keep their actions when cooldown changes',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 for(const id of ['official-AssemblyRoom','official-EchoBloom','official-SteelPulleyClaw','official-TrapChute']){
  const {example,card,parameters}=await fixture(id);
  const cooldown=parameters.find(p=>p.path[0]==='cooldown'),initial=parameters.find(p=>p.path[0]==='initial_cooldown');
  assert.ok(cooldown&&initial,id);
  const prior=example.document.cards.find(definition=>definition.id===cooldown.id)!;
  card.parameters[cooldown.key]=6;card.parameters[initial.key]=2;
  const copies=parameters.find(p=>p.label==='CardEffectCopyUnits');
  if(copies)card.parameters[copies.key]=2;
  const original=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{card,template:{example,parameters},onChange:()=>{},rules,language:'en'}));
  assert.match(original,/Cooldown \(turns\)/,id);
  assert.match(original,/when you activate this ability/i,id);
  assert.doesNotMatch(original,/When the spell is played/,id);
  const {doc}=await jsonFor(draft,card);
  const ability=doc.cards.find(definition=>definition.is_room_ability);
  assert.equal(ability.cooldown,6,id);
  assert.equal(ability.initial_cooldown,2,id);
  assert.equal(ability.effects.length,prior.effects.length,id);
  assert.ok(doc.upgrades.some(upgrade=>upgrade.room_ability_upgrade==='@'+ability.id),id);
  if(copies){
   assert.equal(doc.effects.find(effect=>effect.name==='CardEffectCopyUnits').param_int,2);
   assert.match(ability.descriptions.english,/2 copies.*last copy/);
   assert.match(ability.descriptions.spanish,/2 copias.*última copia/);
  }
 }
});

test('removing or replacing one artifact action preserves its siblings, filter and condition',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 const {example,card,parameters,rows}=await fixture('succclan-DesireCrystal');
 const draw=rows.find(row=>row.field==='param_effects'&&row.definition.name==='CardEffectDraw')!;
 const ember=rows.find(row=>row.field==='param_effects'&&row.definition.name==='CardEffectGainEnergy')!;
 assert.equal(draw.parent,ember.parent);
 const markup=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{card,template:{example,parameters},onChange:()=>{},rules,language:'en'}));
 assert.match(markup,/Draw 1 card/);
 assert.match(markup,/Gain 1 ember/);
 assert.match(markup,/share the artifact/);
 card.removedTemplateEffects=[draw.key];
 const removed=await jsonFor(draft,card),wrapper=removed.doc.relic_effects.find(effect=>effect.name==='RelicEffectAddEffectOnUnitSpawn');
 const active=wrapper.param_effects.map(ref=>removed.doc.effects.find(effect=>'@'+effect.id===ref));
 assert.deepEqual(active.map(effect=>effect.name),['CardEffectGainEnergy']);
 assert.ok(removed.doc.subtypes.some(subtype=>'@'+subtype.id===wrapper.param_subtype));
 assert.equal(wrapper.conditions.length,1);
 assert.match(removed.root.descriptions.english,/first Ghost.*1 ember/i);
 assert.doesNotMatch(removed.root.descriptions.english,/draw/i);
 assert.match(description(card,{example,parameters},'en',rules),/first Ghost.*1 ember/i);
 card.removedTemplateEffects=[];
 card.copiedEffectEdits={[ember.key]:{recipe:'draw',amount:3}};
 const replaced=await jsonFor(draft,card);
 const group=replaced.doc.relic_effects[0];
 assert.equal(group.conditions.length,1);
 assert.deepEqual(group.param_effects.map(ref=>replaced.doc.effects.find(effect=>'@'+effect.id===ref).param_int),[1,3]);
 assert.match(replaced.root.descriptions.english,/Draw 3 cards/);
 assert.doesNotMatch(replaced.root.descriptions.english,/ember/i);

 const cleanse=await fixture('official-relic-ChanceToCleanse');
 const probability=cleanse.parameters.find(p=>p.label==='RelicEffectChanceAddEffectAfterSpawn')!;
 const action=cleanse.rows.find(row=>row.field==='param_effects')!;
 cleanse.card.parameters[probability.key]=75;
 cleanse.card.copiedEffectEdits={[action.key]:{recipe:'damage',amount:6}};
 const result=await jsonFor(draft,cleanse.card);
 const trigger=result.doc.relic_effects[0],replacement=result.doc.effects.find(effect=>'@'+effect.id===trigger.param_effects[0]);
 assert.equal(trigger.param_int,75);
 assert.equal(trigger.param_source_team,'heroes');
 assert.deepEqual([replacement.name,replacement.target_mode,replacement.param_int],['CardEffectDamage','self',6]);
 cleanse.card.parameters[probability.key]=101;
 await assert.rejects(()=>jsonFor(draft,cleanse.card),/cantidad/i);
});

async function fixture(id:string){
 const example=await readExample(id),card=cloneExampleCard(example,'audit-regression','en');
 return {example,card,rows:templateEffects(example.document,example.root),parameters:exampleParameters(example)};
}

async function jsonFor(draft:any,card:any){
 draft.cards=[...draft.cards.filter((item:any)=>item.uid!==card.uid),card];
 await validateDraftShape(draft);
 const doc=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
 const root=(doc.cards??doc.relics).find((item:any)=>item.names.english===card.name);
 return {doc,root};
}

test('spell replacements keep execution order and chained targeting for Flagellate and Spur',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 for(const [id,sibling] of [['official-Flagellate','CardEffectHeal'],['official-SpurTheFaithful','CardEffectAttackWithUnit']]){
  const {example,rows,parameters,card}=await fixture(id);
  const replacement=replaceCopiedEffect(card,rows[0].key,'on_spawn',rules.recipes.find(recipe=>recipe.id==='damage'));
  const {doc,root}=await jsonFor(draft,replacement);
  const ordered=root.effects.map(ref=>doc.effects.find(effect=>'@'+effect.id===ref));
  assert.deepEqual(ordered.map(effect=>effect.name),['CardEffectDamage',sibling]);
  assert.equal(ordered[0].param_int,6);
  assert.equal(ordered[0].target_team,id.endsWith('Flagellate')?'both':'monsters');
  assert.equal(ordered[1].target_mode,'last_targeted_characters');
  if(id.endsWith('Flagellate'))assert.equal(ordered[1].target_mode_health_filter,'damaged');
  const preview=description(replacement,{example,parameters},'en',rules);
  assert.match(preview,/Deal 6 damage/);
  assert.match(preview,id.endsWith('Flagellate')?/Restore 25 health/:/attacks immediately/i);
 }
});

test('copied descriptions own their terms, retain safe translations and preserve CJK phrases',async()=>{
 const draft=await buildOfficialDraft('hellhorned','en');
 const beacon=await fixture('official-EventCard_BeaconsLight');
 beacon.card.copiedEffectEdits={[beacon.rows[0].key]:{target:'all_floors_friendly'}};
 const exported=await jsonFor(draft,beacon.card);
 assert.deepEqual(Object.keys(exported.root.descriptions).sort(),['english','spanish']);
 assert.match(exported.root.descriptions.english,/friendly units on all floors/i);
 assert.ok(beacon.example.document.cards[0].descriptions.key);
 const flogging=await fixture('succclan-Flogging');
 flogging.card.copiedEffectEdits={[flogging.rows[0].key]:{when:'on_unplayed_positive',target:'all_units'}};
 const {root}=await jsonFor(draft,flogging.card);
 assert.match(root.descriptions.japanese,/執着の火花/);
 assert.doesNotMatch(root.descriptions.japanese,/ダメージ/);
 assert.match(root.descriptions.french,/Étincelle obsédante/);
});

test('Stasis, room damage and an edited artifact show the actual rules',async()=>{
 const draft=await buildOfficialDraft('hellhorned','en'),rules=await creatorRules();
 const stasis=await fixture('official-StasisCrystal');
 const row=stasis.rows.find(row=>row.definition.name==='CardEffectAddCardUpgradeToUnitsPerStatusEffect')!;
 stasis.card.copiedEffectEdits={[row.key]:{target:'all_enemy'}};
 const {doc}=await jsonFor(draft,stasis.card);
 const condition=doc.character_triggers.find(trigger=>trigger.trigger==='post_combat').descriptions.english;
 assert.match(condition,/\+20 Attack.*\+20 Maximum health/i);
 assert.match(condition,/enemy units on this floor.*stack of Stasis/i);
 assert.match(description(stasis.card,stasis,'en',rules),/Ability: Emerge/);
 const inferno=await fixture('official-InfernoRoom');
 inferno.card.parameters[inferno.parameters.find(parameter=>parameter.label==='CardEffectDamage')!.key]=17;
 assert.match(description(inferno.card,inferno,'en',rules),/17 damage to all units at the start of combat/i);
 const trigger=inferno.rows.find(row=>row.section==='room_modifiers')!;
 const damage=inferno.rows.find(row=>row.parent===trigger.key)!;
 inferno.card.copiedEffectEdits={[damage.key]:{recipe:'status_dazed',amount:1}};
 const changedRoom=await jsonFor(draft,inferno.card);
 assert.equal(changedRoom.doc.room_modifiers[0].triggered_vfx,undefined);
 assert.equal(changedRoom.doc.room_modifiers[0].descriptions,undefined);
 assert.match(changedRoom.root.descriptions.english,/Dazed/i);
 const relic=await fixture('official-relic-Inkbound_Clepsydranium');
 const group=relic.rows.find(row=>row.section==='character_triggers')!;
 const action=relic.rows.find(row=>row.parent===group.key)!;
 relic.card.copiedEffectEdits={[group.key]:{when:'on_hit'},[action.key]:{recipe:'heal',amount:7,target:'all_friendly'}};
 const result=await jsonFor(draft,relic.card);
 assert.match(result.root.descriptions.english,/Revenge: Restore 7 health to all friendly units/i);
 assert.match(description(relic.card,relic,'en',rules),/Restore 7 health/);
 assert.match(description(relic.card,relic,'es',rules),/7/);
});

test('Flogging names its generated card and copied community examples explain omissions',async()=>{
 const rules=await creatorRules(),flogging=await fixture('succclan-Flogging');
 const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
  card:flogging.card,template:flogging,rules,language:'en',onChange:()=>{},
 }));
 assert.match(html,/Shuffle 1 × Obsessing Spark into your deck/);
 assert.doesNotMatch(html,/Add cards to battle: 7|The selected units on the floor/);
 const pyre=flogging.parameters.find(parameter=>parameter.pyreDamage)!;
 assert.match(parameterLabel(pyre,'en',rules),/Obsessing Spark · Damage to the Pyre/);
 const count=flogging.parameters.find(parameter=>parameter.label==='CardEffectAddBattleCard'&&parameter.path[0]==='param_int_2')!;
 flogging.card.parameters[count.key]=2;
 assert.match(description(flogging.card,flogging,'en',rules),/Shuffle 2 × Obsessing Spark/);
 const notice=renderToStaticMarkup(React.createElement(SimplifiedEffectsNotice,{
  removed:['characters/HedgeMage/triggers','characters/HedgeMage/ability'],rules,language:'en',
 }));
 assert.match(notice,/Activated abilities/);
 assert.match(notice,/Triggered abilities/);
 assert.doesNotMatch(notice,/characters\//);
});
// 2026-11-21-1512||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Cubrir orden en hechizos, localización, vistas previas, cartas auxiliares y aviso de simplificación


test('removing the final room rule drops its empty attachment and allows a replacement',async()=>{
 const draft=await buildOfficialDraft('hellhorned','en'),rules=await creatorRules();
 const {example,card,rows,parameters}=await fixture('official-EchoVault');
 card.removedTemplateEffects=[rows.find(row=>row.section==='room_modifiers')!.key];
 const empty=await jsonFor(draft,card);
 assert.deepEqual(empty.root.effects,[]);
 assert.ok((await reviewDraft(draft)).some(issue=>issue.uid===card.uid&&issue.field==='effects'));
 card.passive={recipe:'room_avarice',amount:1};
 const replaced=await jsonFor(draft,card);
 assert.ok(replaced.root.effects.length);
 assert.match(replaced.root.descriptions.english,/Avarice/i);
 assert.ok(!(await reviewDraft(draft)).some(issue=>issue.uid===card.uid));
 assert.match(description(card,{example,parameters},'en',rules),/Avarice/i);
});
// 2026-11-21-1513||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Comprobar que Echo Vault permite recuperar una sala tras eliminar su última regla
// 2026-11-21-1514||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Verificar que la sala recuperada exporta el texto de su nueva regla


test('editing one occurrence of a shared action keeps the unaffected repeats intact',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 const {card,rows}=await fixture('official-HornBreak');
 const edited=replaceCopiedEffect(card,rows[0].key,'on_spawn',rules.recipes.find(item=>item.id==='damage'));
 const {doc,root}=await jsonFor(draft,edited);
 const damage=root.effects.map(ref=>doc.effects.find(effect=>'@'+effect.id===ref).param_int);
 assert.deepEqual(damage,[6,8]);
 assert.notEqual(root.effects[0],root.effects[1]);
});
// 2026-11-21-1516||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Comprobar que la primera de las dos acciones compartidas de Horn Break se edita por separado


test('Weapons Cache explains the shared activation and preserves the discount when draw is removed',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 const {example,card,rows,parameters}=await fixture('official-WeaponsCache');
 const template={example,parameters};
 const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{card,template,rules,language:'en',onChange:()=>{}}));
 assert.match(html,/This timing applies to all effects in this trigger/);
 assert.match(html,/Reduce the cost of the next card drawn by 2/);
 const group=rows.find(row=>row.section==='character_triggers')!;
 card.copiedEffectEdits={[group.key]:{when:'on_kill'}};
 const changed=(await jsonFor(draft,card)).doc;
 const slay=changed.character_triggers.find(row=>row.trigger==='on_kill');
 assert.deepEqual(slay.effects.map((ref:string)=>changed.effects.find(effect=>'@'+effect.id===ref).name),
  group.definition.effects.map((ref:string)=>example.document.effects.find(effect=>'@'+effect.id===ref)!.name));
 assert.equal(slay.effects.length,2);
 assert.ok(changed.upgrades.some(upgrade=>upgrade.cost_reduction===2));
 await assert.rejects(jsonFor(draft,{...card,copiedEffectEdits:{[group.key]:{when:'on_feed'}}}));
 card.copiedEffectEdits=undefined;
 card.removedTemplateEffects=[rows.find(row=>row.definition.name==='CardEffectDrawType')!.key];
 const {doc}=await jsonFor(draft,card);
 const trigger=doc.character_triggers.find(row=>row.trigger==='on_spawn');
 assert.equal(trigger.effects.length,1);
 assert.ok(doc.effects.find(effect=>'@'+effect.id===trigger.effects[0]).param_upgrade);
});
// 2026-11-21-1516||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Cubrir el momento compartido y la regla que queda en Weapons Cache


test('a shared action can be edited in either trigger without changing its sibling',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 for(const id of ['official-RageRoom','official-ElectricityChamber','official-relic-UnitsGainStealthOnSlayPlusAttack']){
  const {example,card,parameters,rows}=await fixture(id);
  const actions=rows.filter(row=>row.section==='effects'&&row.ownerSection==='character_triggers');
  assert.equal(actions.length,2);
  assert.equal(actions[0].id,actions[1].id);
  const timing=(row:any)=>example.document.character_triggers.find(trigger=>trigger.id===row.ownerId)!.trigger;
  for(const index of [0,1]){
   const chosen=actions[index],sibling=actions[1-index];
   card.copiedEffectEdits={[chosen.key]:{recipe:'damage',amount:7}};
   const {doc}=await jsonFor(draft,card);
   const changed=doc.character_triggers.find(trigger=>trigger.trigger===timing(chosen));
   const untouched=doc.character_triggers.find(trigger=>trigger.trigger===timing(sibling));
   const resolve=(ref:string)=>doc.effects.find(effect=>'@'+effect.id===ref);
   assert.notEqual(changed.effects[0],untouched.effects[0]);
   assert.equal(resolve(changed.effects[0]).name,'CardEffectDamage');
   assert.equal(resolve(changed.effects[0]).param_int,7);
   assert.equal(resolve(untouched.effects[0]).name,'CardEffectAddStatusEffect');
   assert.deepEqual(resolve(untouched.effects[0]).param_status_effects,sibling.definition.param_status_effects);
   assert.match(description(card,{example,parameters},'en',rules),/7 damage/);
   if(id==='official-RageRoom'){
    assert.match(description(card,{example,parameters},'en',rules),/Rage 2/);
    assert.equal(changed.descriptions,undefined);
   }
  }
 }
});

test('replacing Advance with the Retreat recipe updates text and keeps the Valor chain',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 const {example,card,parameters,rows}=await fixture('official-JustCause');
 const edited=replaceCopiedEffect(card,rows[0].key,'on_spawn',rules.recipes.find(item=>item.id==='retreat'));
 const {doc,root}=await jsonFor(draft,edited);
 const effects=root.effects.map(ref=>doc.effects.find(effect=>'@'+effect.id===ref));
 assert.equal(effects[0].param_int,1);
 assert.equal(effects[1].target_mode,'last_targeted_characters');
 for(const language of ['english','spanish','japanese']){
  assert.match(root.descriptions[language],/\[retreat\]/i);
  assert.doesNotMatch(root.descriptions[language],/\[advance\]/i);
 }
 assert.match(description(edited,{example,parameters},'en',rules),/Retreat.*Valor/s);
 assert.match(description(edited,{example,parameters},'es',rules),/Retirar.*Valor/s);
});

test('artifact activation shows the edited amount and extra localized fields lose their official keys',async()=>{
 const draft=await buildOfficialDraft('hellhorned','en');
 const {example,card,parameters}=await fixture('official-relic-GoldOnDeath');
 const original=example.document.relics[0].relic_activated_texts;
 const clean=await jsonFor(draft,card);
 assert.ok(original.key);
 assert.equal(clean.root.relic_activated_texts.key,undefined);
 assert.equal(clean.root.relic_activated_texts.english,'+5[coin]');
 const field=parameters.find(parameter=>parameter.label==='RelicEffectGoldOnTrigger')!;
 card.parameters[field.key]=9;
 const modified=await jsonFor(draft,card);
 assert.equal(modified.doc.relic_effects[0].param_int,9);
 assert.equal(Object.keys(modified.root.relic_activated_texts).length,Object.keys(original).length-1);
 assert.ok(Object.values(modified.root.relic_activated_texts).every(text=>text==='+9[coin]'));
 assert.equal(original.english,'+5[coin]');
});
// 2026-11-21-1555||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Probar los cinco hallazgos nuevos de localización, avisos, selección de Retreat y disparadores compartidos


test('changing the original Rage amount on one row leaves the other row at its original amount',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 const {example,card,parameters,rows}=await fixture('official-RageRoom');
 const actions=rows.filter(row=>row.section==='effects'&&row.ownerSection==='character_triggers');
 const parameter=parameters.find(item=>item.id===actions[0].id&&item.status==='buff')!;
 card.copiedEffectEdits={[actions[0].key]:{parameters:{[parameter.key]:5}}};
 const {doc}=await jsonFor(draft,card);
 const count=(row:any)=>doc.effects.find(effect=>'@'+effect.id===row.effects[0]).param_status_effects[0].count;
 const timing=example.document.character_triggers.find(trigger=>trigger.id===actions[0].ownerId)!.trigger;
 const changed=doc.character_triggers.find(trigger=>trigger.trigger===timing);
 const untouched=doc.character_triggers.find(trigger=>trigger.trigger!==timing);
 assert.equal(count(changed),5);
 assert.equal(count(untouched),2);
 const preview=description(card,{example,parameters},'en',rules);
 assert.match(preview,/Rage 5/);
 assert.match(preview,/Rage 2/);
});
// 2026-11-21-1558||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Comprobar que cambiar directamente Rage 2 a 5 en una fila conserva la otra en 2
// 2026-11-21-1559||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Probar Rage con el identificador nativo buff

test('each Reanimation Lab trigger saves its own nested upgrade and updates the room text',async t=>{
 const rules=await creatorRules(),server=createCreatorServer();
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const endpoint='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/projects';
 async function call(url:string,method='GET',body?:unknown){
  const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json();
  assert.equal(response.ok,true,JSON.stringify(result));
  return result;
 }
 let projectId:string|undefined;
 t.after(async()=>{
  await new Promise<void>(resolve=>server.close(()=>resolve()));
  if(projectId)await fs.rm(projectFolder(projectId),{recursive:true,force:true});
 });
 let draft=await call(endpoint,'POST',{});
 projectId=draft.id;
 const project=endpoint+'/'+projectId;
 const {example,card,parameters,rows}=await fixture('official-ReanimationLab');
 const actions=rows.filter(row=>row.definition.name==='CardEffectAddTempCardUpgradeToUnits');
 assert.equal(actions.length,2);
 const attack=parameters.find(item=>item.id==='ReanimationLab_UnitUpgrade'&&item.path[0]==='bonus_damage')!;
 const health=parameters.find(item=>item.id==='ReanimationLab_UnitUpgrade'&&item.path[0]==='bonus_hp')!;
 for(const row of actions){
  card.copiedEffectEdits={[row.key]:{parameters:{[attack.key]:5,[health.key]:9}}};
  draft=await call(project,'PUT',{...draft,cards:[card]});
  const saved=(await call(project)).cards[0];
  assert.deepEqual(saved.copiedEffectEdits,card.copiedEffectEdits);
  const {doc,root}=await jsonFor(draft,saved);
  const trigger=example.document.character_triggers.find(item=>item.id===row.ownerId)!.trigger;
  const upgrade=(entry:any)=>{
   const effect=doc.effects.find(item=>'@'+item.id===entry.effects[0]);
   return doc.upgrades.find(item=>'@'+item.id===effect.param_upgrade);
  };
  const changed=upgrade(doc.character_triggers.find(item=>item.trigger===trigger));
  const unchanged=upgrade(doc.character_triggers.find(item=>item.trigger!==trigger));
  assert.deepEqual([changed.bonus_damage,changed.bonus_hp],[5,9]);
  assert.deepEqual([unchanged.bonus_damage,unchanged.bonus_hp],[7,7]);
  assert.notEqual(changed.id,unchanged.id);
  for(const wording of [root.descriptions.english,description(card,{example,parameters},'en',rules)]){
   assert.match(wording,/\+5 Attack.*\+9 Health/i);
   assert.match(wording,/\+7 Attack.*\+7 Health/i);
  }
  const form=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{card,template:{example,parameters},rules,language:'en',onChange:()=>{}}));
  assert.match(form,/\+5 Attack.*\+9 Health/i);
 }
});

test('a repeated attack with different amounts renders each amount in order',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 const {example,card,parameters,rows}=await fixture('freecompany-GrimoireMagicMissile1');
 const actions=rows.filter(row=>row.section==='effects');
 const damage=parameters.find(item=>item.id===actions[1].id&&item.path[0]==='param_int')!;
 card.copiedEffectEdits={[actions[1].key]:{parameters:{[damage.key]:7}}};
 const {doc,root}=await jsonFor(draft,card);
 assert.deepEqual(root.effects.map(ref=>doc.effects.find(item=>'@'+item.id===ref).param_int),[3,7,3]);
 for(const locale of ['english','spanish','japanese']){
  assert.match(root.descriptions[locale],/\[effect0.power\] \/ \[effect1.power\] \/ \[effect2.power\]/);
 }
 assert.match(description(card,{example,parameters},'en',rules),/3 \/ 7 \/ 3 damage to a random enemy 3 times/);
 assert.match(description(card,{example,parameters},'es',rules),/3 \/ 7 \/ 3 de daño a un enemigo aleatorio 3 veces/);
});

test('repeated damage stays accurate when the first hit has separate visuals or establishes the target',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 for(const [id,expected] of [
  ['official-AnnihilateRoomDamage3',/60 \/ 61 \/ 60 \/ 60 damage to a random enemy unit, four times/],
  ['official-Deathroar',/Transfer all Pyregel.*5 \/ 6 \/ 5 \/ 5 \/ 5 damage five times/],
  ['official-MakeItRain',/5 \/ 6 \/ 5 \/ 5 damage to enemy units.*Spend 5/s],
 ] as const){
  const {example,card,parameters,rows}=await fixture(id);
  const damage=rows.filter(row=>row.definition.name==='CardEffectDamage');
  assert.equal(damage[1].id,damage[2].id);
  assert.notEqual(damage[0].id,damage[1].id);
  const field=parameters.find(item=>item.id===damage[1].id&&item.path[0]==='param_int')!;
  card.copiedEffectEdits={[damage[1].key]:{parameters:{[field.key]:field.value+1}}};
  const {root}=await jsonFor(draft,card);
  assert.match(root.descriptions.english,/\[effect\d+.power\] \/ \[effect\d+.power\]/);
  assert.match(description(card,{example,parameters},'en',rules),expected);
 }
});

test('draw activation notices follow edited quantities with localized plurals',async()=>{
 const draft=await buildOfficialDraft('hellhorned','en');
 const {example,card,parameters}=await fixture('succclan-FleshRing');
 const field=parameters.find(item=>item.label==='RelicEffectCardDrawOnCardPlay')!;
 card.parameters[field.key]=3;
 const {doc,root}=await jsonFor(draft,card);
 assert.equal(doc.relic_effects[0].param_int,3);
 assert.equal(root.relic_activated_texts.english,'Draw 3 cards.');
 assert.equal(root.relic_activated_texts.spanish,'Roba 3 cartas.');
 assert.ok(Object.values(root.relic_activated_texts).every(text=>typeof text==='string'&&text.includes('3')&&!text.includes('1')));
 assert.equal(example.document.relics[0].relic_activated_texts.english,'Draw 1 card.');
});

// 2026-11-21-1620||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Cubrir mejora anidada, disparos con cantidades diferentes y aviso de robo plural
// 2026-11-21-1620||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Verificar el guardado HTTP y la recarga de ambos disparadores de Reanimation Lab
// 2026-11-21-1622||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Cubrir las repeticiones oficiales que separan el primer impacto del resto
// 2026-11-21-1906||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Probar que el cambio de activación de Weapons Cache conserva sus dos acciones y sus cantidades
// 2026-11-21-2016||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Cubrir cantidades, condiciones y acciones de artefactos y recargas de las cuatro habilidades de sala
// 2026-11-21-2017||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Comprobar la etiqueta real de activación de las habilidades de sala
// 2026-11-21-2020||codex-clan-editor||clan-creator/tests/creator-audit-regressions.test.ts||Verificar que el texto de Ensamblaje distingue las copias invocadas de la que se mueve
