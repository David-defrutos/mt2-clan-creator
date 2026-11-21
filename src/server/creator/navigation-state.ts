import {collectionKind} from './wizard-steps.js';
import type {Draft} from './model.js';
export interface EditingView {step:number;editing?:string;level:number}
export function editingView(d:Draft,input:any,steps:any[]):EditingView {
 const step=Number.isInteger(input?.step)&&steps[input.step]?input.step:d.step,definition=steps[step];
 const candidate=[...d.starters,...d.cards].find(c=>c.uid===input?.editing);
 const allowed=candidate&&(definition.type==='starters'?d.starters.includes(candidate):definition.type==='collection'?collectionKind(candidate.kind)===definition.index:['art','rewards'].includes(definition.type));
 return {step,level:Number.isInteger(input?.level)&&input.level>=0&&input.level<3?input.level:0,...(allowed?{editing:candidate.uid}:{})};
}
export function resumeName(d:any,rules:any,language:'es'|'en'){if(d.pendingCard)return (rules.simpleArtText?.pendingTitle?.[language]??'Card in progress')+' · '+(d.pendingCard.card?.name??d.pendingCard.name??'');const view=d.view;if(!view)return '';return view.editingName||[rules.steps[view.step]?.title?.[language],rules.steps[view.step]?.type==='path'?`${rules.labels.level[language]} ${view.level+1}`:''].filter(Boolean).join(' · ');}
// 2026-11-17-0021||codex-clan-editor||clan-creator/src/server/creator/navigation-state.ts||Guardar contexto válido de edición sin incluirlo en contenido jugable ni copias portátiles
// 2026-11-17-2236||codex-clan-editor||clan-creator/src\server\creator\navigation-state.ts||Identificar carta sin terminar al continuar un clan desde portada
// 2026-11-21-1216||codex-clan-editor||clan-creator/src/server/creator/navigation-state.ts||Conservar el paso anterior y reabrir equipos en su nuevo paso
// 2026-11-21-1217||codex-clan-editor||clan-creator/src/server/creator/navigation-state.ts||Validar la colección correspondiente al paso actual
