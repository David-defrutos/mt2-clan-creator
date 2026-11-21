import React,{useEffect,useId,useRef,useState} from 'react';
export interface SearchOption {value:string;label:string;searchText?:string;help?:string;group?:string;common?:boolean}
export const distinctOptionHelp=(o:SearchOption)=>!!o.help&&o.help.trim().toLocaleLowerCase()!==o.label.trim().toLocaleLowerCase();
const normalize=(s:string)=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase();
export function visibleSearchOptions(options:SearchOption[],query:string,commonFirst=false,showAll=false,value=''){const terms=normalize(query).split(/\s+/).filter(Boolean);return options.filter(o=>terms.every(term=>normalize(o.label+' '+(o.searchText??'')+' '+(o.help??'')+' '+(o.group??'')).includes(term))&&(terms.length||!commonFirst||showAll||o.common||o.value===value));}
export function SearchSelect({value,onChange,options,label,placeholder,searchPlaceholder,emptyText,disabled=false,commonFirst=false,moreLabel=''}:{value:string;onChange:(value:string)=>void;options:SearchOption[];label:string;placeholder:string;searchPlaceholder:string;emptyText:string;disabled?:boolean;commonFirst?:boolean;moreLabel?:string}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0),[showAll,setShowAll]=useState(false),root=useRef<HTMLDivElement>(null),list=useRef<HTMLDivElement>(null),id=useId();
 const selected=options.find(o=>o.value===value),visible=visibleSearchOptions(options,query,commonFirst,showAll,value),hasMore=commonFirst&&!showAll&&!query.trim()&&visible.length<options.length,filtered:SearchOption[]=hasMore?[...visible,{value:'__more__',label:moreLabel}]:visible;
 useEffect(()=>{setActive(query?0:Math.max(0,filtered.findIndex(o=>o.value===value)));},[query,open,value,showAll]);
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{
   if(root.current?.contains(event.target as Node))return;
   const panel=list.current?.getBoundingClientRect();
   if(panel&&event.clientX>=panel.left&&event.clientX<=panel.right&&event.clientY>=panel.top&&event.clientY<=panel.bottom)return;
   setOpen(false);
  };
  document.addEventListener('pointerdown',outside);
  return()=>document.removeEventListener('pointerdown',outside);
 },[]);
 useEffect(()=>{
  const panel=list.current;
  const option=panel?.querySelector('[data-option-index="'+Math.min(active,filtered.length-1)+'"]');
  if(!open||!panel||!option)return;
  const bounds=panel.getBoundingClientRect(),row=option.getBoundingClientRect();
  if(row.top<bounds.top)panel.scrollTop+=row.top-bounds.top;
  else if(row.bottom>bounds.bottom)panel.scrollTop+=row.bottom-bounds.bottom;
 },[active,open,filtered.length]);
 const begin=()=>{setQuery('');setShowAll(false);setOpen(true);};
 const choose=(option:SearchOption)=>{if(option.value==='__more__'){setShowAll(true);return;}onChange(option.value);setOpen(false);setQuery('');};
 return <div className={'search-select '+(open?'is-open':'')} ref={root}><div className="search-select-control"><input role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open&&filtered[active]?id+'-'+active:undefined} autoComplete="off" disabled={disabled} value={open?query:selected?.label??''} placeholder={open?searchPlaceholder:placeholder} onFocus={()=>{if(!open)begin();}} onClick={()=>{if(!open)begin();}} onChange={e=>{setQuery(e.target.value);setOpen(true);}} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!open){begin();setActive(0);}else setActive(n=>filtered.length?(n+(e.key==='ArrowDown'?1:-1)+filtered.length)%filtered.length:0);}else if(e.key==='Enter'&&open){e.preventDefault();if(filtered[active])choose(filtered[active]);}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false);}else if(e.key==='Tab')setOpen(false);}}/><span aria-hidden="true">▾</span></div>{open&&<div role="listbox" aria-label={label} id={id} className="search-select-options" ref={list}>{filtered.length?filtered.map((o,i)=><React.Fragment key={o.value}>{o.group&&o.group!==filtered[i-1]?.group&&<div className="search-option-group" role="presentation">{o.group}</div>}<div role="option" aria-label={o.label} aria-describedby={distinctOptionHelp(o)?id+'-help-'+i:undefined} data-option-index={i} id={id+'-'+i} aria-selected={o.value===value} className={(i===active?'active':'')+(o.value==='__more__'?' show-more-effects':'')} onMouseDown={e=>e.preventDefault()} onClick={e=>{e.preventDefault();choose(o);}}><span>{o.label}{o.value===value&&<span aria-hidden="true"> ✓</span>}</span>{distinctOptionHelp(o)&&<small id={id+'-help-'+i} className="search-option-help">{o.help}</small>}</div></React.Fragment>):<div className="search-select-empty" role="option" aria-disabled="true">{emptyText}</div>}</div>}</div>;
}
// 2026-11-15-1812||codex-clan-editor||clan-creator/src/web/creator/search-select.tsx||Crear un único desplegable con búsqueda integrada, navegación por teclado, cierre al salir y opciones accesibles
// 2026-11-15-1812||codex-clan-editor||clan-creator/src\web\creator\search-select.tsx||Resaltar la opción seleccionada al abrir y restaurar el valor al cancelar
// 2026-11-15-2027||codex-clan-editor||clan-creator/src/web/creator/search-select.tsx||Mostrar explicacion de cada habilidad o efecto dentro de su opcion sin separar buscador y desplegable
// 2026-11-15-2030||codex-clan-editor||clan-creator/src/web/creator/search-select.tsx||Asociar las descripciones de opciones al lector de pantalla
// 2026-11-15-2307||codex-clan-editor||clan-creator/src/web/creator/search-select.tsx||No duplicar la etiqueta como explicacion en las opciones del desplegable
// 2026-11-16-2327||codex-clan-editor||clan-creator/src/web/creator/search-select.tsx||Mostrar efectos habituales agrupados y Más efectos dentro del mismo desplegable manteniendo teclado y búsqueda completa
// 2026-11-19-0846||codex-clan-editor||clan-creator/src/web/creator/search-select.tsx||Buscar también en la descripción visible de habilidades y efectos
// 2026-11-19-2140||codex-clan-editor||clan-creator/src/web/creator/search-select.tsx||Mantener abierto el desplegable al desplazar y limitar el ajuste de posición a la navegación por teclado
// 2026-11-19-2142||codex-clan-editor||clan-creator/src/web/creator/search-select.tsx||Mantener la lista abierta cuando el navegador mueve el foco al arrastrar la barra
