import React,{useState} from 'react';
import {ErrorNotice} from './error-notice';
import {JsonViewer} from './json-viewer';
import {local,request,type Language} from './presentation';

export function CardJson({projectId,uid,name,persist,rules,language}:{projectId:string;uid:string;name:string;persist:()=>Promise<{revision:number}|undefined>;rules:any;language:Language}){
 const [content,setContent]=useState<string>(),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
 async function open(){
  setBusy(true);setError(undefined);
  try{
   const saved=await persist();
   if(!saved)throw Error('No clan is open');
   const result=await request('/projects/'+projectId+'/card-json',{uid,revision:saved.revision});
   setContent(result.content);
  }catch(e){setError(e);}finally{setBusy(false);}
 }
 return <div className="card-json">
  <button className="quiet" disabled={busy} onClick={open}>{local(rules.jsonViewer[busy?'loading':'cardButton'],language)}</button>
  {error!=null&&<ErrorNotice error={error} rules={rules} language={language} onRetry={open}/>}
  {content&&<JsonViewer key={uid} preview={{files:[{name,path:'',content}]}} cardName={name} rules={rules} language={language} onClose={()=>setContent(undefined)}/>}
 </div>;
}
// 2026-11-21-0950||codex-clan-editor||clan-creator/src/web/creator/card-json.tsx||Consultar el JSON de una carta desde el editor
// 2026-11-21-0951||codex-clan-editor||clan-creator/src/web/creator/card-json.tsx||Admitir borradores pendientes y verificar persistencia antes de consultar
