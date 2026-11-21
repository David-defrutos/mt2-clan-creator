import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CardCollection} from '../src/web/creator/card-collection.tsx';
import {blankCard} from '../src/server/creator/model.ts';
import {creatorRules} from '../src/server/creator/catalog.ts';
test('spells and equipment render only their own cards in either language',async()=>{
 const rules=await creatorRules();
 const cards=[{...blankCard('spell','s'),name:'Healing spell'},{...blankCard('equipment','e'),name:'Test armour'}];
 for(const language of ['es','en'] as const){
  const page=(kind:'spell'|'equipment')=>renderToStaticMarkup(React.createElement(CardCollection,{
   cards,kind,rules,language,t:k=>k,preview:c=>React.createElement('p',null,c.name),
   onExample:()=>{},onEmpty:()=>{},onEdit:()=>{},onDuplicate:()=>{},onRemove:()=>{},
  }));
  const spells=page('spell'),equipment=page('equipment');
  assert.match(spells,/Healing spell/);
  assert.doesNotMatch(spells,/Test armour/);
  assert.match(equipment,/Test armour/);
  assert.doesNotMatch(equipment,/Healing spell/);
 }
});
// 2026-11-15-2119||codex-clan-editor||clan-creator/tests/creator-card-collection.test.ts||Verificar separacion de equipos y hechizos en ambos idiomas sin alterar tipo de carta
// 2026-11-21-1220||codex-clan-editor||clan-creator/tests/creator-card-collection.test.ts||Adaptar la prueba de colecciones a dos pantallas con aislamiento bilingüe
