import assert from 'node:assert/strict';
import test from 'node:test';
import {creatorRules} from '../src/server/creator/catalog.ts';
import {blankCard,blankDraft} from '../src/server/creator/model.ts';
import {collectionStep,stepForCard} from '../src/server/creator/wizard-steps.ts';
import {editingView} from '../src/server/creator/navigation-state.ts';
import {draftIssues} from '../src/server/creator/validation.ts';

test('spells and equipment have separate issue links and editing positions',async()=>{
 const rules=await creatorRules(),steps=rules.steps;
 const spell=collectionStep(steps,'spell'),equipment=collectionStep(steps,'equipment');
 assert.deepEqual([spell,equipment],[11,12]);
 const draft=blankDraft('12345678-1234-1234-1234-123456789abc');
 const gear={...blankCard('equipment','gear'),name:'Unique equipment'};
 const magic={...blankCard('spell','magic'),name:'Unique spell'};
 draft.cards.push(gear,magic);
 assert.equal(editingView(draft,{step:spell,editing:gear.uid},steps).editing,undefined);
 assert.equal(editingView(draft,{step:equipment,editing:gear.uid},steps).editing,gear.uid);
 assert.equal(stepForCard(steps,draft,gear),equipment);
 gear.name='';
 assert.ok(draftIssues(draft,steps).some(issue=>issue.uid===gear.uid&&issue.step===equipment));
});
// 2026-11-21-1219||codex-clan-editor||clan-creator/tests/creator-spell-equipment-steps.test.ts||Verificar las dos pantallas, la edición de equipo y la navegación desde avisos
// 2026-11-21-1220||codex-clan-editor||clan-creator/tests/creator-spell-equipment-steps.test.ts||Probar la navegación de equipos sin duplicar la prueba visual de colecciones
// 2026-11-21-1338||codex-clan-editor||clan-creator/tests/creator-spell-equipment-steps.test.ts||Conservar la comprobación de los pasos de hechizos y equipo al añadir otros pasos
