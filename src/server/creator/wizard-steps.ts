import type {CardDraft,Draft} from './model.js';
export interface WizardStep {id:string;type:string;index?:unknown}

export function collectionKind(kind:CardDraft['kind']){
 return kind==='blight'||kind==='junk'?'spell':kind;
}

export function collectionStep(steps:WizardStep[],kind:CardDraft['kind']){
 return steps.findIndex(step=>step.type==='collection'&&step.index===collectionKind(kind));
}

export function stepForCard(steps:WizardStep[],draft:Draft,card:CardDraft){
 const champion=draft.champions.findIndex(c=>c.card.uid===card.uid);
 if(champion>=0)return steps.findIndex(step=>step.type==='champion'&&step.index===champion);
 if(draft.starters.some(c=>c.uid===card.uid))return steps.findIndex(step=>step.type==='starters');
 return collectionStep(steps,card.kind);
}
// 2026-11-21-1217||codex-clan-editor||clan-creator/src/server/creator/wizard-steps.ts||Conservar solo la asignación de cartas a los pasos
