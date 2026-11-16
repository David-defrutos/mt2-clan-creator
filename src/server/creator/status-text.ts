import {unitStatusKey} from './model.js';
export function statusAmount(status:any,count:number,rules:any){return rules.unitAbilities?.find((a:any)=>a.status===unitStatusKey(status))?.fixed?'':' '+count;}
// 2026-11-15-2117||codex-clan-editor||clan-creator/src/server/creator/status-text.ts||Omitir cantidades visibles en capacidades fijas usando la configuracion compartida
