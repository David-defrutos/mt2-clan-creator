import React,{useEffect,useRef,useState} from 'react';
import {local,request,type Language} from './presentation';
import type {Draft} from '../../server/creator/model';

interface SavedClan {id:string;name:string}
export function OpenClanDialog({rules,language,projects,onOpen,onDuplicate,onRestored,onClose}:{
 rules:any;language:Language;projects:SavedClan[];onOpen:(id:string)=>void;onDuplicate:(id:string)=>void;
 onRestored:(draft:Draft)=>void;onClose:()=>void;
}){
 const dialog=useRef<HTMLDialogElement>(null);
 const file=useRef<HTMLInputElement>(null);
 const [query,setQuery]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const t=(key:string)=>local(rules.openClan[key],language);
 const normalize=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase(language);
 const matches=projects.filter(project=>normalize(project.name).includes(normalize(query.trim())));
 useEffect(()=>{
  const element=dialog.current;
  element?.showModal();
  return ()=>element?.close();
 },[]);
 async function openFile(input:File){
  setBusy(true);setError('');
  try{
   if(input.size>rules.backups.maxBytes||input.name.toLowerCase().endsWith('.zip'))throw Error();
   const result=await request<Draft>('/projects/restore-backup',JSON.parse(await input.text()));
   onClose();
   onRestored(result);
  }catch{
   setError(local(rules.usabilityText.restoreError,language));
  }finally{
   setBusy(false);
   if(file.current)file.current.value='';
  }
 }
 return <dialog ref={dialog} className="replacement-dialog first-clan-dialog" aria-labelledby="open-clan-title" onCancel={event=>{
  event.preventDefault();if(!busy)onClose();
 }}>
  <h2 id="open-clan-title">{t('title')}</h2>
  <p>{t('help')}</p>
  <section className="surface">
   <h3>{t('saved')}</h3>
   {projects.length>5&&<label className="field"><span>{t('search')}</span><input value={query} onChange={e=>setQuery(e.target.value)}/></label>}
   {projects.length===0?<p>{local(rules.labels.noDrafts,language)}</p>:matches.length===0?<p role="status">{t('noMatches')}</p>:
    <ul className="open-clan-list">{matches.map(project=>{
     const name=project.name||local(rules.labels.new,language);
     return <li key={project.id}>
      <strong>{name}</strong>
      <div>
       <button className="primary" disabled={busy} aria-label={t('open')+' · '+name} onClick={()=>{onClose();onOpen(project.id);}}>{t('open')}</button>
       <button className="secondary" disabled={busy} aria-label={t('duplicate')+' · '+name} onClick={()=>{onClose();onDuplicate(project.id);}}>{t('duplicate')}</button>
      </div>
     </li>;
    })}</ul>}
  </section>
  <p>{t('importHelp')}</p>
  <button className="secondary" disabled={busy} onClick={()=>file.current?.click()}>{t('import')}</button>
  <input ref={file} className="backup-file" type="file" accept={rules.backups.extension+',application/json'} aria-label={t('import')}
   onChange={e=>{const selected=e.target.files?.[0];if(selected)void openFile(selected);}}/>
  {error&&<p role="alert">{error}</p>}
  <div className="dialog-actions"><button className="secondary" disabled={busy} onClick={onClose}>{local(rules.labels.cancel,language)}</button></div>
 </dialog>;
}
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/web/creator/open-clan.tsx||Hacer visibles las acciones de continuar, duplicar y abrir un archivo editable
