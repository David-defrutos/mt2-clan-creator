import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {creatorRules,exampleList,readExample,cloneExampleCard,exampleParameters} from '../src/server/creator/catalog.ts';
import {EffectEditor} from '../src/web/creator/components.tsx';
import {ExamplePicker} from '../src/web/creator/example-picker.tsx';
import {championPreviewData} from '../src/web/creator/champion-preview.tsx';
import {copyChampionPath} from '../src/web/creator/champion-copy.ts';
import {description} from '../src/web/creator/presentation.ts';

test('guided sentences refer to available effects, triggers and targets and render on the matching card type',async()=>{
 const rules=await creatorRules();
 for(const preset of rules.guidedEffectPresets){
  assert.ok(rules.recipes.some((recipe:any)=>recipe.id===preset.effect.recipe));
  assert.ok(rules.triggers.some((trigger:any)=>trigger.value===preset.effect.when));
  assert.ok(rules.targets.some((target:any)=>target.value===preset.effect.target));
  for(const language of ['es','en'] as const){
   const html=renderToStaticMarkup(React.createElement(EffectEditor,{rules,language,t:key=>rules.labels[key]?.[language]??key,unit:preset.unit,effects:[preset.effect],onChange:()=>{}}));
   assert.ok(html.includes(preset.label[language]));
   if(preset.effect.duration)assert.ok(html.includes(rules.effectDurations.find((choice:any)=>choice.value===preset.effect.duration).label[language]));
  }
 }
 for(const language of ['es','en'] as const)for(const unit of [true,false]){
  const html=renderToStaticMarkup(React.createElement(EffectEditor,{rules,language,t:key=>rules.labels[key]?.[language]??key,unit,effects:[],onChange:()=>{}}));
  const options=Array.from(html.matchAll(/<option value="\d+">([^<]+)<\/option>/g),match=>match[1]);
  assert.equal(options.length,rules.guidedEffectPresets.filter((preset:any)=>preset.unit===unit).length);
  assert.deepEqual(options,[...options].sort(new Intl.Collator(language).compare));
 }
});

test('example picker starts with ideas appropriate to the card type and champion previews use all three upgrades',async()=>{
 const rules=await creatorRules(),catalog=await exampleList();
 for(const kind of ['unit','spell','room','equipment','artifact']){
  const html=renderToStaticMarkup(React.createElement(ExamplePicker,{config:{rules,catalog},language:'en',kind,t:key=>rules.labels[key]?.en??key,onClose:()=>{},onPick:()=>{}}));
  assert.match(html,/Ideas for this step/);
  assert.ok((html.match(/class="example-card /g)??[]).length<=4);
 }
 const example=await readExample('official-LunaCovenChamp2-path-2-level-1');
 const detail={example,card:cloneExampleCard(example,'preview','en'),parameters:exampleParameters(example)};
 const path=copyChampionPath(detail,'en')!;
 const text=path.levels.map((_,index)=>{
  const preview=championPreviewData({card:detail.card,paths:[path]},detail,0,index,{[example.id]:detail},rules);
  assert.equal(preview.unavailable,false);
  return description(preview.card,preview.template,'en',rules);
 });
 assert.equal(text.length,3);
 assert.ok(text.every(Boolean));
 assert.ok(new Set(text).size>1);
});
test('champion and path pickers show every matching champion without additional browsing buttons',async()=>{
 const rules=await creatorRules(),catalog=await exampleList();
 const expected=catalog.items.filter(entry=>entry.official&&!entry.legacy&&entry.kind==='unit'&&entry.rarity==='champion'&&entry.championPath?.levels.length===3);
 assert.ok(expected.length>rules.catalogBrowser.pageSize);
 for(const pathsOnly of [false,true]){
  const html=renderToStaticMarkup(React.createElement(ExamplePicker,{
   config:{rules,catalog},language:'en',kind:'unit',champion:true,pathsOnly,replacing:true,
   t:key=>rules.labels[key]?.en??key,onClose:()=>{},onPick:()=>{},
  }));
  assert.ok((html.match(/class="example-card /g)??[]).length>=expected.length);
  assert.doesNotMatch(html,/Ideas for this step|See all examples|more-examples/);
  assert.match(html,/loading="lazy"/);
 }
});
// 2026-11-19-0752||codex-clan-editor||clan-creator/tests/creator-first-play.test.ts||Validar frases, ejemplos por tipo y vista de los tres niveles de una senda
// 2026-11-21-1008||codex-clan-editor||clan-creator/tests/creator-first-play.test.ts||Verificar listado completo inmediato tanto para campeones como para sendas
// 2026-11-21-1427||codex-clan-editor||clan-creator/tests/creator-first-play.test.ts||Comprobar el orden real de los ejemplos en unidades y hechizos en los dos idiomas
