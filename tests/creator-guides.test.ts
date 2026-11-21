import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {creatorRules} from '../src/server/creator/catalog.ts';
import {EffectEditor} from '../src/web/creator/components.tsx';
import {effectOptions} from '../src/web/creator/effect-options.ts';
import {GuideProvider} from '../src/web/creator/guide-access.tsx';
import {guideEntries,guideTopics,filterGuideEntries} from '../src/web/creator/guide-catalog.ts';
import {GuidePage} from '../src/web/creator/guide-page.tsx';

test('the guides include every configured choice across all six topics in both languages',async()=>{
 const rules=await creatorRules();
 for(const language of ['en','es'] as const){
  const source={
   effects:[...rules.recipes,...rules.passives].map((item:any)=>item.id),
   timings:[...rules.triggers,...rules.spellTimings,...rules.officialCardTriggers].map((item:any)=>item.value),
   targets:rules.targets.map((item:any)=>item.value),
   abilities:rules.unitAbilities.map((item:any)=>item.status),
   properties:Object.keys(rules.traitLabels),
   duration:rules.effectDurations.map((item:any)=>item.value),
  };
  for(const topic of guideTopics){
   const entries=guideEntries(topic,rules,language);
   for(const value of source[topic])assert.ok(entries.some(entry=>entry.value===value&&entry.name),topic+' '+value);
   assert.equal(new Set(entries.map(entry=>entry.id)).size,entries.length);
  }
 }
});


test('every selectable activation explains its behavior in both languages',async()=>{
 const rules=await creatorRules();
 for(const language of ['en','es'] as const){
  const entries=guideEntries('timings',rules,language);
  const choices=[
   ...rules.triggers.map(option=>'unit:'+option.value),
   ...rules.spellTimings.map(option=>'spell:'+option.value),
   ...rules.officialCardTriggers.map(option=>'spell:'+option.value),
   'room:RoomStateAddEffectPreCombatModifier',
   'room:RoomStateAddEffectPostCombatModifier',
  ];
  for(const id of choices){
   const entry=entries.find(item=>item.id===id);
   assert.ok(entry?.text&&entry.text!==entry.name,language+' '+id);
  }
  for(const property of guideEntries('properties',rules,language))
   assert.ok(property.text&&property.text!==property.name,language+' '+property.id);
 }
});

test('guide search combines filters and distinguishes a spell timing from a unit trigger',async()=>{
 const rules=await creatorRules();
 const entries=guideEntries('effects',rules,'es');
 const unit={topic:'effects' as const,allowed:effectOptions(rules,'es',true).map(option=>option.value)};
 assert.equal(filterGuideEntries(entries,unit,'MIX',{},true).some(entry=>entry.id==='mix'),false);
 assert.equal(filterGuideEntries(entries,unit,'MIX',{},false).some(entry=>entry.id==='mix'),true);
 assert.ok(filterGuideEntries(entries,unit,'curar',{context:'Hechizo'},false).some(entry=>entry.id==='heal'));
 assert.deepEqual(filterGuideEntries(entries,unit,'curar',{context:'Artefacto'},false),[]);
 const timings=guideEntries('timings',rules,'en');
 for(const variant of ['spell','unit'] as const){
  const view=filterGuideEntries(timings,{topic:'timings',variant,allowed:['on_spawn']},'',{},true);
  assert.deepEqual(view.map(entry=>entry.id),[variant+':on_spawn']);
 }
});

test('editing fields include contextual links and each page exposes filters as real form controls',async()=>{
 const rules=await creatorRules();
 const editor=renderToStaticMarkup(React.createElement(GuideProvider,{rules,language:'en',children:
  React.createElement(EffectEditor,{
   rules,language:'en',unit:false,t:name=>rules.labels[name].en,
   effects:[{recipe:'attack',amount:5,target:'all_friendly',when:'on_spawn',duration:'combat'}],onChange:()=>{},
  }),
 }));
 for(const topic of ['effects','timings','targets','duration'])assert.ok(editor.includes('href="?guide='+topic+'"'),topic);
 const html=renderToStaticMarkup(React.createElement(GuidePage,{request:{topic:'effects'},rules,language:'en'}));
 assert.match(html,/<h1 id="guide-title">What it does<\/h1>/);
 assert.match(html,/type="search"/);
 assert.ok((html.match(/<select>/g)??[]).length>=4);
 assert.match(html,/Mix/);
});
// 2026-11-21-1933||codex-clan-editor||clan-creator/tests/creator-guides.test.ts||Comprobar la cobertura de todas las páginas y los filtros de los selectores
// 2026-11-21-2016||codex-clan-editor||clan-creator/tests/creator-guides.test.ts||Exigir explicación en ambos idiomas para todas las activaciones seleccionables
// 2026-11-21-2017||codex-clan-editor||clan-creator/tests/creator-guides.test.ts||Verificar el texto de explicación que usa realmente la ficha
// 2026-11-21-2046||codex-clan-editor||clan-creator/tests/creator-guides.test.ts||Exigir explicación en ambos idiomas para las activaciones de sala y todas las propiedades
