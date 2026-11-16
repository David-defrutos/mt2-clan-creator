import {effectOptions} from './effect-options';
import {MechanicHelp,effectHelp,helpText} from './mechanic-help';
import {NumberInput} from './number-input';
import {SearchSelect} from './search-select';
import {CardPreview} from './card-preview';
export {CardPreview};
import React,{useEffect,useState} from 'react';
import type {CardDraft,EffectChoice} from '../../server/creator/model';
import {description,imageUrl,local,request,type Language} from './presentation';
export function Field({label,help,children,className='',reviewField}:{label:string;help?:string;children:React.ReactNode;className?:string;reviewField?:string}){return <label className={'field '+className} data-review-field={reviewField}><span>{label}{help&&<span className="help" tabIndex={0} title={help} aria-label={help}>?</span>}</span>{children}</label>;}
export function numberField(label:string,value:number,change:(v:number)=>void,min=0,max=999,help?:string,step=1,reviewField?:string){return <Field key={label} label={label} help={help} reviewField={reviewField}><NumberInput value={value} onChange={change} min={min} max={max} step={step}/></Field>;}
export function parameterLabel(p:any,language:Language,rules:any){const key=p.path.at(-1);const map:Record<string,string>={CardEffectHeal:language==='es'?'Salud restaurada':'Health restored',CardEffectDamage:language==='es'?'Daño':'Damage',CardEffectDraw:language==='es'?'Cartas que se roban':'Cards drawn',CardEffectGainEnergy:language==='es'?'Ember ganado':'Ember gained',CardEffectAddStatusEffect:language==='es'?'Cantidad del estado':'Status amount',RelicEffectChangeFloorCapacity:language==='es'?'Espacio adicional por piso':'Extra capacity per floor',RelicEffectModifyEnergy:language==='es'?'Ember adicional':'Extra ember'};return (p.status?local(rules.statusLabels?.[p.status],language)||p.status:local(rules.exampleExtraParameters?.[p.label]?.[key]??rules.exampleParameterRules?.[p.label],language))||(map[p.label]??(key==='bonus_damage'?(language==='es'?'Ataque adicional':'Extra attack'):key==='bonus_hp'?(language==='es'?'Salud adicional':'Extra health'):language==='es'?'Cantidad del efecto':'Effect amount'));}
export function EffectEditor({effects,onChange,rules,language,t,unit=true}:{effects:EffectChoice[];onChange:(effects:EffectChoice[])=>void;rules:any;language:Language;t:(key:string)=>string;unit?:boolean}){
 const u=(key:string)=>local(rules.usabilityText[key],language);
 return <div className="effect-editor">{effects.map((effect,i)=>{
  const recipe=rules.recipes.find((r:any)=>r.id===effect.recipe),change=(patch:Partial<EffectChoice>)=>onChange(effects.map((e,n)=>i===n?{...e,...patch}:e));
  const effectSelect=<Field label={t('mechanics')}><SearchSelect label={t('mechanics')} value={effect.recipe} placeholder={t('mechanics')} searchPlaceholder={t('effectSearch')} emptyText={t('noEffectsFound')} options={effectOptions(rules,language,unit)} commonFirst moreLabel={local(rules.beginnerText.moreEffects,language)} onChange={id=>{const next=rules.recipes.find((r:any)=>r.id===id);change({recipe:next.id,amount:next.amount,target:unit?(next.target==='enemy'?'enemy':'friendly'):'spell_target',duration:next.durations?.includes(effect.duration??'combat')?effect.duration:'combat'});}}/></Field>;
  return <section className="effect-row guided-effect" key={i} aria-label={u('effectSummary')+' '+(i+1)}><div className="effect-basics">
   {unit?<Field label={t('when')} className="effect-trigger-field"><SearchSelect label={t('when')} value={effect.when} placeholder={t('when')} searchPlaceholder={t('triggerSearch')} emptyText={t('noTriggersFound')} options={rules.triggers.map((r:any)=>({value:r.value,help:helpText(r.help??r.label,rules,language),label:local(r.label,language),searchText:Object.values(r.label).join(' ')}))} onChange={when=>change({when})}/></Field>:<p className="spell-timing">{u('spellWhen')}</p>}
   {effectSelect}
   {recipe?.target!=='none'&&<Field label={t('target')} className="effect-target-field" help={local(rules.targets.find((r:any)=>r.value===effect.target)?.help,language)}><select value={effect.target} onChange={e=>change({target:e.target.value})}>{rules.targets.filter((r:any)=>(!unit||r.value!=='spell_target')&&(effect.duration!=='run'||!r.value.includes('enemy'))).map((r:any)=><option key={r.value} value={r.value}>{local(unit?r.unitLabel:r.label,language)}</option>)}</select></Field>}
   {!recipe?.fixedAmount&&<Field label={t('amount')}><NumberInput min={0} max={999} value={effect.amount} onChange={amount=>change({amount})}/></Field>}
   {recipe?.durations&&<Field label={t('duration')} help={t('durationHelp')}><select value={effect.duration??'combat'} onChange={e=>change({duration:e.target.value as 'combat'|'run',...(e.target.value==='run'&&effect.target.includes('enemy')?{target:'friendly'}:{})})}>{rules.effectDurations.map((d:any)=><option key={d.value} value={d.value}>{local(d.label,language)}</option>)}</select></Field>}
  </div><div className="effect-summary"><p>{unit?local(rules.triggerLabels[effect.when],language)+': ':''}{effectHelp(recipe,rules,language,effect.amount,effect.target)}</p><MechanicHelp name={local(recipe?.label,language)} text={effectHelp(recipe,rules,language,effect.amount,effect.target)} label={t('mechanicHelp')}/></div><button className="quiet danger" onClick={()=>onChange(effects.filter((_,n)=>n!==i))}>{t('removeEffect')}</button></section>;
 })}<button className="secondary" disabled={effects.length>=(rules.limits.maxEffects??20)} onClick={()=>{const r=rules.recipes[0];onChange([...effects,{recipe:r.id,amount:r.amount,target:unit?(r.target==='enemy'?'enemy':'friendly'):'spell_target',when:'on_spawn'}]);}}>＋ {t('addEffect')}</button></div>;
}

export {ExamplePicker} from './example-picker';
// 2026-11-15-0900||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Componentes simples del asistente: campos con ayuda, efectos seleccionables, carta completa y catálogo visual
// 2026-11-15-0907||codex-clan-editor||clan-creator/src\web\creator\components.tsx||Explicar el objetivo exacto de efectos activados por una unidad
// 2026-11-15-0908||codex-clan-editor||clan-creator/src\web\creator\components.tsx||Mostrar toda la información funcional de los ejemplos en su ficha visual
// 2026-11-15-0920||codex-clan-editor||clan-creator/src\web\creator\components.tsx||Nombrar cada cantidad por su efecto o estado, sin nombres de clases
// 2026-11-15-0938||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Etiquetar cantidades secundarias con explicación para principiantes
// 2026-11-15-1019||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Priorizar cartas oficiales, filtrar por clan y representar sus marcos, fondo y placa originales
// 2026-11-15-1027||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Abrir oficiales por defecto solo cuando hay ejemplos del tipo solicitado
// 2026-11-15-1031||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Distinguir el marco original del ejemplo del marco común del nuevo clan y señalar contenido de expansión
// 2026-11-15-1141||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Usar el nuevo componente de carta en el editor y en la selección de ejemplos
// 2026-11-15-1223||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Sustituir el selector largo por un diálogo accesible con detalle y acción fija
// 2026-11-15-1431||codex-clan-editor||clan-creator/src\web\creator\components.tsx||Ampliar selectores con búsqueda y 51 efectos y 36 activaciones nativas descritas
// 2026-11-15-1450||codex-clan-editor||clan-creator/src\web\creator\components.tsx||Aplicar edición numérica estable en atributos, parámetros y cantidades de efectos
// 2026-11-15-1452||codex-clan-editor||clan-creator/src\web\creator\components.tsx||Informar si la búsqueda no encuentra efectos e impedir añadir uno ajeno a la búsqueda
// 2026-11-15-1454||codex-clan-editor||clan-creator/src\web\creator\components.tsx||No permitir añadir efectos que superen el límite guardable del proyecto
// 2026-11-15-1812||codex-clan-editor||clan-creator/src\web\creator\components.tsx||Integrar búsqueda en los desplegables de efectos y activaciones y retirar el buscador externo
// 2026-11-15-1826||codex-clan-editor||clan-creator/src\web\creator\components.tsx||Seleccionar duración sin alterar objetivos ni activaciones y restablecerla al cambiar a un efecto incompatible
// 2026-11-15-1830||codex-clan-editor||clan-creator/src\web\creator\components.tsx||Reservar mejoras entre anillos para unidades aliadas con carta persistente
// 2026-11-15-1932||codex-clan-editor||clan-creator/src\web\creator\components.tsx||Eliminar consejo repetido sobre copiar ejemplos dentro de cada bloque de efectos
// 2026-11-15-2027||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Explicar efectos seleccionados y dar ayuda en opciones de efectos y activaciones
// 2026-11-15-2028||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Evitar dos iconos de ayuda para el mismo efecto y conservar explicacion visible
// 2026-11-15-2107||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Ofrecer destinatario del hechizo por defecto con ayuda y reservarlo a efectos de hechizos
// 2026-11-15-2307||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Dar fila completa a activacion y destinatario para que las opciones no se compriman en 100 pixeles
// 2026-11-16-2147||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Agrupar cada efecto por activación acción objetivo cantidad y duración con resumen único y ayuda bajo demanda
// 2026-11-16-2324||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Permitir identificar campos concretos para reparación guiada de avisos
// 2026-11-16-2327||codex-clan-editor||clan-creator/src/web/creator/components.tsx||Usar grupos de efectos frecuentes en la búsqueda integrada sin cambiar las recetas guardadas
