import React,{useEffect,useRef,useState} from 'react';
import type {CardDraft} from '../../server/creator/model';
import {copyOfficialMechanics} from './copy-mechanics';
import {local,type Language} from './presentation';
export type ReplacementMode='all'|'identity'|'mechanics';
export function replaceCard(current:CardDraft,source:CardDraft,detail:any,mode:ReplacementMode,rules:any):CardDraft {
  const defaults:Partial<Record<CardDraft['kind'],string>> = {unit:rules.defaultUnit, room:rules.defaultRoom, artifact:rules.defaultArtifact, spell:rules.defaultSpell};
  const appearanceTemplateId = current.appearanceTemplateId ?? current.templateId ?? defaults[current.kind];
  if(mode==='mechanics') return copyOfficialMechanics({...current,appearanceTemplateId},source,detail);
  const copy = {...structuredClone(source),uid:current.uid,banner:current.banner,reward:current.reward,unlockLevel:current.unlockLevel};
  if(mode==='all') return copy;
  return {...copy,name:current.name,image:current.image,characterImage:current.characterImage,appearanceTemplateId,scale:current.scale,positionY:current.positionY};
}
export interface ReplacementRequest {currentName:string;nextName:string;path?:boolean;mechanics?:boolean;effectsOnly?:boolean;apply:(mode:ReplacementMode)=>void;current?:React.ReactNode;result?:(mode:ReplacementMode)=>React.ReactNode;next?:React.ReactNode}
export function ReplacementDialog({request,rules,language,onClose}:{request:ReplacementRequest;rules:any;language:Language;onClose:()=>void}){const ref=useRef<HTMLDialogElement>(null),[mode,setMode]=useState<ReplacementMode>(request.effectsOnly?'mechanics':'identity'),t=(k:string)=>local(rules.guidedText[k],language);useEffect(()=>{ref.current?.showModal();},[]);return <dialog ref={ref} className="replacement-dialog" onCancel={e=>{e.preventDefault();onClose();}} aria-labelledby="replacement-title"><h2 id="replacement-title">{t('replaceTitle')}</h2><p>{t(request.path?'replacePathHelp':'replaceHelp')}</p><div className="replacement-compare"><section><h3>{t('current')}</h3><strong>{request.currentName}</strong>{request.current}</section><section><h3>{request.result?local(rules.cardGuidance.result,language):t('replacement')}</h3>{request.result?request.result(mode):<><strong>{request.nextName}</strong>{request.next}</>}</section></div>{!request.path&&<fieldset>{((request.effectsOnly?['mechanics']:['identity','all',...(request.mechanics?['mechanics']:[])]) as ReplacementMode[]).map(value=><label key={value}><input type="radio" name="replacement-mode" checked={mode===value} onChange={()=>setMode(value)}/>{t(value==='all'?'replaceAll':value==='identity'?'keepIdentity':'replaceMechanics')}</label>)}</fieldset>}<div className="dialog-actions"><button className="secondary" onClick={onClose}>{local(rules.labels.cancel,language)}</button><button className="primary" onClick={()=>{request.apply(mode);onClose();}}>{t(request.path?'replacePath':'applyReplacement')}</button></div></dialog>;}
// 2026-11-17-0022||codex-clan-editor||clan-creator/src/web/creator/replacement.tsx||Proteger sustitución de cartas efectos y sendas con revisión explícita y conservación opcional de identidad
// 2026-11-17-0031||codex-clan-editor||clan-creator/src\web\creator\replacement.tsx||Conservar nombre e imágenes por defecto al sustituir y no ofrecer opciones falsas en copia solo de efectos
// 2026-11-19-0846||codex-clan-editor||clan-creator/src/web/creator/replacement.tsx||Renderizar el resultado de la opción de copia seleccionada
// 2026-11-19-0851||codex-clan-editor||clan-creator/src/web/creator/replacement.tsx||Conservar el arte predeterminado al copiar y nombrar el resultado
