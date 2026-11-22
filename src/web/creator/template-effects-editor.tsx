import {triggerLabel,triggerOption} from '../../server/creator/trigger-reference';
import {applyOccurrenceParameters,copiedEffectControls,isSharedEffect,occurrenceParameters} from '../../server/creator/copied-effect-edits';
import type {CopiedEffectEdit} from '../../server/creator/model';
import {gameText} from '../../server/creator/description-tokens';
import {applyExampleParameterValues} from '../../server/creator/example-parameter-values';
import {CopiedEffectReplacement} from './copied-effect-replacement';
import React from 'react';
import type {CardDraft} from '../../server/creator/model';
import {isActivatedCard,templateEffects,activeTemplateEffects,removeTemplateEffects,type TemplateEffect} from '../../server/creator/template-effects';
import {nativeEffectText,relicActivationText,reviseEffectDescriptions,reviseMovementDescriptions} from '../../server/creator/template-effect-text';
import {removeUnitAuras} from '../../server/creator/unit-auras';
import {referencedParameters} from './champion-copy';
import {Field,numberField,parameterHelp,parameterLabel} from './components';
import {local,type Language} from './presentation';
export function templateEffectParameterKeys(template:any,root=template?.example?.root){return new Set(template?templateEffects(template.example.document,root).flatMap(e=>referencedParameters(template,e.section,e.id).map((p:any)=>p.key)):[]);}
export function TemplateEffectsEditor({card,template,onChange,rules,language,root=template?.example?.root,abilityKeys}:{card:CardDraft;template:any;onChange:(card:CardDraft)=>void;rules:any;language:Language;root?:{section:string;id:string};abilityKeys?:ReadonlySet<string>}){if(!template)return null;const original=template.example.document,current=structuredClone(original);applyExampleParameterValues(current,template.parameters??[],card.parameters);removeUnitAuras(current,template.example.root,card.removedAuras);reviseMovementDescriptions(original,current,rules);const removed=removeTemplateEffects(current,root!,card.removedTemplateEffects);if(removed.length)reviseEffectDescriptions(original,current,removed,rules);const rows=activeTemplateEffects(original,current,root!,card.removedTemplateEffects),owners=new Map<string,string>();for(const e of rows)for(const p of referencedParameters(template,e.section,e.id))owners.set(p.key,e.key);
 const g=(key:string)=>local(rules.guidedText[key],language),t=(key:string)=>local(rules.labels[key],language);
 const targets=rules.nativeTargetLabels??{};
 const definition=(row:TemplateEffect)=>current[row.section]?.find((item:any)=>item.id===row.id);
 const find=(section:string,reference:unknown)=>{
  const id=typeof reference==='string'?reference:reference&&typeof reference==='object'&&'id' in reference?reference.id:undefined;
  return typeof id==='string'?current[section]?.find((item:any)=>item.id===id.replace(/^@/,'')):undefined;
 };
 const children=(row:TemplateEffect)=>rows.filter(child=>child.parent===row.key);
 const attachments=new Map<string,TemplateEffect[]>();
 for(const row of rows){
  const effect=definition(row);
  if(effect?.name!=='CardEffectAttachTrainRoomAttachment')continue;
  const upgrade=find('upgrades',effect.param_upgrade),triggers=children(row);
  const triggersOnly=upgrade?.trigger_upgrades?.length&&Object.keys(upgrade).every(key=>[
   'id','titles','descriptions','trigger_upgrades','hide_icon_on_card','show_description_on_cards','persistent_vfx','icon','skip_default_status_effect_notification','filters',
  ].includes(key));
  if(triggersOnly&&triggers.length&&triggers.every(trigger=>trigger.section==='character_triggers'&&children(trigger).length)){
   attachments.set(row.key,triggers.flatMap(children));
  }
 }
 const hidden=new Set([...attachments.keys()]);
 for(const row of rows){
  if(row.parent&&attachments.has(row.parent)||row.section==='traits'&&row.definition.name==='CardTraitShowCardTargets')hidden.add(row.key);
  if(row.section==='room_modifiers'&&children(row).some(child=>child.field==='param_effects'))hidden.add(row.key);
  if(['character_triggers','card_triggers'].includes(row.section)&&children(row).length&&
   !(template.parameters??[]).some((p:any)=>p.section===row.section&&p.id===row.id))hidden.add(row.key);
 }
 return <>{rows.filter(row=>!hidden.has(row.key)).map(e=>{
 const occurrence=card.copiedEffectEdits?.[e.key]?.parameters;
 const base=definition(e),d=occurrence&&base?structuredClone(base):base;
 const group=['character_triggers','card_triggers'].includes(e.section)||e.section==='relic_effects'&&children(e).some(child=>child.field==='param_effects');
 const shared=e.section==='effects'&&isSharedEffect(original,e.id);
 const scoped=shared?occurrenceParameters(original,e,template.parameters??[]):[];
 const actionDoc=occurrence?{...current,upgrades:[...(current.upgrades??[])]}:current;
 if(occurrence&&d)applyOccurrenceParameters(actionDoc,d,scoped,occurrence);
 const parent=rows.find(row=>row.key===e.parent),owner=parent&&definition(parent);
 const attachment=parent&&rows.find(row=>row.key===parent.parent&&attachments.has(row.key));
 const roomEffect=attachment&&definition(attachment);
 const roomUpgrade=roomEffect&&find('upgrades',roomEffect.param_upgrade);
 const controls=copiedEffectControls(card.kind,original,root!,e,rules,card.copiedEffectEdits?.[e.key]);
 const edited=card.copiedEffectEdits?.[e.key];
 const change=(patch:CopiedEffectEdit,key=e.key)=>onChange({...card,copiedEffectEdits:{
  ...card.copiedEffectEdits,[key]:{...card.copiedEffectEdits?.[key],...patch},
 }});
 const parentControls=parent&&copiedEffectControls(card.kind,original,root!,parent,rules,card.copiedEffectEdits?.[parent.key]);
 const timingRow=parent&&hidden.has(parent.key)&&parentControls?.times.length?parent:e;
 const timingControls=timingRow===e?controls:parentControls!;
 const selectedTiming=card.copiedEffectEdits?.[timingRow.key]?.when??timingControls.when;
 const sharedTiming=!!parent&&['character_triggers','card_triggers','room_modifiers'].includes(parent.section)&&children(parent).length>1;
 const editedRecipe=controls.recipes.find((recipe:any)=>recipe.id===edited?.recipe);
 const triggerText=(value:unknown)=>{
  const known=triggerLabel(value,rules,language);
  if(known||!value||typeof value!=='object'||!('id' in value))return known;
  const id=String(value.id).replace(/^@/,'');
  const external=template.example.externalResources?.find((resource:any)=>resource.id===id&&resource.section.endsWith('trigger_types'));
  return external?.names?.[language==='es'?'spanish':'english']??external?.names?.english??id;
 };
 const trigger=triggerText(edited?.when??d?.trigger);
 const source=find(e.ownerSection,e.ownerId);
 const spell=e.ownerSection==='cards'&&e.field==='effects'&&source?.card_type==='spell';
 const ability=spell&&isActivatedCard(current,source);
 const relicAction=e.ownerSection==='relic_effects'&&e.field==='param_effects';
 const relicTiming=relicActivationText(current,relicAction?owner:e.section==='relic_effects'?d:undefined,language,rules);
 const timing=relicTiming||trigger||triggerText(parent&&card.copiedEffectEdits?.[parent.key]?.when||owner?.trigger)||local(rules.nativeRoomTiming?.[d?.name],language)||local(rules.nativeRoomTiming?.[owner?.name],language)
  ||(d?.name==='CardEffectAttachEquipment'?g('whenEquipped'):'')||(ability?g('abilityActivation'):spell?local(rules.usabilityText.spellWhen,language):'');
 const nestedEffects=e.section==='room_modifiers'&&Array.isArray(d?.param_effects)
  ?d.param_effects.map((ref:string)=>find('effects',ref)).filter(Boolean):[];
 const sameRoomTeam=nestedEffects.length&&nestedEffects.every((effect:any)=>effect.target_mode==='room'
  &&effect.target_team===nestedEffects[0].target_team&&!effect.param_card_filter&&!effect.param_card_upgrade_mask&&!effect.target_subtype)
  ?nestedEffects[0].target_team:undefined;
 const team=d?.target_mode==='self'&&roomEffect&&!roomUpgrade?.filters?.length?roomEffect.target_team
  :d?.target_mode==='room'?d.target_team
  :d?.name==='RoomStateAddStatusEffectOnEnemyEnter'?'heroes':sameRoomTeam;
 let targetMode=d?.target_mode;
 if(spell&&template.example.simplified&&targetMode==='last_targeted_characters'){
  const refs=source.effects??[],position=refs.indexOf('@'+e.id);
  const selector=refs.slice(0,position).map((ref:string)=>find('effects',ref)).reverse()
   .find((effect:any)=>effect?.target_mode!=='last_targeted_characters'&&effect?.target_team!=='none');
  if(selector?.target_mode==='drop_target_character'&&selector.target_team===d.target_team)targetMode=selector.target_mode;
 }
 const target=!group&&d?.target_team!=='none'&&!d?.param_card_filter&&!d?.param_card_upgrade_mask&&!d?.target_subtype
  ?local(rules.nativeRoomTeams?.[team],language)||local(targets[targetMode],language):'';
 const related=source?.[e.field];
 const description=source?.descriptions?.[language==='es'?'spanish':'english'];
 const describesOneRule=related?.length===1&&(
  e.ownerSection==='cards'&&e.field==='effects'||e.ownerSection==='relics'&&e.field==='relic_effects');
 const fromCard=describesOneRule&&typeof description==='string'
  ?gameText(description,current,{section:e.ownerSection,definition:source},language,rules):'';
 const nativeText=nativeEffectText(actionDoc,e.section,d,language,rules);
 const resolved=group&&timing&&nativeText.startsWith(timing+': ')?nativeText.slice(timing.length+2):nativeText;
 const capsule=resolved===t('specialEffect')||resolved.startsWith(t('specialEffect')+':');
 const isEquipmentAttachment=d?.name==='CardEffectAttachEquipment'&&e.ownerId===root?.id;
 const caption=(isEquipmentAttachment&&local(rules.nativeEffectLabels?.CardEffectAttachEquipment,language))||local(editedRecipe?.label,language)||((d?.name==='CardEffectAttachTrainRoomAttachment'||capsule)&&fromCard)||resolved;
 const removeKey=attachment&&attachments.get(attachment.key)?.length===1?attachment.key:e.key;
 const available=shared?scoped:referencedParameters(template,e.section,e.id);
 const parameters=editedRecipe?[]:available.filter((p:any)=>(shared||owners.get(p.key)===e.key)&&!abilityKeys?.has(p.key));
 const nestedReplacement=controls.recipes.length>0;
 return <section className="native-effect-card guided-effect" data-nested={!!e.parent&&!attachment} key={e.key}><div className="effect-basics">
 {(timing||timingControls.times.length>1)&&<Field label={t('when')} guide={{topic:'timings',variant:timingRow.section==='room_modifiers'?'room':timingRow.section==='character_triggers'?'unit':'spell',allowed:timingControls.times.map((option:any)=>option.value),selected:selectedTiming??(ability?'activate_ability':isEquipmentAttachment?'equip_card':undefined)}} help={[local(triggerOption(selectedTiming??owner?.trigger??d?.trigger,rules)?.help,language),relicAction?g('sharedRelicTiming'):sharedTiming?g('sharedTriggerTiming'):''].filter(Boolean).join(' ')}>{timingControls.times.length>1?
  <select value={selectedTiming} onChange={event=>change({when:event.target.value},timingRow.key)}>
   {timingControls.times.map((option:any)=><option key={option.value} value={option.value}>{local(option.label,language)}</option>)}
  </select>:<span className="fixed-effect-value">{timing}</span>}</Field>}
 {(!group||!children(e).length&&caption&&caption!==timing)&&<Field label={t('mechanics')} guide={{topic:e.section==='traits'?'properties':'effects',allowed:controls.recipes.map((recipe:any)=>recipe.id),selected:editedRecipe?.id??(typeof d?.name==='string'?d.name:undefined)}}>{nestedReplacement?<CopiedEffectReplacement card={card} effectKey={removeKey} when={selectedTiming??'on_spawn'}
  caption={caption} rules={rules} language={language} onChange={onChange} allowedRecipes={controls.recipes.map((recipe:any)=>recipe.id)}
  onSelect={recipe=>change({recipe:recipe.id,amount:recipe.amount,parameters:undefined,
   ...(recipe.target==='none'?{target:undefined}:{}),...(recipe.castOnly?{when:undefined}:{})})}/>:  <span className="fixed-effect-value">{caption}</span>}</Field>}
 {(target||controls.targets.length>0)&&editedRecipe?.target!=='none'&&<Field label={t('target')} guide={{topic:'targets',variant:controls.unitTarget?(card.kind==='equipment'?'equipment':'unit'):'spell',allowed:controls.targets.map((option:any)=>option.value),selected:edited?.target??controls.target}}>{controls.targets.length>0?
  <select value={edited?.target??controls.target} onChange={event=>change({target:event.target.value})}>
   {controls.targets.map((option:any)=><option key={option.value} value={option.value}>{option.value==='friendly'&&controls.unitTarget&&card.kind==='equipment'?g('equippedUnit'):option.value==='friendly'&&roomEffect&&target?target:local(controls.unitTarget?option.unitLabel:option.label,language)}</option>)}
  </select>:<span className="fixed-effect-value">{target}</span>}</Field>}
 {e.definition.target_mode==='last_targeted_characters'&&d?.target_mode!=='last_targeted_characters'&&
  <p className="note">{g('preservedEffectTarget')}</p>}
 </div>{relicAction&&!timing&&<p className="note">{g('sharedRelicTiming')}</p>}{editedRecipe&&!editedRecipe.fixedAmount&&numberField((editedRecipe.castOnly&&local(rules.exampleParameterRules[editedRecipe.class],language))||t('amount'),edited?.amount??editedRecipe.amount,amount=>change({amount}),editedRecipe.minimumAmount??0,rules.limits.maxNumber)}{parameters.map((p:any,i:number)=>{
  const value=edited?.parameters?.[p.key]??card.parameters[p.key]??p.value;
  const set=(value:number)=>shared?change({parameters:{...edited?.parameters,[p.key]:value}}):
   onChange({...card,parameters:{...card.parameters,[p.key]:value}});
  const help=parameterHelp(p,language,rules);
  if(p.choices)return <Field key={p.key} help={help} label={p.boolean?g('abilityFloor'):p.choiceKeywords||p.choiceLabels?parameterLabel(p,language,rules):t('movementDestination')}>
   <select value={value} onChange={event=>set(Number(event.target.value))}>
    {p.choices.map((value:number)=><option key={value} value={value}>{p.boolean?g(value===0?'abilityCurrentFloor':'abilityAnyFloor'):
     (p.choiceLabels?local(p.choiceLabels[value],language):local(rules.statusLabels[p.choiceKeywords?.[value]??(value===0?'advance':'retreat')],language))||String(value)}</option>)}
   </select>
  </Field>;
  const label=p.label==='ability'?g(p.path[0]==='initial_cooldown'?'abilityInitialCooldown':'abilityCooldown'):parameterLabel(p,language,rules)+(i?' · '+(i+1):'');
  return numberField(label,value,set,p.minimum??-rules.limits.maxNumber,p.maximum??rules.limits.maxNumber,help);
 })}<details className="native-edit-help"><summary>{local(rules.usabilityText.learnMore,language)}</summary><p>{g('nativeFixed')}</p></details>{!isEquipmentAttachment&&<button className="quiet danger" onClick={()=>onChange({...card,removedTemplateEffects:[...(card.removedTemplateEffects??[]),removeKey]})}>{local(rules.labels.removeEffect,language)}</button>}</section>;})}</>;
}
// 2026-11-15-2048||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar cada componente copiado con controles propios y eliminacion independiente en cartas y sendas
// 2026-11-17-0024||codex-clan-editor||clan-creator/src\web\creator\template-effects-editor.tsx||Alinear efectos copiados con cuándo qué quién y cantidad explicando condiciones nativas no editables sin alterar comportamiento
// 2026-11-17-0028||codex-clan-editor||clan-creator/src\web\creator\template-effects-editor.tsx||Leer objetivos nativos desde configuración bilingüe
// 2026-11-19-2137||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Permitir elegir Advance o Retreat en el efecto existente
// 2026-11-19-2138||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mantener el texto del control alineado con el movimiento elegido
// 2026-11-19-2211||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar cuándo y a quién solo si la carta tiene un disparador u objetivo reconocibles
// 2026-11-19-2213||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Indicar que los efectos directos de un hechizo se activan al jugarlo
// 2026-11-19-2214||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar activación objetivo y cantidad en el efecto de sala real y agrupar los contenedores sin acciones propias
// 2026-11-19-2215||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Resolver el equipo objetivo desde los efectos de sala cuando comparten un mismo destino
// 2026-11-19-2216||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Reusar el texto comprobable de la carta si solo hay un efecto y dar a cada efecto de sala su propia fila
// 2026-11-19-2216||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Evitar que una selección por subtipo se muestre como un objetivo genérico de piso
// 2026-11-19-2221||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Explicar en la fila que se conserva directamente la selección del efecto eliminado
// 2026-11-21-1018||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Editar habilidades activadas en su ficha y ofrecer sustitucion individual a efectos que admiten el editor guiado
// 2026-11-21-1247||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar el destinatario de la carta en cadenas simplificadas con la misma selección directa
// 2026-11-21-1256||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Editar activación, acción y objetivo en las filas compatibles de efectos copiados
// 2026-11-21-1318||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Poner los tres controles en la fila real del efecto de sala y sus equivalentes nativos
// 2026-11-21-1320||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar el disparador junto a la acción que ejecuta y explicar las activaciones compartidas
// 2026-11-21-1341||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar Accursed en el campo de activación y nombrar la unidad que lleva el equipo
// 2026-11-21-1342||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Distinguir los efectos editables del paso estructural de equipar la carta
// 2026-11-21-1344||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Evitar duplicar cantidades de capacidades de equipo en los dos bloques
// 2026-11-21-1508||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Utilizar la edición en posición también desde el selector de hechizos
// 2026-11-21-1510||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Explicar la activación compartida incluso cuando es fija y omitir falsos destinatarios de cartas auxiliares
// 2026-11-21-1557||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Permitir cambiar la cantidad de cada disparador compartido desde su propia fila
// 2026-11-21-1558||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar en la etiqueta de acción la cantidad propia de esa fila
// 2026-11-21-1619||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Usar los mismos parámetros por aparición que valida el servidor y mostrar la mejora actualizada
// 2026-11-21-1825||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar la acción real y quitar el texto duplicado de las activaciones copiadas
// 2026-11-21-1902||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Ocultar el contador auxiliar de selección sin retirar su comportamiento
// 2026-11-21-1905||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar los valores posibles de fase lunar y desplazamiento con sus nombres
// 2026-11-21-1930||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Enlazar las guías también desde los efectos copiados y sus activaciones
// 2026-11-21-1932||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Resaltar las activaciones fijas de habilidades y equipo desde sus guías
// 2026-11-21-1946||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Abrir la guía de propiedades desde los rasgos de ejemplos copiados
// 2026-11-21-1949||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Usar el texto del artefacto cuando una única regla nativa carece de nombre específico
// 2026-11-21-2014||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar activación de habilidad, recargas y las acciones separadas de una regla de artefacto
// 2026-11-21-2015||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar el momento del artefacto en sus acciones hijas y evitar repetirlas en la fila del contenedor
// 2026-11-21-2016||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar los textos de condiciones cambiadas junto a los controles
// 2026-11-22-0956||codex-clan-editor||clan-creator/src/web/creator/template-effects-editor.tsx||Mostrar el desplegable de destino y las ayudas por campo
