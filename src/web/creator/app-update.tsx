import React,{useState} from 'react';
import {local,request,type Language} from './presentation';

type UpdateResult={status:'available'|'current'|'ahead'|'unavailable';latest?:string;url?:string};

export function AppUpdate({version,rules,language}:{version?:string;rules:any;language:Language}){
 const [result,setResult]=useState<UpdateResult>();
 const [busy,setBusy]=useState(false);
 if(!version||!rules?.repository)return null;
 const text=(key:string)=>local(rules[key],language);
 const repository='https://github.com/'+rules.repository;
 async function check(){
  setBusy(true);
  try{setResult(await request('/app-update'));}
  catch{setResult({status:'unavailable'});}
  finally{setBusy(false);}
 }
 return <div className="app-update">
  <span className="app-version">{text('version').replace('{version}',version)}</span>
  <button className="quiet" disabled={busy} onClick={check}>{text(busy?'checking':'check')}</button>
  <div className="app-update-result" role="status">
   {!busy&&result&&<p>{text(result.status).replace('{version}',result.latest??'')}</p>}
   {!busy&&result?.status==='available'&&result.url&&<a href={result.url} target="_blank" rel="noreferrer">{text('download')} ↗</a>}
   {!busy&&result?.status==='unavailable'&&<a href={repository+'/releases'} target="_blank" rel="noreferrer">{text('releases')} ↗</a>}
  </div>
 </div>;
}
// 2026-11-21-1105||codex-clan-editor||clan-creator/src/web/creator/app-update.tsx||Mostrar la versión, el botón de comprobación y enlaces a GitHub y descargas
// 2026-11-21-1223||codex-clan-editor||clan-creator/src/web/creator/app-update.tsx||Adaptar la versión y la comprobación al espacio de la cabecera
