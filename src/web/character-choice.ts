import type { Entry } from './types';

interface CharacterChoice { entry: Entry; context: string; uses: Entry[] }
export const characterIdentity = (item: CharacterChoice) => item.entry.file + ':' + item.entry.id;
export function characterContextLabel(context: string) {
  return context === 'battle' ? 'Combate' : context === 'selection' ? 'Selección de campeón' : 'Otros / sin referencias';
}
export function characterChoiceLabel(item: CharacterChoice, translate: (text: string) => string) {
  const name = item.context === 'battle' ? item.uses.find(use => use.section === 'characters')?.name ?? item.entry.name : item.entry.name;
  return [name, translate(characterContextLabel(item.context)), ...(name === item.entry.id ? [] : [item.entry.id])].join(' · ');
}
export function initialCharacterIdentity(items: CharacterChoice[], current: string) {
  if (items.some(item => characterIdentity(item) === current)) return current;
  const item = items.find(item => item.context === 'battle') ?? items[0];
  return item ? characterIdentity(item) : '';
}
export function useBattleBackground(context: string, available: boolean | undefined) {
  return Boolean(available) && context !== 'selection';
}
// 2026-10-11-2103||codex-clan-editor||clan-editor/src/web/character-choice.ts||Distinguir combate y selección por nombre y uso; seleccionar combate por defecto y evitar fondo de sala en retratos
