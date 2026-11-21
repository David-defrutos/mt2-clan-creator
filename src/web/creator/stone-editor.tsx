import React,{useState} from 'react';
import type {Draft,StoneDraft} from '../../server/creator/model';
import {ArtworkImport} from './artwork-import';
import {Field,numberField} from './components';
import {imageUrl,local,request,type Language} from './presentation';

export function StoneEditor({draft,rules,language,onChange}:{draft:Draft;rules:any;language:Language;onChange:(change:(draft:Draft)=>Draft)=>void}){
 const stones=draft.stones??[],settings=rules.stones;
 const t=(key:string)=>local(settings.text[key]??rules.labels[key],language);
 const [upload,setUpload]=useState<{uid:string;file:File}>();
 const [active,setActive]=useState<string>();
 const stone=stones.find(item=>item.uid===active);
 const edit=(uid:string,patch:Partial<StoneDraft>)=>onChange(d=>({...d,stones:(d.stones??[]).map(item=>item.uid===uid?{...item,...patch}:item)}));
 function add(){
  const recipe=settings.recipes[0],uid=crypto.randomUUID();
  const entry={uid,name:t('new'),kind:recipe.kind,recipe:recipe.id,amount:recipe.default,group:settings.groups[0].id,rarity:'common'};
  onChange(d=>({...d,stones:[...(d.stones??[]),entry]}));setActive(uid);
 }
 return <section className="surface stone-editor">
  <button className="primary" type="button" disabled={stones.length>=settings.maximum} onClick={add}>{t('add')}</button>
  {stones.length===0&&<p>{t('empty')}</p>}
  {stones.length>0&&<ul className="stone-list">{stones.map(item=><li key={item.uid}>
   <button type="button" className="quiet" aria-pressed={item.uid===active} onClick={()=>setActive(item.uid)}>{item.name||t('new')}</button>
  </li>)}</ul>}
  {stone&&<div className="field-grid">
   <Field label={t('name')}><input maxLength={80} value={stone.name} onChange={e=>edit(stone.uid,{name:e.target.value})}/></Field>
   <Field label={t('mode')}><select value={stone.group} onChange={e=>edit(stone.uid,{group:e.target.value,draftReward:e.target.value==='stone'?stone.draftReward:undefined})}>
    {settings.groups.map((item:any)=><option key={item.id} value={item.id}>{local(item.label,language)}</option>)}
   </select></Field>
   <Field label={t('target')}><select value={stone.kind} onChange={e=>{
    const kind=e.target.value,recipe=settings.recipes.find((item:any)=>item.kind===kind);
    edit(stone.uid,{kind,recipe:recipe.id,amount:recipe.default});
   }}>{settings.targets.map((item:any)=><option key={item.id} value={item.id}>{local(item.label,language)}</option>)}</select></Field>
   <Field label={t('effect')}><select value={stone.recipe} onChange={e=>{
    const recipe=settings.recipes.find((item:any)=>item.id===e.target.value);
    edit(stone.uid,{recipe:recipe.id,amount:recipe.default});
   }}>{settings.recipes.filter((item:any)=>item.kind===stone.kind).map((item:any)=><option key={item.id} value={item.id}>{local(item.label,language)}</option>)}</select></Field>
   {numberField(t('amount'),stone.amount,amount=>edit(stone.uid,{amount}),1,rules.limits.maxNumber)}
   <Field label={t('rarity')}><select value={stone.rarity} onChange={e=>edit(stone.uid,{rarity:e.target.value})}>
    {rules.rarities.filter((item:any)=>['common','rare'].includes(item.value)).map((item:any)=><option key={item.value} value={item.value}>{local(item.label,language)}</option>)}
   </select></Field>
   {stone.group==='stone'&&<Field label={t('draftReward')}><input type="checkbox" checked={!!stone.draftReward} onChange={e=>edit(stone.uid,{draftReward:e.target.checked})}/></Field>}
   <div>{stone.image&&<img className="icon-preview" src={imageUrl(draft.id,stone.image)} alt={t('picture')}/>}
    <label className="upload">{t('picture')}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{
     if(e.target.files?.[0])setUpload({uid:stone.uid,file:e.target.files[0]});e.target.value='';
    }}/></label>
    </div>
   <button type="button" className="quiet danger" onClick={()=>{onChange(d=>({...d,stones:(d.stones??[]).filter(item=>item.uid!==stone.uid)}));setActive(undefined);}}>{t('remove')}</button>
  </div>}
  {upload&&<ArtworkImport file={upload.file} purpose="icon" rules={rules} language={language} onClose={()=>setUpload(undefined)} onApply={async(file,framing)=>{
   const base64=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);
   });
   const result=await request('/projects/'+draft.id+'/image',{base64,framing});
   edit(upload.uid,{image:result.file});
   setUpload(undefined);
  }}/>}
 </section>;
}
// 2026-11-21-1332||codex-clan-editor||clan-creator/src/web/creator/stone-editor.tsx||Crear y editar piedras y losas con tipos de partida, mejoras e iconos desde el asistente
// 2026-11-21-1333||codex-clan-editor||clan-creator/src/web/creator/stone-editor.tsx||Actualizar las recompensas al cambiar entre piedra y losa
// 2026-11-21-1333||codex-clan-editor||clan-creator/src/web/creator/stone-editor.tsx||Mostrar la opción de ofrecer una piedra como recompensa
