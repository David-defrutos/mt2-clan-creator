import React,{useMemo,useState} from 'react';
import {filterGuideEntries,guideEntries,guideFacets,guideTopics,isGuideOptionAvailable,type GuideRequest,type GuideTopic} from './guide-catalog';
import {local,type Language} from './presentation';

export function guideHref(topic:GuideTopic){
 return '?guide='+topic;
}

export function GuidePage({request,rules,language,onTopic,onClose}:{
 request:GuideRequest;rules:any;language:Language;onTopic?:(topic:GuideTopic)=>void;onClose?:()=>void;
}){
 const copy=rules.mechanicGuide,topic=request.topic;
 const t=(key:string)=>local(copy[key],language);
 const page=copy.pages[topic];
 const entries=useMemo(()=>guideEntries(topic,rules,language),[topic,rules,language]);
 const contextual=entries.some(entry=>isGuideOptionAvailable(entry,request));
 const [query,setQuery]=useState('');
 const [facets,setFacets]=useState<Record<string,string>>({});
 const [availableOnly,setAvailableOnly]=useState(contextual);
 const reset=()=>{setQuery('');setFacets({});setAvailableOnly(contextual);};
 const optionsFor=(facet:(typeof guideFacets)[GuideTopic][number])=>[...new Set(
  entries.filter(entry=>!availableOnly||isGuideOptionAvailable(entry,request)).flatMap(entry=>entry.facets[facet]??[]),
 )].filter(Boolean).sort((a,b)=>a.localeCompare(b,language));
 const visible=filterGuideEntries(entries,request,query,facets,availableOnly);
 return <main className="guide-page">
  <header className="guide-top">
   <strong>MT2 Clan Creator <span>· {t('title')}</span></strong>
   {onClose?<button className="secondary" type="button" onClick={onClose}>← {t('returnToField')}</button>:
    <a href="/">← {t('close')}</a>}
  </header>
  <div className="guide-content">
   <nav aria-label={t('navigation')} className="guide-topics">
    {guideTopics.map(id=><a key={id} href={guideHref(id)} aria-current={id===topic?'page':undefined} onClick={event=>{
     if(onTopic&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){
      event.preventDefault();
      onTopic(id);
     }
    }}>{local(copy.pages[id].title,language)}</a>)}
   </nav>
   <h1 id="guide-title">{local(page.title,language)}</h1>
   <p className="guide-intro">{local(page.intro,language)}</p>
   <div className="guide-filters">
    <label className="field guide-search"><span>{t('search')}</span><input type="search" autoFocus value={query} onChange={event=>setQuery(event.target.value)}/></label>
    {guideFacets[topic].map(facet=>{
     const options=optionsFor(facet);
     return options.length>0&&<label className="field" key={facet}>
      <span>{local(copy.facets[facet],language)}</span>
      <select value={facets[facet]??''} onChange={event=>setFacets({...facets,[facet]:event.target.value})}>
       <option value="">{t('all')}</option>
       {options.map(option=><option value={option} key={option}>{option}</option>)}
      </select>
     </label>;
    })}
   </div>
   <div className="guide-results-bar">
    {contextual&&<label><input type="checkbox" checked={availableOnly} onChange={event=>{
     setAvailableOnly(event.target.checked);
     setFacets({});
    }}/> {t('available')}</label>}
    <p role="status">{visible.length===1?t('oneResult'):t('results').replace('{count}',String(visible.length))}</p>
    {(query||Object.values(facets).some(Boolean))&&<button type="button" className="quiet" onClick={reset}>{t('clear')}</button>}
   </div>
   {visible.length===0?<div className="guide-empty">
    <p>{t('empty')}</p>
    {availableOnly&&<button type="button" className="secondary" onClick={()=>{setAvailableOnly(false);setFacets({});}}>{t('viewAll')}</button>}
   </div>:<ul className="guide-results">{visible.map(entry=>{
    const current=entry.value===request.selected&&(!request.variant||!entry.variant||entry.variant===request.variant||
     isGuideOptionAvailable(entry,request));
    const badges=[...new Set([
     ...(entry.facets.category??[]),...(entry.facets.scope??[]),...(entry.facets.duration??[]),
     ...(entry.facets.amount??[]),...(entry.facets.source??[]),
    ])];
    return <li className={current?'guide-entry guide-current':'guide-entry'} key={entry.id}>
     <div className="guide-entry-title"><h2>{entry.name}</h2>{current&&<span>{t('current')}</span>}</div>
     {entry.text&&<p>{entry.text}</p>}
     {badges.length>0&&<ul className="guide-entry-tags">
      {badges.map(badge=><li key={badge}>{badge}</li>)}
     </ul>}
    </li>;
   })}</ul>}
   {topic==='effects'&&!availableOnly&&<p className="guide-note">{t('catalogNotice')}</p>}
  </div>
 </main>;
}
// 2026-11-21-1930||codex-clan-editor||clan-creator/src/web/creator/guide-page.tsx||Mostrar una página propia por tema con búsqueda, filtros y opciones disponibles en contexto
// 2026-11-21-1934||codex-clan-editor||clan-creator/src/web/creator/guide-page.tsx||Distinguir las etiquetas de los filtros de los metadatos de los resultados
