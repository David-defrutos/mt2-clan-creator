import test from 'node:test';
import assert from 'node:assert/strict';
import { characterChoiceLabel, characterIdentity, initialCharacterIdentity, useBattleBackground } from '../src/web/character-choice.ts';
import type { Entry } from '../src/web/types.ts';
const entry = (id: string, section = 'game_objects', name = id): Entry => ({ id, name, section, file: 'json/cards/WW_C01.json', index: 0, hash: 'fixture', data: {} });
const selection = { entry: entry('WW_WizardDisplay'), context: 'selection', uses: [entry('WW_Class', 'classes')] };
const battle = { entry: entry('WW_C01CharacterArt'), context: 'battle', uses: [entry('WW_C01_Character', 'characters', 'Dean of the Hat Department')] };

test('Dean abre el arte de combate aunque el retrato de selección aparezca antes; conserva selecciones explícitas', () => {
  const items = [selection, battle];
  assert.equal(initialCharacterIdentity(items, ''), characterIdentity(battle));
  assert.equal(initialCharacterIdentity(items, characterIdentity(selection)), characterIdentity(selection));
  assert.equal(initialCharacterIdentity([selection], ''), characterIdentity(selection));
  assert.equal(initialCharacterIdentity([], ''), '');
  assert.equal(useBattleBackground(selection.context, true), false);
  assert.equal(useBattleBackground(battle.context, true), true);
  assert.equal(useBattleBackground(battle.context, false), false);
});

test('selector distingue el nombre del personaje y el uso sin duplicar el ID', () => {
  assert.equal(characterChoiceLabel(battle, text => text), 'Dean of the Hat Department · Combate · WW_C01CharacterArt');
  assert.equal(characterChoiceLabel(selection, text => text), 'WW_WizardDisplay · Selección de campeón');
  assert.equal(characterChoiceLabel(battle, text => text === 'Combate' ? 'Battle' : text), 'Dean of the Hat Department · Battle · WW_C01CharacterArt');
});
// 2026-10-11-2103||codex-clan-editor||clan-editor/tests/character-choice.test.ts||Regresión de Dean: elección de combate, conservación de selección explícita, fondo y etiquetas diferenciadas
