import {GuideLink} from './guide-access';
import {MechanicHelp,helpText} from './mechanic-help';
import React,{useState} from 'react';
import {NumberInput} from './number-input';
import {SearchSelect} from './search-select';
import type {UnitAbility} from '../../server/creator/model';
import type {InheritedAbility} from './inherited-abilities';
import {local,type Language} from './presentation';
export function UnitAbilities({value=[],inherited=[],onChange,onInheritedChange,rules,language,equipment=false}:{value?:UnitAbility[];inherited?:InheritedAbility[];onChange:(value:UnitAbility[])=>void;onInheritedChange?:(key:string,count:number)=>void;rules:any;language:Language;equipment?:boolean}){
 const [chosen,setChosen]=useState(''),t=(key:string)=>local(rules.labels[key],language);
 const text=(value:any):string=>helpText(value,rules,language);
 const definition=(status:string)=>rules.unitAbilities.find((s:any)=>s.status===status)??{label:rules.statusLabels?.[status]??{es:status,en:status},help:{es:'',en:''},fixed:false};
 const options=rules.unitAbilities.filter((s:any)=>!value.some(v=>v.status===s.status)&&!inherited.some(v=>v.status===s.status&&v.count>0)).sort((a:any,b:any)=>text(a.label).localeCompare(text(b.label),language));
 const activeInherited=inherited.filter(a=>a.count>0);
 const selected=options.find((s:any)=>s.status===chosen)??null;
 return <section className="unit-abilities"><h3>{t(equipment?'equipmentAbilities':'abilities')}</h3><p>{t(equipment?'equipmentAbilityHelp':'abilityHelp')}</p>
 {activeInherited.length>0&&<>{activeInherited.map((a,i)=>{const def=definition(a.status);return <div className="ability-row" key={a.key??a.status+'-'+i}><label title={text(def.help)}><strong>{text(def.label)}</strong><MechanicHelp name={text(def.label)} text={text(def.help)} label={t('mechanicHelp')}/>{a.key&&onInheritedChange?(def.fixed?<input type="checkbox" aria-label={text(def.label)+' · '+t('amount')} checked={a.count>0} onChange={e=>onInheritedChange(a.key!,e.target.checked?1:0)}/>:<NumberInput aria-label={text(def.label)+' · '+t('amount')} value={a.count} min={0} max={999} onChange={count=>onInheritedChange(a.key!,count)}/>):<span>{def.fixed?'':' '+a.count}</span>}</label>{a.key&&onInheritedChange?<button className="quiet danger" onClick={()=>onInheritedChange(a.key!,0)}>{t('remove')}</button>:<small title={t('fixedAbilityHelp')}>{t('fixedAbility')}</small>}</div>;})}</>}
 {value.map((a,i)=>{const def=definition(a.status);return <div className="ability-row" key={a.status}><label title={text(def.help)}><strong>{text(def.label)}</strong><MechanicHelp name={text(def.label)} text={text(def.help)} label={t('mechanicHelp')}/>{def.label.en!==def.label.es&&<small> ({def.label.en})</small>}{!def.fixed&&<NumberInput aria-label={text(def.label)+' · '+t('amount')} min={1} max={999} value={a.count} onChange={count=>onChange(value.map((v,n)=>i===n?{...v,count}:v))}/>}</label><button className="quiet danger" onClick={()=>onChange(value.filter((_,n)=>n!==i))}>{t('remove')}</button></div>;})}
 <div className="ability-picker"><SearchSelect label={t('abilities')} value={selected?chosen:''} onChange={setChosen} placeholder={t('addAbility')} searchPlaceholder={t('abilitySearch')} emptyText={t('noAbilitiesFound')} options={options.map((s:any)=>({value:s.status,help:text(s.help),label:text(s.label)+(s.label.en!==s.label.es?' ('+s.label.en+')':'')+(s.provider?' · '+s.provider:''),searchText:[...Object.values(s.label),...(s.aliases??[]),s.provider??''].join(' ')}))}/><button className="secondary" disabled={!selected||value.length>=(rules.limits.maxAbilities??30)} onClick={()=>{if(!selected)return;onChange([...value,{status:chosen,count:1}]);setChosen('');}}>＋ {t('addAbility')}</button></div><GuideLink request={{topic:'abilities',allowed:options.map((option:any)=>option.status),selected:chosen}}/>{selected&&<p className="note" role="status"><strong>{text(selected.label)}: </strong>{text(selected.help)}</p>}</section>;
}
// 2026-11-15-1452||codex-clan-editor||clan-creator/src/web/creator/unit-abilities.tsx||Mostrar capacidades heredadas editables, evitar duplicarlas, ordenar opciones y explicar la capacidad antes de añadirla
// 2026-11-15-1454||codex-clan-editor||clan-creator/src\web\creator\unit-abilities.tsx||Desactivar selecciones que dejan de estar disponibles y respetar el límite de capacidades
// 2026-11-15-1812||codex-clan-editor||clan-creator/src\web\creator\unit-abilities.tsx||Integrar búsqueda y selección de capacidades en un solo desplegable
// 2026-11-15-1820||codex-clan-editor||clan-creator/src\web\creator\unit-abilities.tsx||Permitir eliminar capacidades copiadas de la senda y volver a añadirlas como capacidades propias
// 2026-11-15-1932||codex-clan-editor||clan-creator/src\web\creator\unit-abilities.tsx||Presentar todas las capacidades juntas sin separar las que procedían del ejemplo
// 2026-11-15-2011||codex-clan-editor||clan-creator/src/web/creator/unit-abilities.tsx||Identificar origen Conductor y buscar Skewer por Pierce dentro del desplegable
// 2026-11-15-2027||codex-clan-editor||clan-creator/src/web/creator/unit-abilities.tsx||Explicar capacidades al elegirlas y ofrecer tooltip en todas las capacidades asignadas o copiadas
// 2026-11-15-2117||codex-clan-editor||clan-creator/src/web/creator/unit-abilities.tsx||No mostrar 1 en capacidades fijas heredadas sin control numerico
// 2026-11-21-1344||codex-clan-editor||clan-creator/src/web/creator/unit-abilities.tsx||Contextualizar las capacidades que concede la carta equipada
// 2026-11-21-1930||codex-clan-editor||clan-creator/src/web/creator/unit-abilities.tsx||Dar acceso al glosario desde el selector de capacidades de unidad o equipo
