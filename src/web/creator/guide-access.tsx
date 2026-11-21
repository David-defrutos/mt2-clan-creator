import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {GuidePage,guideHref} from './guide-page';
import type {GuideRequest} from './guide-catalog';
import {local,type Language} from './presentation';

const GuideContext=createContext<{open:(request:GuideRequest,opener:HTMLElement)=>void;rules:any;language:Language}|undefined>(undefined);

export function GuideLink({request,global=false}:{
 request:GuideRequest;
 global?:boolean;
}){
 const context=useContext(GuideContext);
 if(!context)return null;
 const copy=context.rules.mechanicGuide,language=context.language;
 const topic=local(copy.pages[request.topic].title,language);
 const label=local(copy.openTopic,language).replace('{topic}',topic);
 return <a className={global?'guide-global-link':'guide-field-link'} href={guideHref(request.topic)}
  aria-haspopup="dialog" aria-label={global?undefined:label} onClick={event=>{
   if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   event.preventDefault();
   context.open(request,event.currentTarget);
  }}>{local(global?copy.title:copy.fieldLink,language)}</a>;
}

function GuideDialog({request,rules,language,onClose}:{
 request:GuideRequest;rules:any;language:Language;onClose:()=>void;
}){
 const ref=useRef<HTMLDialogElement>(null);
 const [topic,setTopic]=useState(request.topic);
 useEffect(()=>{
  const dialog=ref.current;
  dialog?.showModal();
  return ()=>dialog?.close();
 },[]);
 const close=()=>{
  ref.current?.close();
  onClose();
 };
 return <dialog ref={ref} className="guide-dialog" aria-labelledby="guide-title" onCancel={event=>{
  event.preventDefault();
  close();
 }}>
  <GuidePage key={topic} request={topic===request.topic?request:{topic}} rules={rules} language={language}
   onTopic={next=>{setTopic(next);ref.current?.scrollTo(0,0);}} onClose={close}/>
 </dialog>;
}

export function GuideProvider({rules,language,children}:{
 rules:any;language:Language;children:React.ReactNode;
}){
 const [request,setRequest]=useState<GuideRequest>();
 const opener=useRef<HTMLElement>(null);
 return <GuideContext.Provider value={{open:(next,element)=>{
  opener.current=element;
  setRequest(next);
 },rules,language}}>
  {children}
  {request&&<GuideDialog request={request} rules={rules} language={language} onClose={()=>{
   setRequest(undefined);
   opener.current?.focus({preventScroll:true});
  }}/>}
 </GuideContext.Provider>;
}
// 2026-11-21-1930||codex-clan-editor||clan-creator/src/web/creator/guide-access.tsx||Abrir la guía sin desmontar el formulario y conservar enlaces directos a cada tema
// 2026-11-21-1936||codex-clan-editor||clan-creator/src/web/creator/guide-access.tsx||Devolver el foco al enlace que abrió la guía al cerrar el diálogo
