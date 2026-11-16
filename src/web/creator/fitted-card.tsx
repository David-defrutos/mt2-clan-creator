import React,{useEffect,useRef,useState} from 'react';
import {local,type Language} from './presentation';
export function FittedCard({children,rules,language}:{children:React.ReactNode;rules:any;language:Language}){
 const frame=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null),[width,setWidth]=useState(220),[open,setOpen]=useState(false),t=(key:string)=>local(rules.usabilityText[key],language);
 useEffect(()=>{let raf=0;const measure=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const node=frame.current;if(!node)return;const available=Math.max(60,window.innerHeight-node.getBoundingClientRect().top-125);setWidth(Math.min(250,node.parentElement?.clientWidth??250,available*255/450));});};measure();window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};},[]);
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();},[open]);
 return <div className="fitted-card-block"><button className="quiet enlarge-card" onClick={()=>setOpen(true)}>{t('enlarge')}</button><div ref={frame} className="fitted-card" style={{width}}>{children}</div>{open&&<dialog ref={dialog} className="card-enlarged" aria-label={t('enlarge')} onCancel={()=>setOpen(false)}><button className="secondary" onClick={()=>setOpen(false)}>{t('close')}</button><div className="card-enlarged-content">{children}</div></dialog>}</div>;
}
// 2026-11-16-2146||codex-clan-editor||clan-creator/src/web/creator/fitted-card.tsx||Ajustar carta entera al espacio visible y permitir lectura ampliada en diálogo accesible
// 2026-11-16-2159||codex-clan-editor||clan-creator/src/web/creator/fitted-card.tsx||Mantener acción de ampliar por encima de la carta sin solaparla con pie del selector
