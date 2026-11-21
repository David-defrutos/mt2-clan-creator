import React,{useEffect,useId,useRef,useState} from 'react';
import {ErrorNotice} from './error-notice';
import {local,request,type Language} from './presentation';

export type BulkRemovalMode='uninstall'|'trash';
export interface RemovalItem {id:string;name:string;revision:number;lastInstall?:{target:string};status?:string}
export function registeredInstalls(projects:RemovalItem[]){
 return [...new Map(projects.filter(project=>project.status!=='removed'&&!!project.lastInstall?.target).map(project=>[project.id,project])).values()];
}

export async function runBulkRemoval(mode:BulkRemovalMode,items:RemovalItem[],changedMessage:string,call=request){
 let done=0;
 const failed:{item:RemovalItem;error:unknown}[]=[];
 for(const item of items){
  try{
   const endpoint='/projects/'+item.id;
   if(mode==='trash'){
    await call(endpoint+'/trash-draft',{revision:item.revision});
   }else{
    const expectedTarget=item.lastInstall?.target;
    if(!expectedTarget)throw Error(changedMessage);
    const folder=expectedTarget.replace(/[\\/][^\\/]+$/,'');
    const plan=await call(endpoint+'/uninstall-plan',{folder});
    if(plan.target!==expectedTarget)throw Error(changedMessage);
    await call(endpoint+'/uninstall',{token:plan.token});
   }
   done++;
  }catch(error){failed.push({item,error});}
 }
 return {done,failed};
}

export function BulkRemoval({mode,items,rules,language,onClose,onChanged}:{
 mode:BulkRemovalMode;items:RemovalItem[];rules:any;language:Language;onClose:()=>void;onChanged:()=>Promise<void>;
}){
 const dialog=useRef<HTMLDialogElement>(null),label=useId(),processing=useRef(false);
 const [busy,setBusy]=useState(false),[refreshError,setRefreshError]=useState<unknown>(),[result,setResult]=useState<Awaited<ReturnType<typeof runBulkRemoval>>>();
 const t=(key:string)=>local(rules.bulkRemoval[key],language);
 const common=(key:string)=>local(rules.clanRemoval[key],language);
 const name=(item:RemovalItem)=>item.name||local(rules.labels.new,language);
 useEffect(()=>{const current=dialog.current;current?.showModal();return()=>current?.close();},[]);
 async function confirm(){
  if(processing.current)return;
  processing.current=true;setBusy(true);
  try{setResult(await runBulkRemoval(mode,items,t('changed')));await onChanged();}
  catch(error){setRefreshError(error);}
  finally{setBusy(false);processing.current=false;}
 }
 return <dialog ref={dialog} className="clan-removal" aria-labelledby={label} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
  <h2 id={label}>{t(mode)}</h2>
  {result?<div role="status">
   <p>{t(mode+'Done').replace('{done}',String(result.done)).replace('{total}',String(items.length))}</p>
   {result.failed.length>0&&<><h3>{t('failed')}</h3><ul>{result.failed.map(({item,error})=><li key={item.id}><strong>{name(item)}</strong><ErrorNotice error={error} rules={rules} language={language}/></li>)}</ul></>}
  </div>:<>
   <p>{t(mode+'Help')}</p>
   <ul>{items.map(item=><li key={item.id}>{name(item)}{mode==='uninstall'&&<div className="path-preview">{item.lastInstall?.target}</div>}</li>)}</ul>
   {busy&&<p role="status">{common('working')}</p>}
  </>}
  {refreshError!=null&&<ErrorNotice error={refreshError} rules={rules} language={language}/>}
  <div className="dialog-actions">
   <button className="secondary" disabled={busy} autoFocus onClick={onClose}>{common(result?'close':'cancel')}</button>
   {!result&&<button className="primary danger" disabled={busy||!items.length} onClick={confirm}>{t(mode)}</button>}
  </div>
 </dialog>;
}
// 2026-11-19-2223||codex-clan-editor||clan-creator/src/web/creator/bulk-removal.tsx||Añadir confirmación por lotes con lista de clanes y resultado por operación
// 2026-11-19-2223||codex-clan-editor||clan-creator/src/web/creator/bulk-removal.tsx||Evitar repetir clanes en dos listas y mostrar errores al actualizar la portada
