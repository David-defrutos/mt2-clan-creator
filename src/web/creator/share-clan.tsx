import React,{useState} from 'react';
import {downloadEditableBackup} from './backup-tools';
import {ErrorNotice} from './error-notice';
import {local,request,type Language} from './presentation';

export function ShareClan({id,name,rules,language,canPlay,persist,disabled}:{
 id:string;name:string;rules:any;language:Language;canPlay:boolean;persist:()=>Promise<any>;disabled:boolean;
}){
 const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
 const t=(key:string)=>local(rules.finishGuide[key],language);
 async function share(play:boolean){
  setBusy(true);setError(undefined);
  try{
   const draft=await persist();
   if(play){
    const {url}=await request('/projects/'+id+'/export',{revision:draft.revision,playable:true});
    const link=document.createElement('a');
    link.href=url;link.download=name+'.zip';
    document.body.append(link);link.click();link.remove();
   }else downloadEditableBackup(await request('/projects/'+id+'/backup'),rules.backups.extension);
  }catch(e){setError(e);}finally{setBusy(false);}
 }
 return <details className="surface">
  <summary>{t('share')}</summary>
  <p>{t('sharePlayHelp')}</p>
  <button className="secondary" disabled={busy||disabled||!canPlay} onClick={()=>share(true)}>{t('sharePlay')}</button>
  {!canPlay&&<p className="note">{t('shareBlocked')}</p>}
  <p>{t('shareEditHelp')}</p>
  <button className="secondary" disabled={busy||disabled} onClick={()=>share(false)}>{t('shareEdit')}</button>
  {busy&&<p role="status">{local(rules.labels.working,language)}</p>}
  {error!=null&&<ErrorNotice error={error} rules={rules} language={language}/>}
 </details>;
}
// 2026-11-19-0914||codex-clan-editor||clan-creator/src/web/creator/share-clan.tsx||Separar el mod jugable del borrador editable y dejar ambas descargas plegadas
