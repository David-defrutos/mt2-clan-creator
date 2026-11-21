import React from 'react';
import {local,type Language} from './presentation';

export function SimplifiedEffectsNotice({removed,rules,language}:{removed:string[];rules:any;language:Language}){
 const text=rules.communityClanText;
 const categories=new Map<string,number>();
 for(const path of removed??[]){
  const kind=path.split('/').at(-1)??'other';
  const label=local(text.removedParts[kind]??text.removedParts.other,language);
  categories.set(label,(categories.get(label)??0)+1);
 }
 return <div className="note"><strong>{local(text.simplifiedLabel,language)}</strong> · {local(text.simplifiedHelp,language)}
  {categories.size>0&&<details><summary>{local(text.removedTitle,language)}</summary><ul>
   {[...categories].sort(([a],[b])=>a.localeCompare(b,language)).map(([label,count])=>
    <li key={label}>{label}{count>1?' ('+count+')':''}</li>)}
  </ul></details>}
 </div>;
}
// 2026-11-21-1511||codex-clan-editor||clan-creator/src/web/creator/simplified-effects-notice.tsx||Mostrar qué partes se han quitado de las copias simplificadas con términos del juego
