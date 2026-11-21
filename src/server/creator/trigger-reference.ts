import {unitStatusKey} from './model.js';

export function triggerOption(value:unknown,rules:any){
 const key=unitStatusKey(value);
 return (rules.triggers??[]).find((option:any)=>option.value===key);
}

export function triggerReference(value:string,rules:any){
 return structuredClone(triggerOption(value,rules)?.reference??value);
}

export function triggerLabel(value:unknown,rules:any,language:string):string{
 if(!value)return '';
 const key=unitStatusKey(value);
 return rules.triggerLabels?.[key]?.[language]??triggerOption(value,rules)?.label?.[language]??
  rules.officialCardTriggers?.find((option:any)=>option.value===key)?.label?.[language]??'';
}
// 2026-11-21-1341||codex-clan-editor||clan-creator/src/server/creator/trigger-reference.ts||Resolver activaciones nativas y referencias de Conductor desde los mismos datos
