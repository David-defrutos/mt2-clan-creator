import React from 'react';
import {local,type Language} from './presentation';
import type {Change} from '../../server/creator/play-changes';
export function ChangeList({items,rules,language}:{items:Change[];rules:any;language:Language}){
 return <ul>{items.map((item,i)=>{
 const label=local((item.recipe&&rules.recipes.find((r:any)=>r.id===item.recipe)?.label)||(item.status&&rules.statusLabels[item.status])||(rules.workshopGuide[item.field]??rules.labels[item.field==='unlockLevel'?'unlock':item.field]),language);
 return <li key={i}><strong>{item.name}</strong> · {label}{item.before!==undefined&&<> · {item.before} → {item.after}</>}</li>;
 })}</ul>;
}
// 2026-11-19-0759||codex-clan-editor||clan-creator/src/web/creator/change-list.tsx||Mostrar diferencias en idioma del usuario
// 2026-11-19-0800||codex-clan-editor||clan-creator/src/web/creator/change-list.tsx||Mostrar el nombre del efecto junto a las cantidades
