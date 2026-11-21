import React,{useEffect,useState} from 'react';
import {ErrorNotice} from './error-notice';
import {local,request,type Language} from './presentation';

interface CompilerVersion {id:string;name:string;current:string;recommended:string;available?:string}

export function CompilerUpdates({rules,language,disabled,onChange}:{rules:any;language:Language;disabled:boolean;onChange:()=>void}){
 const [versions,setVersions]=useState<CompilerVersion[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
 const t=(key:string)=>local(rules.compilerUpdates[key],language);
 useEffect(()=>{
  let active=true;
  request<CompilerVersion[]>('/compiler-updates').then(status=>{if(active)setVersions(status);}).catch(()=>{});
  return ()=>{active=false;};
 },[]);
 async function choose(id:string,version?:string){
  setBusy(true);setError(undefined);
  try{
   setVersions(await request('/compiler-updates',{id,version}));
   onChange();
  }catch(e){setError(e);}finally{setBusy(false);}
 }
 if(!versions.length)return null;
 return <details className="compilation-help">
  <summary>{t(versions.some(item=>item.available)?'available':'title')}</summary>
  <p>{t('help')}</p>
  <ul>{versions.map(item=><li key={item.id}>
   <strong>{item.name} {item.current}</strong>{' '}
   {item.available&&<button className="secondary" disabled={busy||disabled} onClick={()=>choose(item.id,item.available)}>
    {t('download').replace('{version}',item.available)}
   </button>}
   {item.current!==item.recommended&&<button className="quiet" disabled={busy||disabled} onClick={()=>choose(item.id)}>
    {t('reset').replace('{version}',item.recommended)}
   </button>}
  </li>)}</ul>
  {busy&&<p role="status">{t('downloading')}</p>}
  {error!=null&&<ErrorNotice error={error} rules={rules} language={language}/>}
 </details>;
}
// 2026-11-21-0951||codex-clan-editor||clan-creator/src/web/creator/compiler-updates.tsx||Mostrar versiones de compilacion y dejar la descarga a eleccion del usuario
