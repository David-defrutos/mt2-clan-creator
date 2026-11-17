import type {Draft} from './model.js';
export interface EditingView {step:number;editing?:string;level:number}
export function editingView(d:Draft,input:any,steps:any[]):EditingView {
 const step=Number.isInteger(input?.step)&&steps[input.step]?input.step:d.step,definition=steps[step];
 const candidate=[...d.starters,...d.cards].find(c=>c.uid===input?.editing);
 const allowed=candidate&&(definition.type==='starters'?d.starters.includes(candidate):definition.type==='collection'?(definition.index==='spell'?['spell','equipment','blight','junk'].includes(candidate.kind):candidate.kind===definition.index):['art','rewards'].includes(definition.type));
 return {step,level:Number.isInteger(input?.level)&&input.level>=0&&input.level<3?input.level:0,...(allowed?{editing:candidate.uid}:{})};
}
export function resumeName(d:any,rules:any,language:'es'|'en'){const view=d.view;if(!view)return '';return view.editingName||[rules.steps[view.step]?.title?.[language],rules.steps[view.step]?.type==='path'?`${rules.labels.level[language]} ${view.level+1}`:''].filter(Boolean).join(' · ');}
// 2026-11-17-0021||codex-clan-editor||clan-creator/src/server/creator/navigation-state.ts||Guardar contexto válido de edición sin incluirlo en contenido jugable ni copias portátiles
