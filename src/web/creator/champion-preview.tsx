import {applyCopiedEffectEdits} from '../../server/creator/copied-effect-edits';
import {championBaseDocument} from '../../server/creator/champion-base';
import {reviseEffectDescriptions,reviseMovementDescriptions} from '../../server/creator/template-effect-text';
import {FittedCard} from './fitted-card';
import React,{useState} from 'react';
import type {ChampionDraft} from '../../server/creator/model';
import {removeTemplateEffects} from '../../server/creator/template-effects';
import {applyExampleParameterValues} from '../../server/creator/example-parameter-values';
import {CardPreview} from './card-preview';
import {local,type Language} from './presentation';
export function championPreviewData(champion:ChampionDraft,detail:any,pathIndex:number|null,levelIndex:number,details:Record<string,any>,rules:any={}){
 const card=structuredClone(champion.card),template=detail?structuredClone(detail):{example:{id:'preview-base',document:{cards:[{id:'PreviewCard',effects:['@PreviewSpawn']}],effects:[{id:'PreviewSpawn',name:'CardEffectSpawnMonster',param_character:'@PreviewUnit'}],characters:[{id:'PreviewUnit',starting_status_effects:[],triggers:[]}]},root:{section:'cards',id:'PreviewCard'}},parameters:[]};
 const example=template.example;
 if(example.championPath&&card.pathInTree)example.document=championBaseDocument(example);
 const doc=example.document,root=doc?.cards?.find((c:any)=>c.id===example.root.id);
 if(example.championPath){
  delete example.championPath;
  example.previewIncomplete=false;
 }
 let unavailable=false;
 if(pathIndex!==null){const level=champion.paths[pathIndex]?.levels[levelIndex];if(level){
  card.abilities=[...(card.abilities??[]),...(level.abilities??[])];card.effects=[...card.effects,...level.effects];
  if(level.native){const source=details[level.native.templateId];if(source&&doc&&root){
   if(source.example.simplified?.path)example.simplified=source.example.simplified;
   const extra=structuredClone(source.example.document);applyExampleParameterValues(extra,source.parameters??[],level.native.parameters);
   reviseMovementDescriptions(source.example.document,extra);
   const up=extra.upgrades.find((u:any)=>u.id===level.native!.upgradeId);if(!up)throw Error('Preview path upgrade is unavailable.');up.bonus_damage=level.attack;up.bonus_hp=level.health;up.bonus_size=level.size;
   const previous=structuredClone(extra),removed=removeTemplateEffects(extra,{section:'upgrades',id:up.id},level.native.removedTemplateEffects);if(removed.length)reviseEffectDescriptions(previous,extra,removed,rules);applyCopiedEffectEdits(extra,source.example.document,{section:'upgrades',id:up.id},{...card,copiedEffectEdits:level.native.copiedEffectEdits,removedTemplateEffects:level.native.removedTemplateEffects},rules,source.parameters);
   const ids=new Set(Object.values(extra).flatMap((arr:any)=>arr.map((o:any)=>o.id)).filter(Boolean));const rename=(v:any,field=''):any=>{if(Array.isArray(v))return v.map(x=>rename(x,field));if(v&&typeof v==='object'){if(v.mod_reference)return v;return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,rename(x,k)]));}if(typeof v==='string'&&field==='id'&&ids.has(v))return 'previewPath_'+v;if(typeof v==='string'&&v.startsWith('@')&&ids.has(v.slice(1)))return '@previewPath_'+v.slice(1);return v;};
   for(const [section,items]of Object.entries(extra))doc[section]=[...(doc[section]??[]),...(items as any[]).map(o=>rename(o))];root.initial_upgrades=[...(root.initial_upgrades??[]),'@previewPath_'+up.id];
  }else unavailable=true;
  }else{card.attack+=level.attack;card.health+=level.health;card.size+=level.size;}
 }}
 return {card:{...card,cost:0,rarity:'champion'},template,unavailable};
}
export function ChampionPreview({champion,detail,details,config,language,projectId}:{champion:ChampionDraft;detail:any;details:Record<string,any>;config:any;language:Language;projectId:string}){
 const [selected,setSelected]=useState('base'),[level,setLevel]=useState(0),t=(key:string)=>local(config.rules.usabilityText[key],language);
 const view=championPreviewData(champion,detail,selected==='base'?null:Number(selected),level,details,config.rules);
 return <><div className="champion-preview-controls"><label className="field"><span>{t('previewPath')}</span><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="base">{t('baseStats')}</option>{champion.paths.map((p,i)=><option key={i} value={String(i)}>{p.name||String(i+1)}</option>)}</select></label>{selected!=='base'&&<label className="field"><span>{t('previewLevel')}</span><select value={String(level)} onChange={e=>setLevel(Number(e.target.value))}>{['I','II','III'].map((name,i)=><option key={name} value={String(i)}>{name}</option>)}</select></label>}</div><details className="preview-help"><summary>{t('previewOnly')}</summary><p>{t('baseStatsNote')}</p></details>{view.unavailable&&<p role="status">{t('previewFallback')}</p>}<FittedCard rules={config.rules} language={language}><CardPreview card={view.card} template={view.template} config={config} language={language} projectId={projectId}/></FittedCard></>;
}
// 2026-11-16-2146||codex-clan-editor||clan-creator/src/web/creator/champion-preview.tsx||Previsualizar atributos base o senda y nivel elegidos con efectos editados sin alterar borrador ni duplicar mejoras
// 2026-11-16-2146||codex-clan-editor||clan-creator/src/web/creator/champion-preview.tsx||Mostrar carta completa del campeón con ajuste automático y ampliación
// 2026-11-16-2150||codex-clan-editor||clan-creator/src/web/creator/champion-preview.tsx||Previsualizar sendas también en campeones desde cero y actualizar texto de componentes eliminados
// 2026-11-16-2152||codex-clan-editor||clan-creator/src/web/creator/champion-preview.tsx||No avisar de cálculo desconocido al mostrar atributos base sin una senda seleccionada
// 2026-11-19-2129||codex-clan-editor||clan-creator/src/web/creator/champion-preview.tsx||Conservar las mejoras genuinas del campeón al previsualizar la base
// 2026-11-19-2137||codex-clan-editor||clan-creator/src/web/creator/champion-preview.tsx||Actualizar el texto de movimiento en efectos de senda editados
// 2026-11-20-0901||codex-clan-editor||clan-creator/src/web/creator/champion-preview.tsx||Conservar en la vista previa las mejoras iniciales que sí exporta el campeón
// 2026-11-21-1017||codex-clan-editor||clan-creator/src/web/creator/champion-preview.tsx||Usar parametros de habilidad de la senda en la vista de campeon
// 2026-11-21-1106||codex-clan-editor||clan-creator/src/web/creator/champion-preview.tsx||Mostrar el texto de efectos retenidos al previsualizar una senda simplificada
// 2026-11-21-1316||codex-clan-editor||clan-creator/src/web/creator/champion-preview.tsx||Reflejar en la carta los controles cambiados dentro de una senda
// 2026-11-21-1557||codex-clan-editor||clan-creator/src/web/creator/champion-preview.tsx||Aplicar cantidades por aparición en la vista previa de sendas
