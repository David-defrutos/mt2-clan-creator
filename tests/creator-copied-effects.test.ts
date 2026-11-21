import test from 'node:test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildOfficialDraft} from '../src/server/creator/official-clans.ts';
import {scanClan} from '../src/server/scan.ts';
import {buildCommunityDraft} from '../src/server/creator/community-clans.ts';
import {applyExampleParameters,cloneExampleCard,creatorRules,exampleParameters,readExample} from '../src/server/creator/catalog.ts';
import {templateEffects} from '../src/server/creator/template-effects.ts';
import {validateDraftShape} from '../src/server/creator/projects.ts';
import {generateClan} from '../src/server/creator/export.ts';
import {blankCard} from '../src/server/creator/model.ts';
import {combatExample} from '../src/web/creator/combat-example.tsx';
import {EffectEditor} from '../src/web/creator/components.tsx';
import {description} from '../src/web/creator/presentation.ts';
import {inheritedAbilities} from '../src/web/creator/inherited-abilities.ts';
import {NativePathEffects} from '../src/web/creator/native-path-effects.tsx';
import {TemplateEffectsEditor} from '../src/web/creator/template-effects-editor.tsx';
import {replaceCopiedEffect} from '../src/web/creator/copied-effect-replacement.tsx';
import {effectOptions} from '../src/web/creator/effect-options.ts';
import {visibleSearchOptions} from '../src/web/creator/search-select.tsx';

test('Flogging lets the player change when, action and target and exports only the edited copy',async()=>{
 const rules=await creatorRules(),draft=await buildCommunityDraft('succclan');
 const card=draft.starters.find(card=>card.templateId==='succclan-Flogging')!;
 const example=await readExample(card.templateId!),original=JSON.stringify(example.document);
 const template={example,parameters:exampleParameters(example)};
 const damage=templateEffects(example.document,example.root).find(row=>row.id==='FloggingDamage')!;
 const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
  card,template,rules,language:'en',onChange:()=>{},
 }));
 assert.match(html,/Reserve: when left in hand/);
 assert.match(html,/role="combobox"/);
 assert.match(html,/value="all_friendly"/);
 assert.match(html,/<option value="all_units">All units on the floor<\/option>/);

 card.copiedEffectEdits={[damage.key]:{when:'on_unplayed_positive',target:'all_units'}};
 await validateDraftShape(draft);
 assert.match(description(card,template,'en',rules),/Reserve/i);
 assert.match(description(card,template,'en',rules),/all units on the floor/i);
 const {cardJson}=await generateClan(draft,card.uid);
 const doc=JSON.parse(cardJson!);
 const root=doc.cards.find(card=>card.names.english==='Flogging');
 const activation=doc.card_triggers.find(trigger=>trigger.trigger==='on_unplayed_positive');
 assert.ok(root.triggers.includes('@'+activation.id));
 const hit=doc.effects.find(effect=>'@'+effect.id===activation.effects[0]);
 assert.equal(hit.target_mode,'room');
 assert.equal(hit.target_team,'both');
 assert.ok(!root.effects.includes('@'+hit.id));
 assert.match(root.descriptions.english,/Obsessing Spark/);
 assert.doesNotMatch(root.descriptions.english,/all enemies/);

 card.copiedEffectEdits={[damage.key]:{target:'enemy'}};
 const copy=applyExampleParameters(example,card);
 assert.equal(copy.cards.find(card=>card.id==='Flogging')!.targetless,false);
 assert.equal(copy.effects.find(effect=>effect.id===damage.id)!.target_mode,'drop_target_character');
 assert.doesNotMatch(description(card,template,'en',rules),/all enemies/);
 const heal=rules.recipes.find(recipe=>recipe.id==='heal');
 const replaced=replaceCopiedEffect(card,damage.key,'on_unplayed_positive',heal,'all_units');
 const replacement=replaced.copiedEffectEdits[damage.key];
 assert.deepEqual(replacement,{recipe:'heal',amount:heal.amount,target:'all_units',when:'on_unplayed_positive'});
 assert.equal(replaced.effects.length,0);
 const guidedHtml=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
  card:replaced,template,rules,language:'en',onChange:()=>{},
 }));
 assert.match(guidedHtml,/<option value="all_units" selected="">All units on the floor<\/option>/);
 const simulated=combatExample(replacement,false);
 assert.deepEqual(simulated.map(row=>row.hit),[true,true,true,true,false]);
 draft.starters[draft.starters.indexOf(card)]=replaced;
 await validateDraftShape(draft);
 const replacementDoc=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
 const healEffect=replacementDoc.effects.find(effect=>effect.name==='CardEffectHeal');
 assert.equal(healEffect.target_mode,'room');
 assert.equal(healEffect.target_team,'both');
 assert.equal(JSON.stringify(example.document),original);
});
// 2026-11-21-1257||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Probar que Flogging permite cambiar el momento, la acción y el objetivo sin tocar el ejemplo
// 2026-11-21-1309||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Probar ambos equipos en el selector, la vista previa, la simulación y el JSON de dos tipos de efectos


test("Beacon's Light can change its Dazed target and a new spell can apply Dazed across the train",async()=>{
 const rules=await creatorRules(),draft=await buildCommunityDraft('succclan');
 const example=await readExample('official-EventCard_BeaconsLight'),parameters=exampleParameters(example);
 const template={example,parameters},original=JSON.stringify(example.document);
 const card=cloneExampleCard(example,draft.starters[0].uid,'en');
 draft.starters[0]=card;
 const effect=templateEffects(example.document,example.root).find(row=>row.definition.name==='CardEffectAddStatusEffect')!;
 const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
  card,template,rules,language:'en',onChange:()=>{},
 }));
 assert.match(html,/value="all_floors_enemy" selected="">Enemy units on all floors/);
 assert.match(html,/Friendly units on all floors/);
 assert.match(html,/All units on all floors/);
 assert.match(description(card,template,'en',rules),/Apply Dazed 1 to enemy units on all floors/i);

 card.copiedEffectEdits={[effect.key]:{target:'all_floors_friendly'}};
 card.parameters[parameters.find(p=>p.status==='dazed')!.key]=2;
 await validateDraftShape(draft);
 assert.match(description(card,template,'en',rules),/Apply Dazed 2 to friendly units on all floors/i);
 const copied=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
 const edited=copied.effects.find(e=>e.name==='CardEffectAddStatusEffect');
 assert.equal(edited.target_mode,'tower');
 assert.equal(edited.target_team,'monsters');
 assert.equal(edited.param_status_effects[0].count,2);
 assert.equal(JSON.stringify(example.document),original);

 const fresh={...blankCard('spell',card.uid),name:'Train-wide Dazed',
  effects:[{recipe:'status_dazed',amount:1,when:'on_spawn',target:'all_floors_enemy'}]};
 draft.starters[0]=fresh;
 await validateDraftShape(draft);
 assert.match(description(fresh,undefined,'en',rules),/Apply Dazed 1 to enemy units on all floors/i);
 const generated=JSON.parse((await generateClan(draft,fresh.uid)).cardJson!);
 const root=generated.cards.find(c=>c.names.english===fresh.name);
 const dazed=generated.effects.find(e=>root.effects.includes('@'+e.id));
 assert.equal(root.targetless,true);
 assert.equal(dazed.target_mode,'tower');
 assert.equal(dazed.target_team,'heroes');
 assert.deepEqual(dazed.param_status_effects,[{status:'dazed',count:1}]);

 fresh.effects[0].target='all_floors_units';
 await validateDraftShape(draft);
 const both=JSON.parse((await generateClan(draft,fresh.uid)).cardJson!);
 assert.equal(both.effects.find(e=>e.name==='CardEffectAddStatusEffect').target_team,'both');
 assert.deepEqual(combatExample({...fresh.effects[0],recipe:'damage'},false).map(row=>row.hit),[true,true,true,true,true,true]);
});
// 2026-11-21-1313||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Probar Dazed en los tres objetivos globales con copia oficial, creación y JSON


test('room attachments edit timing, action and targets in the original room without changing its installation',async()=>{
 const rules=await creatorRules(),draft=await buildCommunityDraft('succclan');
 for(const scenario of [
  {id:'official-BloodsoakedArena',triggerSection:'character_triggers',when:'on_hit',field:'effects',target:'all_friendly',team:'monsters'},
  {id:'official-InfernoRoom',triggerSection:'room_modifiers',when:'RoomStateAddEffectPostCombatModifier',field:'param_effects',target:'all_enemy',team:'heroes'},
 ]){
  const example=await readExample(scenario.id),parameters=exampleParameters(example);
  const template={example,parameters},original=JSON.stringify(example.document);
  const card=cloneExampleCard(example,'room-'+scenario.id,'en');
  draft.cards.push(card);
  const rows=templateEffects(example.document,example.root);
  const group=rows.find(row=>row.section===scenario.triggerSection)!;
  const action=rows.find(row=>row.parent===group.key&&row.section==='effects')!;
  const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{card,template,rules,language:'en',onChange:()=>{}}));
  assert.match(html,/role="combobox" aria-label="What it does"/);
  assert.match(html,new RegExp('<option value="'+scenario.when+'">'));
  assert.match(html,new RegExp('<option value="'+scenario.target+'">'));
  card.copiedEffectEdits={
   [group.key]:{when:scenario.when},
   [action.key]:{recipe:'damage',amount:7,target:scenario.target},
  };
  await validateDraftShape(draft);
  assert.match(description(card,template,'en',rules),/7 damage/i);
  const {cardJson}=await generateClan(draft,card.uid),doc=JSON.parse(cardJson!);
  const room=doc.cards.find(c=>c.names.english===card.name);
  const attachment=doc.effects.find(e=>room.effects.includes('@'+e.id));
  assert.equal(attachment.name,'CardEffectAttachTrainRoomAttachment');
  const upgrade=doc.upgrades.find(u=>'@'+u.id===attachment.param_upgrade);
  const reference=(upgrade.trigger_upgrades??upgrade.room_modifier_upgrades)[0];
  const trigger=doc[scenario.triggerSection].find(t=>'@'+t.id===reference);
  assert.equal(trigger.trigger??trigger.name,scenario.when);
  const changed=doc.effects.find(e=>'@'+e.id===trigger[scenario.field][0]);
  assert.equal(changed.name,'CardEffectDamage');
  assert.equal(changed.param_int,7);
  assert.equal(changed.target_mode,'room');
  assert.equal(changed.target_team,scenario.team);
  assert.equal(changed.param_status_effects,undefined);
  assert.equal(JSON.stringify(example.document),original);
 }
});
// 2026-11-21-1318||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Probar que Sangre y Sala Infernal conservan el anclaje al editar activación, acción y objetivo


test('equipment, artifacts and champion paths edit actions in their own trigger scope',async t=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 for(const id of ['official-Fortify','official-relic-Inkbound_Clepsydranium']){
  const example=await readExample(id),parameters=exampleParameters(example);
  const card=cloneExampleCard(example,id,'en');
  draft.cards.push(card);
  const rows=templateEffects(example.document,example.root);
  const action=rows.find(row=>row.section==='effects'&&row.ownerSection==='character_triggers'&&
   row.definition.name==='CardEffectAddStatusEffect')!;
  const group=rows.find(row=>row.key===action.parent)!;
  const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
   card,template:{example,parameters},rules,language:'en',onChange:()=>{},
  }));
  assert.match(html,/aria-label="What it does"/);
  assert.match(html,/value="all_floors_units"/);
  card.copiedEffectEdits={[group.key]:{when:'on_hit'},[action.key]:{recipe:'heal',amount:4,target:'all_friendly'}};
  await validateDraftShape(draft);
  const json=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
  const trigger=json.character_triggers.find(item=>item.trigger==='on_hit');
  assert.ok(json.effects.some(e=>trigger.effects.includes('@'+e.id)&&e.name==='CardEffectHeal'&&e.param_int===4));
 }
 const champion=draft.champions.flatMap(c=>c.paths).flatMap(p=>p.levels)
  .find(level=>level.native?.templateId==='official-HornbreakerChampion-path-3-level-1')!;
 const example=await readExample(champion.native!.templateId);
 const root={section:'upgrades',id:champion.native!.upgradeId};
 const rows=templateEffects(example.document,root);
 const action=rows.find(row=>row.section==='effects'&&row.ownerSection==='character_triggers'&&
  row.definition.name==='CardEffectAddStatusEffect')!;
 const group=rows.find(row=>row.key===action.parent)!;
 const editor=renderToStaticMarkup(React.createElement(NativePathEffects,{
  level:champion,detail:{example,parameters:exampleParameters(example),card:draft.champions[0].card},
  rules,language:'en',onChange:()=>{},
 }));
 assert.match(editor,/aria-label="What it does"/);
 champion.native!.copiedEffectEdits={[group.key]:{when:'on_hit'},[action.key]:{recipe:'damage',amount:117,target:'all_enemy'}};
 await validateDraftShape(draft);
 const generated=await generateClan(draft);
 t.after(()=>fs.rm(generated.root,{recursive:true,force:true}));
 const clan=await scanClan(generated.root);
 const custom=clan.entries.find(e=>e.section==='effects'&&e.data.name==='CardEffectDamage'&&e.data.param_int===117);
 assert.ok(custom);
 assert.ok(clan.entries.some(e=>e.section==='character_triggers'&&e.data.trigger==='on_hit'&&e.data.effects.includes('@'+custom.id)));
});
// 2026-11-21-1321||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Verificar equipos, artefactos y sendas editables en su activación nativa


test('Mourning Veil exposes the Accursed trigger, heals its wearer and can change or add equipment effects',async()=>{
 const rules=await creatorRules(),draft=await buildCommunityDraft('succclan');
 const card=draft.cards.find(card=>card.templateId==='succclan-MourningVeil')!;
 const example=await readExample(card.templateId!),parameters=exampleParameters(example),template={example,parameters};
 const rows=templateEffects(example.document,example.root);
 const heal=rows.find(row=>row.definition.name==='CardEffectHeal')!,group=rows.find(row=>row.key===heal.parent)!;
 const render=(language:'en'|'es')=>renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{card,template,rules,language,onChange:()=>{}}));
 assert.match(render('en'),/value="Conductor_Accursed" selected="">Accursed/);
 assert.match(render('en'),/when a Blight or Junk card is played or discarded/);
 assert.match(render('en'),/aria-label="What it does"[^>]*value="Heal: 4"/);
 assert.match(render('en'),/value="friendly" selected="">The equipped unit/);
 assert.match(render('es'),/Maldito \(Accursed\)/);
 const original=JSON.stringify(example.document);
 card.copiedEffectEdits={[group.key]:{when:'on_hit'},[heal.key]:{recipe:'armor',amount:3,target:'all_friendly'}};
 card.effects=[{recipe:'heal',amount:7,target:'friendly',when:'Conductor_Accursed'}];
 await validateDraftShape(draft);
 assert.match(description(card,template,'en',rules),/Accursed: Restore 7 health/i);
 const json=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
 const attachment=json.effects.find(effect=>effect.name==='CardEffectAttachEquipment');
 const upgrade=json.upgrades.find(entry=>'@'+entry.id===attachment.param_upgrade);
 assert.equal(upgrade.bonus_hp,8);
 const triggers=json.character_triggers.filter(trigger=>upgrade.trigger_upgrades.includes('@'+trigger.id));
 const changed=triggers.find(trigger=>trigger.trigger==='on_hit');
 const status=json.effects.find(effect=>changed.effects.includes('@'+effect.id));
 assert.equal(status.target_mode,'room');
 assert.equal(status.target_team,'monsters');
 assert.deepEqual(status.param_status_effects,[{status:'armor',count:3}]);
 const accursed=triggers.find(trigger=>typeof trigger.trigger==='object');
 assert.deepEqual(accursed.trigger,{mod_reference:'Conductor',id:'@Accursed'});
 assert.ok(json.effects.some(effect=>accursed.effects.includes('@'+effect.id)&&effect.name==='CardEffectHeal'&&effect.target_mode==='self'&&effect.param_int===7));
 assert.equal(JSON.stringify(example.document),original);
});
// 2026-11-21-1342||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Probar el formulario, la vista previa y el JSON de Mourning Veil con cambios y efectos Accursed


test('equipment passive abilities can be replaced while the equip effect stays intact',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('awoken','en');
 const example=await readExample('official-TitansteelDagger'),parameters=exampleParameters(example),template={example,parameters};
 const card=cloneExampleCard(example,'dagger-abilities','en');
 draft.cards.push(card);
 const quick=inheritedAbilities(card,template).find(ability=>ability.status==='ambush');
 assert.ok(quick?.key);
 card.parameters[quick.key]=0;
 card.abilities=[{status:'trample',count:1}];
 await validateDraftShape(draft);
 assert.match(description(card,template,'en',rules),/Trample/);
 assert.doesNotMatch(description(card,template,'en',rules),/Quick/);
 const doc=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
 const apply=doc.effects.find(effect=>effect.name==='CardEffectAttachEquipment');
 const upgrade=doc.upgrades.find(item=>apply.param_upgrade==='@'+item.id);
 assert.deepEqual(upgrade.status_effect_upgrades,[{status:'trample',count:1}]);
 assert.equal(apply.target_mode,'drop_target_character');
});
// 2026-11-21-1344||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Comprobar que Swiftsteel Dagger permite cambiar Quick por Trample conservando el equipo
// 2026-11-21-1345||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Probar Quick con el identificador nativo ambush del equipo
// 2026-11-21-1512||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Comprobar que la sustitución de Flogging permanece en la fila copiada

test('copied clans can replace card generation and activated actions in their original slot',async()=>{
 const rules=await creatorRules();
 const succ=await buildCommunityDraft('succclan'),free=await buildCommunityDraft('freecompany');
 const flogging=succ.starters.find(card=>card.templateId==='succclan-Flogging')!;
 const cutpurse=free.cards.find(card=>card.templateId==='freecompany-SpawnCutpurse')!;
 for(const {draft,card,originalAction,action,recipe,target,when} of [
  {draft:succ,card:flogging,originalAction:'CardEffectAddBattleCard',action:'CardEffectDraw',recipe:'draw',when:'on_unplayed_positive'},
  {draft:free,card:cutpurse,originalAction:'CardEffectAddStatusEffect',action:'CardEffectAddStatusEffect',recipe:'armor',target:'all_friendly'},
 ]){
  const example=await readExample(card.templateId!),template={example,parameters:exampleParameters(example)};
  const original=JSON.stringify(example.document);
  const row=templateEffects(example.document,example.root).find(row=>row.definition.name===originalAction)!;
  const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{card,template,rules,language:'en',onChange:()=>{}}));
  const caption=recipe==='draw'?/role="combobox"[^>]+value="Shuffle [^"]+Obsessing Spark/:/role="combobox"[^>]+value="Apply statuses: Stealth/;
  assert.match(html,caption);
  card.copiedEffectEdits={[row.key]:{recipe,amount:3,...(when?{when}:{}),...(target?{target}:{})}};
  await validateDraftShape(draft);
  const {cardJson}=await generateClan(draft,card.uid);
  const doc=JSON.parse(cardJson!);
  const entry=when?doc.card_triggers.find(item=>item.trigger===when):doc.cards.find(item=>item.is_an_ability);
  const applied=doc.effects.find(item=>'@'+item.id===entry.effects[0]);
  assert.equal(applied.name,action);
  if(when){
   assert.equal(applied.param_int,3);
   const root=doc.cards.find(item=>item.names.english==='Flogging');
   const hit=doc.effects.find(item=>'@'+item.id===root.effects[0]);
   assert.equal(hit.param_int,2);
   assert.match(description(card,template,'en',rules),/Reserve.*Draw 3/s);
  }else{
   assert.equal(applied.target_team,'monsters');
   assert.equal(applied.target_mode,'room');
   assert.deepEqual(applied.param_status_effects,[{status:'armor',count:3}]);
   assert.match(entry.descriptions.english,/Armor 3/i);
   assert.match(description(card,template,'en',rules),/Ability: Lift the Purse/i);
  }
  assert.equal(JSON.stringify(example.document),original);
 }
});

test('a copied artifact can replace its final removed rule without losing its illustration',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 const example=await readExample('official-relic-GoldOnDeath'),card=cloneExampleCard(example,'replaced-artifact','en');
 draft.cards.push(card);
 const original=templateEffects(example.document,example.root).find(row=>row.section==='relic_effects')!;
 const template={example,parameters:exampleParameters(example)};
 const editor=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{card,template,rules,language:'en',onChange:()=>{}}));
 assert.match(editor,/fixed-effect-value[^>]*>[^<]*(Gain|Earn).*gold/is);
 const {reviewDraft}=await import('../src/server/creator/export.ts');
 card.passive={recipe:'relic_pyre_health',amount:12};
 const both=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
 assert.deepEqual(both.relic_effects.map(effect=>effect.name),[original.definition.name,'RelicEffectIncreasePyreHealthFlat']);
 assert.match(both.relics[0].descriptions.english,/12 maximum Pyre health/);
 card.removedTemplateEffects=[original.key];
 card.passive=undefined;
 assert.ok((await reviewDraft(draft)).some(issue=>issue.uid===card.uid&&issue.field==='effects'));
 card.passive={recipe:'relic_capacity',amount:1};
 assert.ok(!(await reviewDraft(draft)).some(issue=>issue.uid===card.uid));
 const {cardJson}=await generateClan(draft,card.uid);
 const output=JSON.parse(cardJson!);
 const active=output.relic_effects.filter(effect=>output.relics[0].relic_effects.includes('@'+effect.id));
 assert.equal(active.length,1);
 assert.equal(active[0].name,'RelicEffectChangeFloorCapacity');
 assert.match(description(card,{example,parameters:exampleParameters(example)},'en',rules),/capacity/i);
 assert.ok(output.sprites.find(sprite=>'@'+sprite.id===output.relics[0].icon)?.path);
});
test('new native passive recipes agree between preview and exported JSON',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 const choices={
  room_capacity:'RoomStateCapacityModifier',
  room_ember:'RoomStateEnergyModifier',
  relic_corruption_capacity:'RelicEffectModifyMaxCorruption',
  relic_spell_healing:'RelicEffectModifyCardHealingPower',
  relic_mix_choices:'RelicEffectAdjustMixAmount',
  relic_trial_gold:'RelicEffectModifyTrialGoldRewards',
  relic_full_pyre_draw:'RelicEffectAdditionalDrawOnTowerFullHealth',
 };
 for(const [id,native] of Object.entries(choices)){
  const recipe=rules.passives.find(item=>item.id===id)!;
  const card=blankCard(recipe.kind,'new-passive-'+id);
  card.name=id;
  card.passive={recipe:id,amount:2};
  draft.cards.push(card);
  await validateDraftShape(draft);
  const {cardJson}=await generateClan(draft,card.uid);
  const output=JSON.parse(cardJson!);
  const reference=card.kind==='room'?output.upgrades[0].room_modifier_upgrades[0]:output.relics[0].relic_effects[0];
  const definitions=card.kind==='room'?output.room_modifiers:output.relic_effects;
  assert.ok(definitions.some(rule=>'@'+rule.id===reference&&rule.name===native&&rule.param_int===2),id);
  const root=(card.kind==='room'?output.cards:output.relics)[0];
  for(const [language,key] of [['en','english'],['es','spanish']] as const){
   assert.equal(root.descriptions[key],recipe.description[language].replace('{amount}','2'));
   assert.equal(description(card,undefined,language,rules),root.descriptions[key]);
  }
 }
});
// 2026-11-21-1815||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Cubrir edición in situ de acciones al copiar clanes y sustitución final en artefactos
// 2026-11-21-1815||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Comprobar el daño de Flogging por referencia de la carta y distinguirlo del daño de su carta auxiliar
// 2026-11-21-1817||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Verificar que un artefacto puede conservarse sin efecto o recibir otro

test('Secret Ingredient can change its Mix options or replace the effect, and new spells can search for Mix',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('lazarusleague','en');
 const card=draft.starters.find(c=>c.templateId==='official-SecretIngredient')!;
 const example=await readExample(card.templateId!),parameters=exampleParameters(example),template={example,parameters};
 const action=templateEffects(example.document,example.root)[0];
 const amount=parameters.find(p=>p.id===action.id&&p.path[0]==='param_int')!;
 const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{card,template,rules,language:'en',onChange:()=>{}}));
 assert.match(html,/role="combobox"[^>]+value="Mix/);
 assert.match(html,/Infusion choices/);
 assert.doesNotMatch(html,/Who it affects/);
 for(const language of ['en','es'] as const){
  assert.ok(visibleSearchOptions(effectOptions(rules,language,false),'MIX').some(option=>option.value==='mix'));
  assert.ok(!effectOptions(rules,language,true).some(option=>option.value==='mix'));
 }
 async function inspect(uid:string){
  await validateDraftShape(draft);
  const {cardJson}=await generateClan(draft,uid),doc=JSON.parse(cardJson!);
  const root=doc.cards[0];
  return {root,effect:doc.effects.find(item=>'@'+item.id===root.effects[0])};
 }
 card.parameters[amount.key]=3;
 let output=await inspect(card.uid);
 assert.equal(output.effect.name,'CardEffectMix');
 assert.equal(output.effect.param_card_pool,'InfusionPool');
 assert.equal(output.effect.param_int,3);
 assert.equal(output.root.descriptions.english,'[mix].');
 card.copiedEffectEdits={[action.key]:{recipe:'damage',amount:4}};
 output=await inspect(card.uid);
 assert.equal(output.effect.name,'CardEffectDamage');
 assert.equal(output.effect.target_mode,'drop_target_character');
 assert.equal(output.root.targetless,false);
 assert.equal(output.effect.param_card_pool,undefined);
 card.copiedEffectEdits={[action.key]:{recipe:'mix',amount:4,when:'on_unplayed_positive'}};
 await assert.rejects(validateDraftShape(draft));
 card.copiedEffectEdits={[action.key]:{recipe:'mix',amount:4}};
 output=await inspect(card.uid);
 assert.equal(output.effect.param_int,4);
 assert.equal(output.effect.param_card_pool,'InfusionPool');
 const fresh=blankCard('spell','new-mix');
 fresh.name='Test Mix';
 fresh.effects=[{recipe:'mix',amount:3,target:'spell_target',when:'on_spawn'}];
 draft.cards.push(fresh);
 output=await inspect(fresh.uid);
 assert.equal(output.root.descriptions.english,'[mix].');
 assert.equal(output.root.targetless,true);
 assert.equal(output.effect.name,'CardEffectMix');
 assert.equal(output.effect.param_int,3);
 assert.equal(output.effect.param_card_pool,'InfusionPool');
 fresh.effects[0].when='on_unplayed_positive';
 await assert.rejects(validateDraftShape(draft));
});

test('copied scaling, next-turn draw and lunar upgrades expose and export their native values',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 for(const [id,className,value,expected] of [
  ['official-Agonize','CardTraitScalingAddDamage',42,/Deal 42 damage/],
  ['official-Engraft','CardEffectDrawAdditionalNextTurn',4,/Draw \+4 next turn/],
  ['official-Channelsong','CardEffectDrawType',3,/Draw 3 units/],
  ['official-Cleave','CardEffectDamagePerSourceAttack',3,/equal to 3 ×/],
  ['official-relic-ExtraSpawnTrigger','RelicEffectModifyTriggerCount',3,/triggers 3 additional times/],
  ['official-CelestialStorm','CardTraitAddCardUpgradeOnMoonPhase',1,undefined],
 ] as const){
  const example=await readExample(id),card=cloneExampleCard(example,id,'en'),parameters=exampleParameters(example);
  const parameter=parameters.find(p=>p.label===className&&p.path[0]==='param_int')!;
  assert.ok(parameter,id);
  card.parameters[parameter.key]=value;
  draft.cards.push(card);
  await validateDraftShape(draft);
  const {cardJson}=await generateClan(draft,card.uid),doc=JSON.parse(cardJson!);
  const native=doc[parameter.section].find(definition=>definition.name===className);
  assert.equal(native.param_int,value);
  if(expected){
   assert.match(description(card,{example,parameters},'en',rules),expected);
   if(['official-Channelsong','official-Cleave','official-relic-ExtraSpawnTrigger'].includes(id)){
    const root=(doc.cards??doc.relics).find(entry=>entry.names.english===card.name);
    assert.match(root.descriptions.english,expected);
    assert.match(root.descriptions.spanish,/3/);
   }
  }
  else assert.match(native.param_description.english,/\[moonshade\]/);
 }
});

test('simple traits can be removed and re-added without duplication on copied or new cards',async()=>{
 const rules=await creatorRules(),draft=await buildOfficialDraft('hellhorned','en');
 const example=await readExample('freecompany-GrimoireMagicMissile1');
 const card=cloneExampleCard(example,'ephemeral-copy','en'),parameters=exampleParameters(example);
 const original=templateEffects(example.document,example.root).find(row=>row.definition.name==='CardTraitEphemeral')!;
 for(const [language,label] of [['en','Ephemeral'],['es','Efímera']] as const){
  const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
   card,template:{example,parameters},rules,language,onChange:()=>{},
  }));
  assert.ok(html.includes(label));
 }
 card.traits=['CardTraitEphemeral'];
 draft.cards.push(card);
 for(const removed of [[],[original.key]]){
  card.removedTemplateEffects=removed;
  await validateDraftShape(draft);
  const {cardJson}=await generateClan(draft,card.uid),doc=JSON.parse(cardJson!);
  const root=doc.cards.find(entry=>entry.names.english===card.name);
  const active=root.traits.map(ref=>doc.traits.find(t=>'@'+t.id===ref)?.name);
  assert.equal(active.filter(name=>name==='CardTraitEphemeral').length,1);
  assert.match(description(card,{example,parameters},'es',rules),/Efímera/);
 }
 const unit=blankCard('unit','trait-unit');
 unit.name='Trait test unit';
 unit.traits=['CardTraitTreasure'];
 draft.cards.push(unit);
 await validateDraftShape(draft);
 const {cardJson}=await generateClan(draft,unit.uid),doc=JSON.parse(cardJson!);
 assert.ok(doc.traits.some(trait=>trait.name==='CardTraitTreasure'));
 unit.traits=['CardTraitPermafrost'];
 await assert.rejects(validateDraftShape(draft));
});

test('a copied trigger with child actions does not repeat its timing under What it does',async()=>{
 const rules=await creatorRules(),example=await readExample('official-ReanimationLab');
 const card=cloneExampleCard(example,'reanimation-rows','en');
 const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
  card,template:{example,parameters:exampleParameters(example)},rules,language:'en',onChange:()=>{},
 }));
 assert.doesNotMatch(html,/<span class="fixed-effect-value">When reanimated<\/span>/);
 assert.match(html,/When it happens/);
 assert.match(html,/role="combobox"[^>]+value="Upgrade units in combat/);
});
// 2026-11-21-1827||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Probar edición, búsqueda y exportación de Mix, y quitar la duplicación de la activación
// 2026-11-21-1827||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Abrir Secret Ingredient desde las cartas iniciales de Lazarus League
// 2026-11-21-1906||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Comprobar artefactos con reglas coexistentes y avisar cuando se quitan las últimas
// 2026-11-21-1907||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Comprobar que solo queda activa la regla nueva y que las cantidades y propiedades se editan en varios tipos de carta
// 2026-11-21-1909||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Comprobar textos de cantidades fijas en el JSON y en ambas vistas previas
// 2026-11-21-1947||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Probar el JSON y el texto de las nuevas reglas de sala y artefacto con los mismos parámetros
// 2026-11-21-1949||codex-clan-editor||clan-creator/tests/creator-copied-effects.test.ts||Verificar que un artefacto de un solo efecto muestra su descripción original en la fila de edición
