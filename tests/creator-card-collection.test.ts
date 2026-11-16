import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CardCollection} from '../src/web/creator/card-collection.tsx';
import {blankCard} from '../src/server/creator/model.ts';
import {creatorRules} from '../src/server/creator/catalog.ts';
test('equipment is listed under its own heading and cannot appear among spells',async()=>{const rules=await creatorRules(),cards=[{...blankCard('spell','s'),name:'Healing spell'},{...blankCard('equipment','e'),name:'Test armour'}];for(const language of ['es','en'] as const){const html=renderToStaticMarkup(React.createElement(CardCollection,{cards,kind:'spell',rules,language,t:k=>k,preview:c=>React.createElement('p',null,c.name),onExample:()=>{},onEmpty:()=>{},onEdit:()=>{},onDuplicate:()=>{},onRemove:()=>{}}));const spell=html.split(language==='en'?'aria-label="Spells"':'aria-label="Hechizos"')[1].split(language==='en'?'aria-label="Equipment"':'aria-label="Equipos"')[0];assert.match(spell,/Healing spell/);assert.doesNotMatch(spell,/Test armour/);const equipment=html.split(language==='en'?'aria-label="Equipment"':'aria-label="Equipos"')[1];assert.match(equipment,/Test armour/);assert.doesNotMatch(equipment,/Healing spell/);assert.equal(cards[1].kind,'equipment');}});
// 2026-11-15-2119||codex-clan-editor||clan-creator/tests/creator-card-collection.test.ts||Verificar separacion de equipos y hechizos en ambos idiomas sin alterar tipo de carta
