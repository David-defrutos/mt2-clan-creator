import test from 'node:test';
import assert from 'node:assert/strict';
import {creatorRules,readExample,cloneExampleCard,exampleParameters} from '../src/server/creator/catalog.ts';
import {description} from '../src/web/creator/presentation.ts';
import {gameText} from '../src/server/creator/description-tokens.ts';
import {generateClan} from '../src/server/creator/export.ts';
import {blankDraft, type EffectChoice} from '../src/server/creator/model.ts';
import {validateDraftShape} from '../src/server/creator/projects.ts';
import {templateEffects} from '../src/server/creator/template-effects.ts';
import {randomUUID} from 'node:crypto';
test('native nested tokens resolve effects traits upgrades statuses and preserve ordinary keywords',async()=>{const rules=await creatorRules(),doc={cards:[{id:'c',effects:['@e'],traits:['@t']}],effects:[{id:'e',param_status_effects:[{status:'regen',count:4}],param_upgrade:'@u'}],upgrades:[{id:'u',bonus_unhealed_hp:20}],traits:[{id:'t',param_int:3}]};assert.equal(gameText('[trait0.power] [effect0.status0.power] [effect0.upgrade.unhealedbonushp] [resolve]',doc,{section:'cards',definition:doc.cards[0]},'en',rules),'3 4 20 Resolve');});
test('native previews show actual upgrade amounts and equipment resolve instead of stale root tokens',async()=>{const rules=await creatorRules();for(const [id,pattern]of [['official-HuskHermit',/Revenge:.*3/],['official-Fortify',/Resolve:.*6/]] as const){const e=await readExample(id),c=cloneExampleCard(e,'test','en');const text=description(c,{example:e,parameters:exampleParameters(e)},'en',rules);assert.match(text,pattern);assert.doesNotMatch(text,/variable value|effect0[.]|paramint/i);}});
// 2026-11-15-2107||codex-clan-editor||clan-creator/tests/creator-description-tokens.test.ts||Verificar cantidades anidadas nativas y regresiones de Husk Hermit y Fortified Pauldrons
// 2026-11-15-2108||codex-clan-editor||clan-creator/tests/creator-description-tokens.test.ts||Contrastar activacion post_combat real de Fortified Pauldrons

test('appended damage uses its final card index and independent Reserve index in both languages',async()=>{
 const example=await readExample('official-ItsAlive'),rules=await creatorRules();
 const detail={example,parameters:exampleParameters(example)};
 const draft=blankDraft(randomUUID()),card=cloneExampleCard(example,'spell','en');
 draft.cards=[card];
 const damage:EffectChoice={recipe:'damage',amount:15,when:'on_spawn',target:'spell_target'};
 card.effects=[{...damage,when:'on_unplayed_positive',target:'all_enemy',amount:4},damage];
 for(const amount of [15,23]){
  damage.amount=amount;
  const doc=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
  const root=doc.cards.find((value:any)=>value.names?.english===card.name);
  const effect=doc.effects.find((value:any)=>'@'+value.id===root.effects[3]);
  const reserve=doc.card_triggers.find((value:any)=>value.trigger==='on_unplayed_positive');
  assert.equal(effect.param_int,amount);
  assert.equal(doc.effects.find((value:any)=>'@'+value.id===reserve.effects[0]).param_int,4);
  for(const [language,locale] of [['en','english'],['es','spanish']] as const){
   assert.match(root.descriptions[locale],/\[effect3\.power\]/);
   assert.match(reserve.descriptions[locale],/\[effect0\.power\]/);
   assert.match(gameText(root.descriptions[locale],doc,{section:'cards',definition:root},language,rules),new RegExp(String(amount)));
   assert.match(description(card,detail,language,rules),new RegExp(language==='en'?amount+' damage':amount+' de daño'));
  }
 }
 card.manualDescriptions={en:'My custom damage rule.'};
 const doc=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
 const root=doc.cards.find((value:any)=>value.names?.english===card.name);
 assert.equal(root.descriptions.english,'My custom damage rule.');
 assert.match(root.descriptions.spanish,/\[effect3\.power\]/);
 assert.match(description(card,detail,'en',rules),/My custom damage rule/);
 assert.doesNotMatch(description(card,detail,'en',rules),/23 damage/);
 assert.match(description(card,detail,'es',rules),/23 de daño/);
});

test('a native damage calculation keeps the heal multiplier on secondarypower',async()=>{
 const example=await readExample('official-RestorationDetonation'),rules=await creatorRules();
 const parameters=exampleParameters(example),card=cloneExampleCard(example,'spell','en');
 const damage=parameters.find(p=>p.path.at(-1)==='param_int_2');
 assert.ok(damage);
 card.parameters[damage.key]=7;
 const draft=blankDraft(randomUUID());
 draft.cards=[card];
 const doc=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
 const root=doc.cards.find((value:any)=>value.names?.english===card.name);
 for(const [language,locale] of [['en','english'],['es','spanish']] as const){
  assert.match(root.descriptions[locale],/\[effect0\.secondarypower\]/);
  assert.match(description(card,{example,parameters},language,rules),/(?:7\s*[x×]|[x×]\s*7)/);
 }
});

test('attack and status scaling show coefficients in their original formula and accept old saves',async()=>{
 const rules=await creatorRules();
 for(const [id,action,index,marker] of [
  ['official-Cleave','CardEffectDamagePerSourceAttack',1,'power_unmodified'],
  ['official-CollectorOfSorrows','CardEffectDamagePerStatusEffect',1,'power'],
 ] as const){
  const example=await readExample(id),parameters=exampleParameters(example);
  const card=cloneExampleCard(example,'scaled','en');
  const draft=blankDraft(randomUUID());
  draft.cards=[card];
  const parameter=parameters.find(item=>item.label===action&&item.path.at(-1)==='param_int');
  assert.ok(parameter);
  card.parameters[parameter.key]=3;
  if(action==='CardEffectDamagePerStatusEffect'){
   const legacy=exampleParameters(example,true).find(item=>item.label===action&&item.path.at(-1)==='count')!;
   assert.ok(legacy);
   assert.ok(!parameters.some(item=>item.key===legacy.key));
   card.parameters[legacy.key]=10;
   await validateDraftShape(draft);
  }
  const doc=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
  const owner=[...doc.cards,...(doc.character_triggers??[])].find((item:any)=>
   Object.values(item.descriptions??{}).some(text=>typeof text==='string'&&text.includes('[effect'+index+'.'+marker+']')));
  assert.ok(owner);
  const effect=doc.effects.find((item:any)=>'@'+item.id===owner.effects[index]);
  assert.equal(effect.param_int,3);
  if(action==='CardEffectDamagePerStatusEffect')assert.equal(effect.param_status_effects[0].count,1);
  assert.ok(owner.descriptions.english.includes('[effect'+index+'.'+marker+'] × '));
  assert.ok(owner.descriptions.spanish.includes('[effect'+index+'.'+marker+'] × '));
 }
});

test('room and repeated hit descriptions bind to each action in its actual container',async()=>{
 const rules=await creatorRules();
 for(const id of ['official-InfernoRoom','official-CollectivePunishment']){
  const example=await readExample(id),parameters=exampleParameters(example);
  const card=cloneExampleCard(example,'damage','en');
  const draft=blankDraft(randomUUID());draft.cards=[card];
  const hits=templateEffects(example.document,example.root).filter(row=>row.definition.name==='CardEffectDamage');
  assert.ok(hits.length);
  const changed=hits.at(-1)!;
  const parameter=parameters.find(item=>item.id===changed.id&&item.path.at(-1)==='param_int')!;
  card.parameters[parameter.key]=19;
  if(card.kind==='room')card.copiedEffectEdits={[changed.key]:{target:'all_enemy'}};
  const doc=JSON.parse((await generateClan(draft,card.uid)).cardJson!);
  const root=doc.cards.find((item:any)=>item.names?.english===card.name);
  for(const [language,locale] of [['en','english'],['es','spanish']] as const){
   const text=root.descriptions[locale];
   assert.match(text,card.kind==='room'?/\[effect0\.upgrade\.roommodifier0\.effect0\.power\]/:
    /\[effect0\.power\] \/ \[effect1\.power\]/);
   assert.match(description(card,{example,parameters},language,rules),/\b19\b/);
  }
 }
});
// 2026-11-22-0935||codex-clan-editor||clan-creator/tests/creator-description-tokens.test.ts||Cubrir daño añadido, repetido y calculado, efectos de salas y edición bilingüe
