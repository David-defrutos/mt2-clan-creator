import React,{useRef,useState} from 'react';
import {draftImageAssets,type Draft} from '../../server/creator/model';
import {local,request,type Language} from './presentation';

interface Candidate {folder:string;draft:Draft}
export async function previousDrafts(files:File[],maxBytes:number){
 const candidates:Candidate[]=[];
 for(const file of files){
  const path=file.webkitRelativePath;
  if(!/(^|\/)creator-projects\/[a-f0-9-]{36}\/draft\.json$/.test(path)||file.size>maxBytes)continue;
  try{
   const draft=JSON.parse(await file.text());
   if(path.split('/').at(-2)===draft.id&&Array.isArray(draft.cards)&&Array.isArray(draft.champions))candidates.push({draft,folder:path.slice(0,-'draft.json'.length)});
  }catch{continue;}
 }
 return candidates;
}
async function sha(buffer:ArrayBuffer){const digest=await crypto.subtle.digest('SHA-256',buffer);return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');}

export async function previousBackup(candidate:Candidate,files:Map<string,File>,settings:any){
 const assets=[];let bytes=0;
 for(const name of new Set(draftImageAssets(candidate.draft).filter(s=>s.startsWith('upload/')))){
  const file=files.get(candidate.folder+name);
  if(!file||!/^upload\/[a-f0-9-]{36}\.png$/.test(name)||assets.length>=settings.maxAssets||(bytes+=file.size)>settings.maxBytes)throw Error('Invalid draft image');
  const buffer=await file.arrayBuffer(),data=new Uint8Array(buffer);let raw='';
  for(let offset=0;offset<data.length;offset+=16384)raw+=String.fromCharCode(...data.subarray(offset,offset+16384));
  assets.push({name,sha256:await sha(buffer),base64:btoa(raw)});
 }
 return {format:settings.format,version:settings.version,draft:candidate.draft,assets,draftSha256:await sha(new TextEncoder().encode(JSON.stringify(candidate.draft)).buffer)};
}
export function PreviousFolder({rules,language,onChanged}:{rules:any;language:Language;onChanged:()=>Promise<void>}){
 const t=(key:string)=>local(rules.workshopGuide[key],language);
 const [items,setItems]=useState<Candidate[]>([]),[selected,setSelected]=useState<string[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const files=useRef(new Map<string,File>());
 async function pick(list:File[]){
  setBusy(true);setMessage('');setSelected([]);setItems([]);
  try{
   files.current=new Map(list.map(f=>[f.webkitRelativePath,f]));
   const drafts=await previousDrafts(list,rules.backups.maxBytes);setItems(drafts);
   if(!drafts.length)setMessage(t('noDrafts'));
  }finally{setBusy(false);}
 }
 async function restore(){
  setBusy(true);setMessage('');
  try{
   const entries=[];let size=0;
   for(const item of items.filter(i=>selected.includes(i.folder))){
    const entry=await previousBackup(item,files.current,rules.backups);
    size+=new Blob([JSON.stringify(entry)]).size;if(size>rules.collectionBackups.maxBytes)throw Error('Large backup');
    entries.push(entry);
   }
   const backup={format:rules.collectionBackups.format,version:rules.collectionBackups.version,entries};
   await request('/collection-backup/restore',{backup,selected:entries.map((_,i)=>i)});
   setMessage(local(rules.round4Text.restoredCount,language).replace('{count}',String(entries.length)));setItems([]);setSelected([]);files.current.clear();await onChanged();
  }catch{setMessage(local(rules.round4Text.allRestoreError,language));}finally{setBusy(false);}
 }
 return <details className="surface"><summary>{t('previous')}</summary><label className="field">{t('pickPrevious')}<input type="file" {...{webkitdirectory:''}} disabled={busy} onChange={e=>{const chosen=Array.from(e.target.files??[]);e.target.value='';void pick(chosen);}}/></label>
 {items.map(item=><label className="field" key={item.folder}><span><input type="checkbox" disabled={busy} checked={selected.includes(item.folder)} onChange={e=>setSelected(e.target.checked?[...selected,item.folder]:selected.filter(s=>s!==item.folder))}/> {item.draft.name||local(rules.labels.new,language)}</span></label>)}
 {items.length>0&&<button className="primary" disabled={busy||!selected.length} onClick={restore}>{t('restore')}</button>}<p role="status">{busy?local(rules.round4Text.working,language):message}</p></details>;
}
// 2026-11-19-0759||codex-clan-editor||clan-creator/src/web/creator/previous-folder.tsx||Localizar borradores de una versión anterior en la carpeta elegida y restaurar imágenes y clanes seleccionados
