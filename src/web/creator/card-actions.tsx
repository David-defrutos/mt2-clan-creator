import React,{useEffect,useRef,useState} from 'react';
import type {CardDraft} from '../../server/creator/model';
import {local,type Language} from './presentation';

export function CardActionDialog({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),label=React.useId();
 useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog ref={dialog} className="replacement-dialog" aria-labelledby={label} onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={label}>{title}</h2>{children}
 </dialog>;
}

export function RewardRemoval({card,cards,rules,language,onRewards,onClose,onRemove}:{
 card:CardDraft;cards:CardDraft[];rules:any;language:Language;onRewards:()=>void;onClose:()=>void;onRemove:(replacement?:string)=>void;
}){
 const [replacement,setReplacement]=useState('');
 const t=(key:string)=>local(rules.finishGuide[key],language);
 const candidates=cards.filter(c=>c.uid!==card.uid&&c.kind===card.kind&&c.reward===false&&c.name.trim());
 return <CardActionDialog title={t('removeTitle').replace('{name}',card.name||t('card'))} onClose={onClose}>
  <p>{t('rewardUse').replace('{level}',String(card.unlockLevel))}</p>
  {card.banner&&<p>{t('bannerUse')}</p>}
  <button className="quiet" onClick={onRewards}>{t('seeRewards')}</button>
  {!!candidates.length&&<label className="field"><span>{t('replaceReward')}</span>
   <select value={replacement} onChange={e=>setReplacement(e.target.value)}>
    <option value="">{t('noReplacement')}</option>
    {candidates.map(c=><option key={c.uid} value={c.uid}>{c.name}</option>)}
   </select>
  </label>}
  <div className="dialog-actions">
   <button className="secondary" autoFocus onClick={onClose}>{local(rules.labels.cancel,language)}</button>
   <button className="danger" onClick={()=>onRemove(replacement||undefined)}>{local(rules.labels.remove,language)}</button>
  </div>
 </CardActionDialog>;
}
// 2026-11-19-0913||codex-clan-editor||clan-creator/src/web/creator/card-actions.tsx||Revisar usos de recompensa y permitir sustituirla antes de borrar
