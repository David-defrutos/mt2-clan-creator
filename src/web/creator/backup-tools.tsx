import {CollectionBackupTools} from './collection-backup-tools';
import React,{useRef,useState} from 'react';
import type {Draft} from '../../server/creator/model';
import {local,request,type Language} from './presentation';
export function downloadEditableBackup(data:any,extension:string){
 const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=(data.draft.name.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,60)||'Clan')+extension;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function BackupTools({rules,language,projects,draft,hideDownload=false,persist,onRestored,onAllRestored}:{rules:any;language:Language;projects?:any[];draft?:Draft;hideDownload?:boolean;persist?:()=>Promise<any>;onRestored:(draft:Draft)=>void;onAllRestored?:()=>Promise<void>}){
 const [selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),file=useRef<HTMLInputElement>(null),t=(key:string)=>local(rules.usabilityText[key],language);
 async function backup(){setBusy(true);setError('');setMessage('');try{if(persist)await persist();const data=await request('/projects/'+(draft?.id??selected)+'/backup');downloadEditableBackup(data,rules.backups.extension);setMessage(t('backupDone'));}catch{setError(t('backupError'));}finally{setBusy(false);}}
 async function restore(input:File){setBusy(true);setError('');setMessage('');try{if(input.size>rules.backups.maxBytes)throw Error();const data=JSON.parse(await input.text());if(persist)await persist();const result=await request('/projects/restore-backup',data);setMessage(t('restored'));onRestored(result);}catch{setError(t('restoreError'));}finally{setBusy(false);if(file.current)file.current.value='';}}
 return <details className="surface backup-tools"><summary>{t('backupTitle')}</summary><p>{t('backupHelp')}</p>{!draft&&!!projects?.length&&<label className="field"><span>{local(rules.labels.name,language)}</span><select value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}><option value="">—</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name||local(rules.labels.new,language)}</option>)}</select></label>}{!hideDownload&&(draft||!!projects?.length)&&<button className="secondary" disabled={busy||(!draft&&!selected)} onClick={backup}>{t(busy?'backupBusy':'backupButton')}</button>}<button className="secondary" disabled={busy} onClick={()=>file.current?.click()}>{t('restoreButton')}</button><input ref={file} className="backup-file" type="file" accept={rules.backups.extension+',application/json'} aria-label={t('restoreButton')} onChange={e=>{if(e.target.files?.[0])restore(e.target.files[0]);}}/>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}<CollectionBackupTools rules={rules} language={language} persist={persist} onChanged={onAllRestored}/></details>;
}
// 2026-11-16-2146||codex-clan-editor||clan-creator/src/web/creator/backup-tools.tsx||Ofrecer descarga de borrador portátil y restauración desde archivo con imágenes sin conocimientos técnicos
// 2026-11-16-2148||codex-clan-editor||clan-creator/src/web/creator/backup-tools.tsx||Guardar cambios pendientes antes de abrir un borrador restaurado
// 2026-11-17-1851||codex-clan-editor||clan-creator/src\web\creator\backup-tools.tsx||Ofrecer copia de todos los clanes junto al respaldo individual existente
// 2026-11-19-0914||codex-clan-editor||clan-creator/src/web/creator/backup-tools.tsx||Reutilizar la descarga del borrador con su arte desde el menú de compartir
// 2026-11-19-0915||codex-clan-editor||clan-creator/src/web/creator/backup-tools.tsx||Mantener una sola acción de descarga editable en la revisión
