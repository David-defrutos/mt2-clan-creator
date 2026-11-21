import React from 'react';
import type {ClanArtDesign} from '../../server/creator/model';
import {imageUrl,local,type Language} from './presentation';

export interface ArtStylePreset {
 id:string;
 group:'official'|'community';
 label:{en:string;es:string};
 referenceExample:string;
 additionalExamples?:string[];
 style:string|{en:string;es:string};
 palette:string|{en:string;es:string};
}

interface StyleExample {
 id:string;
 names:{english?:string;spanish?:string};
 picture?:string;
}

export function designFromStyle(preset:ArtStylePreset,items:StyleExample[],rules:any,language:Language):ClanArtDesign {
 const promptLanguage=preset.group==='community'?'en':language;
 return {
  style:local(preset.style,promptLanguage),
  palette:local(preset.palette,promptLanguage),
  avoid:local(rules.aiArt.defaultAvoid,promptLanguage),
  reference:items.find(item=>item.id===preset.referenceExample)?.picture||undefined,
 };
}

export function artStyleReferences(preset:ArtStylePreset,items:StyleExample[]) {
 return [preset.referenceExample,...(preset.additionalExamples??[])].flatMap(id=>{
  const example=items.find(item=>item.id===id);
  return example?.picture?[example]:[];
 });
}

export function ArtStylePicker({design,items,projectId,rules,language,onSelect}:{
 design:ClanArtDesign;items:StyleExample[];projectId:string;rules:any;language:Language;onSelect:(design:ClanArtDesign)=>void;
}){
 const t=(key:string)=>local(rules.simpleArtText[key],language);
 const presets:ArtStylePreset[]=rules.aiArt.presets;
 return <>{(['official','community'] as const).map(group=><section className="art-style-group" key={group}>
  <h4>{t(group==='official'?'officialStyles':'communityStyles')}</h4>
  <div className="art-preset-grid">{presets.filter(preset=>preset.group===group).map(preset=>{
   const example=items.find(item=>item.id===preset.referenceExample);
   if(!example?.picture)return null;
   const selection=designFromStyle(preset,items,rules,language);
   const selected=design.reference===example.picture&&design.style===selection.style;
   return <button key={preset.id} className="secondary art-preset" aria-pressed={selected} onClick={()=>onSelect(selection)}>
    <img src={imageUrl(projectId,example.picture)} alt="" loading="lazy"/>
    <strong>{local(preset.label,language)}</strong>
    <small>{(language==='es'?example.names.spanish:example.names.english)??example.names.english}</small>
   </button>;
  })}</div>
 </section>)}</>;
}
// 2026-11-21-1029||codex-clan-editor||clan-creator/src/web/creator/art-style-picker.tsx||Agrupar estilos oficiales y comunitarios con ilustraciones existentes y seleccionar el texto completo
