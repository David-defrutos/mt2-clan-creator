import {creatorRules} from './catalog.js';
import {loadDraft} from './projects.js';
import {allCards} from './model.js';
import {gameContentHash,readProjectState,updateProjectState} from './project-state.js';
export async function savePlaytest(id:string,input:any){const d=await loadDraft(id),state=await readProjectState(id),rules=await creatorRules(),hash=gameContentHash(d);if(!input||input.contentHash!==hash||state.lastInstall?.contentHash!==hash||state.uninstalledAt)throw Error('Instala los cambios actuales antes de confirmar la prueba.');if(!input.checks||typeof input.checks!=='object'||Array.isArray(input.checks)||Object.entries(input.checks).some(([key,value])=>typeof value!=='boolean'||!rules.playtestChecks.some((c:any)=>c.id===key)))throw Error('Comprobaciones no válidas.');await updateProjectState(id,{playtest:{contentHash:hash,checks:input.checks,at:new Date().toISOString()}});}
// 2026-11-17-2236||codex-clan-editor||clan-creator/src/server/creator/playtest.ts||Registrar comprobaciones declaradas por el jugador solo para la versión instalada vigente

export const cardTestStatuses=['untested','works','problem'] as const;
export async function saveCardTest(id:string,input:any){
 const draft=await loadDraft(id),hash=gameContentHash(draft);
 if(!input||input.contentHash!==hash||!allCards(draft).some(c=>c.uid===input.uid)||
    !cardTestStatuses.includes(input.status)||typeof input.note!=='string'||input.note.length>1000)throw Error('Nota de carta no válida.');
 await updateProjectState(id,(state:any)=>{
  if(state.lastInstall?.contentHash!==hash||state.uninstalledAt)throw Error('Instala los cambios actuales antes de confirmar la prueba.');
  return {cardNotes:{...state.cardNotes,[input.uid]:{contentHash:hash,status:input.status,note:input.note.trim()}}};
 });
}
// 2026-11-19-0913||codex-clan-editor||clan-creator/src/server/creator/playtest.ts||Validar y guardar estado y nota por carta asociada a la versión jugada
