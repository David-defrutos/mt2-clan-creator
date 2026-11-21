import {parameterKeywordOptions} from './example-parameter-values.js';
import {triggerLabel} from './trigger-reference.js';
import {statusAmount} from './status-text.js';
import {gameText} from './description-tokens.js';
import {unitStatusKey} from './model.js';
import {runsRelicActions,templateEffects,type TemplateEffect} from './template-effects.js';
const text=(value:any,language:string):string=>typeof value==='string'?value:value?.[language==='es'?'spanish':'english']??value?.english??'';
const label=(value:any,language:string):string=>typeof value==='string'?value:value?.[language]??value?.en??'';
const id=(ref:any)=>String(typeof ref==='object'?ref?.id:ref).replace(/^@/,'');
export const splitDescription=(value:string)=>value.split(/<br\s*\/?>|[\r\n]+|(?<=[.!?])\s+|(?<=[。！？])\s*/i).filter(Boolean);
export const generatedLocales={english:'en',spanish:'es'} as const;
function reviseKeywordOptions(original:Record<string,any[]>,current:Record<string,any[]>){
 for(const [className,keywords] of Object.entries(parameterKeywordOptions)){
  const section=className.startsWith('CardTrait')?'traits':'effects';
  const source=new Map((original[section]??[]).filter(row=>row.name===className&&keywords[row.param_int])
   .map(row=>[row.id,keywords[row.param_int]]));
  const changes=new Map((current[section]??[]).filter(row=>row.name===className&&source.has(row.id)&&keywords[row.param_int]&&
   source.get(row.id)!==keywords[row.param_int]).map(row=>[row.id,keywords[row.param_int]]));
  if(!changes.size)continue;
  const pattern=new RegExp('\\[('+Object.values(keywords).join('|')+')\\]','gi');
  function rewrite(text:Record<string,unknown>|undefined,refs:string[]){
   if(!text||!refs.some(ref=>changes.has(ref)))return;
   for(const [locale,value] of Object.entries(text)){
    if(locale==='key'||typeof value!=='string')continue;
    const found=[...value.matchAll(pattern)].map(match=>match[1].toLowerCase());
    if(found.length!==refs.length||!found.every((keyword,index)=>keyword===source.get(refs[index])))continue;
    let index=0;
    const revised=value.replace(pattern,match=>{
     const next=changes.get(refs[index++]);
     return next?'['+next+']':match;
    });
    if(revised!==value){text[locale]=revised;delete text.key;}
   }
  }
  for(const definitions of Object.values(current))for(const owner of definitions){
   const refs=section==='traits'?(owner.traits??owner.trait_upgrades):
    (owner.trigger_effects??owner.effects??owner.param_effects);
   if(Array.isArray(refs))rewrite(owner.descriptions,refs.map(id).filter(ref=>source.has(ref)));
   if(section==='traits'&&changes.has(owner.id))rewrite(owner.param_description,[owner.id]);
  }
 }
}

function reviseRelicConditionText(original:Record<string,any[]>,current:Record<string,any[]>,rules:any){
 const previous=(section:string,ref:any)=>(original[section]??[]).find(definition=>definition.id===id(ref));
 for(const relic of current.relics??[]){
  if(!relic.descriptions)continue;
  for(const ref of relic.relic_effects??[]){
   const effect=current.relic_effects?.find(definition=>definition.id===id(ref));
   const before=previous('relic_effects',ref);
   if(effect&&before?.param_effects?.length&&relic.relic_effects.length===1&&runsRelicActions(effect)){
    const hasLiteralAmountChange=effect.param_effects.some((ref:any)=>{
     const originalEffect=previous('effects',ref),updated=current.effects?.find(action=>action.id===id(ref));
     return ['CardEffectDraw','CardEffectGainEnergy'].includes(originalEffect?.name)&&
      Number.isInteger(updated?.param_int)&&updated!.param_int!==originalEffect!.param_int;
    });
    if(hasLiteralAmountChange)relic.descriptions={
     english:nativeEffectText(current,'relic_effects',effect,'en',rules),
     spanish:nativeEffectText(current,'relic_effects',effect,'es',rules),
    };
   }
   if(effect?.name==='RelicEffectModifyCardMagicPowerOnCardPlayed'){
    const threshold=(effect.conditions??[]).map((ref:any)=>current.relic_effect_conditions?.find(condition=>condition.id===id(ref)))
     .find((condition:any)=>condition?.param_tracked_value==='any_card_played'&&condition.param_card_type==='spell'&&condition.param_entry_duration==='this_turn');
    const amount=threshold?.param_int,old=previous('relic_effect_conditions',threshold?.id)?.param_int;
    const en=relic.descriptions.english,es=relic.descriptions.spanish;
    if(!Number.isInteger(amount)||amount===old||typeof en!=='string'||typeof es!=='string')continue;
    const english=en.replace(/^When you play your [^,]+ spell of the turn,/i,
     amount===1?'When you play your first spell of the turn,':'After you play '+amount+' spells in a turn,');
    const spanish=es.replace(/^Cuando juegas tu [^,]+ hechizo del turno,/i,
     amount===1?'Cuando juegas tu primer hechizo del turno,':'Tras jugar '+amount+' hechizos en un turno,');
    if(english!==en&&spanish!==es)relic.descriptions={english,spanish};
   }
   if(effect?.name==='RelicEffectModifyEnergyOnMoonPhase'&&before&&[1,2].includes(effect.param_int_2)&&
    effect.param_int_2!==before.param_int_2){
    const from=before.param_int_2===2?'full':'new',to=effect.param_int_2===2?'full':'new';
    const match=new RegExp('\\['+from+'\\]','gi');
    const descriptions:Record<string,string>={};
    for(const [locale,message] of Object.entries(relic.descriptions)){
     if(locale!=='key'&&typeof message==='string'){
      const updated=message.replace(match,'['+to+']');
      if(updated!==message)descriptions[locale]=updated;
     }
    }
    if(Object.keys(descriptions).length)relic.descriptions=descriptions;
   }
  }
 }
}

function reviseLiteralAmounts(original:Record<string,any[]>,current:Record<string,any[]>){
 const wording:Record<string,{
  section:string;
  patterns:Record<string,RegExp>;
  render:(language:string,amount:number)=>string;
 }>={
  CardEffectDrawType:{section:'effects',patterns:{english:/\bDraw (?:a unit|an Equipment)\b/i,spanish:/\bRoba (?:una unidad|un equipo)\b/i},
   render:()=>''},
  CardEffectDamagePerSourceAttack:{section:'effects',patterns:{english:/\bequal to \[attack\]/i,spanish:/\bcomo el \[attack\]/i},
   render:(language,amount)=>(language==='english'?'equal to ':'como ')+amount+' × [attack]'},
  CardEffectCopyUnits:{section:'effects',patterns:{english:/\bCreate a copy of\b/i,spanish:/\bCrea una copia de\b/i},
   render:(language,amount)=>language==='english'?'Create '+amount+' copies of':'Crea '+amount+' copias de'},
  RoomStateDrawRandomConsumedCardsPreCombatModifier:{section:'room_modifiers',patterns:{english:/\ba random consumed spell\b/i,spanish:/\bun hechizo consumido aleatorio\b/i},
   render:(language,amount)=>amount+(language==='english'?' random consumed spells':' hechizos consumidos aleatorios')},
  RelicEffectModifyTriggerCount:{section:'relic_effects',patterns:{english:/\btriggers an additional time\b/i,spanish:/\bse activa una vez más\b/i},
   render:(language,amount)=>language==='english'?'triggers '+Math.abs(amount)+(amount<0?' fewer':' additional')+' times':
    'se activa '+Math.abs(amount)+(amount<0?' veces menos':' veces más')},
 };
 for(const [name,{section,patterns,render}] of Object.entries(wording)){
  const before=new Map((original[section]??[]).filter(row=>row.name===name&&row.param_int===1).map(row=>[row.id,row]));
  const amounts=new Map((current[section]??[]).filter(row=>before.has(row.id)&&row.name===name&&Number.isInteger(row.param_int)&&row.param_int!==1)
   .map(row=>[row.id,row.param_int]));
  if(!amounts.size)continue;
  const ownerSection=section==='relic_effects'?'relics':'cards';
  const owners=(current[ownerSection]??[]).filter(owner=>owner.descriptions);
  for(const owner of owners){
   if(!owner.descriptions)continue;
   const rows=templateEffects(current,{section:ownerSection,id:owner.id}).filter(row=>row.section===section&&row.definition.name===name);
   if(rows.length!==1||!amounts.has(rows[0].id))continue;
   const amount=amounts.get(rows[0].id);
   const changed=Object.entries(patterns).filter(([locale,pattern])=>typeof owner.descriptions[locale]==='string'&&pattern.test(owner.descriptions[locale]));
   if(!changed.length)continue;
   for(const [locale,pattern] of changed){
    owner.descriptions[locale]=owner.descriptions[locale].replace(pattern,(match:string)=>{
     if(name!=='CardEffectDrawType')return render(locale,amount);
     if(match.toLowerCase().endsWith('unit'))return 'Draw '+amount+' units';
     if(match.toLowerCase().endsWith('equipment'))return 'Draw '+amount+' Equipment cards';
     return 'Roba '+amount+(match.toLowerCase().endsWith('unidad')?' unidades':' cartas de equipo');
    });
   }
   if(name==='CardEffectCopyUnits'){
    const movement=(owner.effects??[]).map((ref:any)=>current.effects?.find(effect=>effect.id===id(ref)))
     .find((effect:any)=>effect?.name==='CardEffectBump'&&effect.target_mode==='last_spawned_character');
    const direction=parameterKeywordOptions.CardEffectBump[movement?.param_int];
    if(direction){
     owner.descriptions.english=owner.descriptions.english?.replace(/and \[(?:descend|ascend)\] it/i,'and ['+direction+'] the last copy');
     owner.descriptions.spanish=owner.descriptions.spanish?.replace(/y la (?:<b>)?(?:desciende|asciende)(?:<\/b>)?/i,'y ['+direction+'] la última copia');
    }
   }
   for(const locale of Object.keys(owner.descriptions))if(locale!=='english'&&locale!=='spanish')delete owner.descriptions[locale];
  }
 }
}

export function reviseMovementDescriptions(original:Record<string,any[]>,current:Record<string,any[]>,rules?:any){
 reviseKeywordOptions(original,current);
 reviseLiteralAmounts(original,current);
 if(rules)reviseRelicConditionText(original,current,rules);
 const previous=new Map((original.effects??[]).filter(effect=>effect.name==='CardEffectFloorRearrange').map(effect=>[effect.id,effect.param_int??0]));
 const changed=new Map((current.effects??[]).filter(effect=>previous.has(effect.id)&&(effect.param_int??0)!==previous.get(effect.id)).map(effect=>[effect.id,effect.param_int??0]));
 if(!changed.size)return;
 for(const definitions of Object.values(current))for(const owner of definitions){
  const refs=owner.trigger_effects??owner.effects??owner.param_effects??[];
  if(!Array.isArray(refs))continue;
  const movement=refs.map(id).filter((ref:string)=>previous.has(ref));
  if(!owner.descriptions||!movement.some((ref:string)=>changed.has(ref)))continue;
  delete owner.descriptions.key;
  for(const [locale,value] of Object.entries(owner.descriptions)){
   if(locale==='key'||typeof value!=='string')continue;
   const tokens=/\[(advance|retreat)\]/gi;
   if([...value.matchAll(tokens)].length!==movement.length)continue;
   let index=0;
   owner.descriptions[locale]=value.replace(tokens,match=>{
    const destination=changed.get(movement[index++]);
    return destination===undefined?match:destination===0?'[advance]':'[retreat]';
   });
  }
 }
}

const activationAmountIcons:Record<string,string>={
 RelicEffectGoldOnTrigger:'coin',
 RelicEffectEnergyAndCardDrawOnUnitSpawned:'ember',
};

// These amount-only notices are authored as prose, so each locale needs its own inflection.
const russianDrawNouns:Partial<Record<Intl.LDMLPluralRule,string>>={one:'карту',few:'карты',many:'карт'};
const drawNotices:Record<string,(amount:number)=>string>={
 english:amount=>'Draw '+amount+(amount===1?' card.':' cards.'),
 spanish:amount=>'Roba '+amount+(amount===1?' carta.':' cartas.'),
 french:amount=>'Piochez '+amount+(amount<=1?' carte.':' cartes.'),
 german:amount=>'Ziehe '+amount+(amount===1?' Karte.':' Karten.'),
 portuguese:amount=>'Compre '+amount+(amount===1?' carta.':' cartas.'),
 russian:amount=>'Возьмите '+amount+' '+(russianDrawNouns[new Intl.PluralRules('ru').select(amount)]??'карт')+'.',
 chinese:amount=>'抽 '+amount+' 张牌。',
 chinese_traditional:amount=>'抽 '+amount+' 張牌。',
 japanese:amount=>'カードを'+amount+'枚引く。',
 korean:amount=>'카드를 '+amount+'장 뽑습니다.',
};

export function reviseArtifactActivation(original:Record<string,any[]>,current:Record<string,any[]>){
 const previous=new Map((original.relic_effects??[]).map(effect=>[effect.id,effect]));
 const effects=new Map((current.relic_effects??[]).map(effect=>[effect.id,effect]));
 for(const relic of current.relics??[]){
  if(relic.relic_effects?.length!==1||!relic.relic_activated_texts)continue;
  const effectId=id(relic.relic_effects[0]),before=previous.get(effectId),after=effects.get(effectId);
  const icon=activationAmountIcons[before?.name];
  if(!before||before.name!==after?.name||!Number.isInteger(before.param_int)||
   !Number.isInteger(after.param_int)||before.param_int===after.param_int)continue;
  for(const [language,caption] of Object.entries(relic.relic_activated_texts)){
   if(language==='key'||typeof caption!=='string')continue;
   const draw=drawNotices[language];
   if(before.name==='RelicEffectCardDrawOnCardPlay'&&draw&&caption===draw(before.param_int)){
    relic.relic_activated_texts[language]=draw(after.param_int);
    continue;
   }
   if(!icon)continue;
   const match=caption.match(/^([+-]?)(-?\d+)(\s*\[[a-z]+\])$/i);
   if(!match||Number(match[1]+match[2])!==before.param_int||match[3].trim()!=='['+icon+']')continue;
   const sign=after.param_int>=0&&match[1]==='+'?'+':'';
   relic.relic_activated_texts[language]=sign+after.param_int+match[3];
  }
 }
}

export function relicActivationText(doc:Record<string,any[]>,definition:Record<string,any>|undefined,language:string,rules:any){
 if(!definition)return '';
 const subtype=doc.subtypes?.find(value=>value.id===id(definition.param_subtype));
 const conditions=(definition.conditions??[]).map((ref:any)=>doc.relic_effect_conditions?.find(value=>value.id===id(ref)));
 const firstOnly=conditions.some((condition:any)=>condition?.param_track_trigger_count===true&&
  condition.param_entry_duration==='this_turn'&&condition.param_int===1&&condition.allow_multiple_triggers_per_duration===false);
 const key=definition.name==='RelicEffectAddEffectOnUnitSpawn'&&firstOnly?'firstSpawn':
  definition.name==='RelicEffectChanceAddEffectAfterSpawn'?(definition.param_source_team==='heroes'?'enemyChanceSpawn':'chanceSpawn'):definition.name;
 const wording=label(rules.nativeRelicTiming?.[key],language);
 const name=text(subtype?.names,language)||label(rules.nativeRelicTiming?.unit,language);
 return wording.replace('{unit}',name).replace('{chance}',String(definition.param_int??0));
}

export function nativeEffectText(doc:Record<string,any[]>,section:string,d:any,language:string,rules:any,depth=0):string{if(depth>8)return label(rules.labels.specialEffect,language);if(!d)return '';const get=(s:string,ref:any)=>(doc[s]??[]).find(d=>d.id===id(ref));const status=(v:any)=>label(rules.statusLabels?.[unitStatusKey(v)],language)||unitStatusKey(v);const cls=String(typeof d.name==='object'?d.name.id:d.name??'').replace(/^@/,'');const refs=d.trigger_effects??d.effects??d.relic_effects??[];
 const format=(input:string)=>gameText(input,doc,{section,definition:d},language,rules);
 if(section==='cards')return text(d.names,language)||label(rules.labels.specialEffect,language);
 if(section==='traits')return label(rules.traitLabels?.[cls],language)||label(rules.nativeTraitLabels?.[cls],language)||label(rules.exampleParameterRules?.[cls],language)||label(rules.labels.cardProperty,language);
 if(section==='relic_effects'&&d.triggers?.length)return d.triggers.map((ref:any)=>nativeEffectText(doc,'character_triggers',get('character_triggers',ref),language,rules,depth+1)).filter(Boolean).join('. ');
 const description=text(d.descriptions,language);if(description){const body=format(description);const when=['character_triggers','card_triggers'].includes(section)?triggerLabel(d.trigger,rules,language):'';return (when?when+': ':'')+body;}
 if(['character_triggers','card_triggers'].includes(section)&&refs.length){
  const timing=triggerLabel(d.trigger,rules,language);
  const action=refs.map((ref:any)=>nativeEffectText(doc,'effects',get('effects',ref),language,rules,depth+1)).filter(Boolean).join(' ');
  if(action)return timing?timing+': '+action:action;
 }
 if(cls==='CardEffectFloorRearrange'){
  const destination=d.param_int??0;
  if(destination===0||destination===1)return status(destination===0?'advance':'retreat');
 }
 if(section==='relic_effects'&&d.param_effects?.length&&runsRelicActions(d)){
  const timing=relicActivationText(doc,d,language,rules)||label(rules.nativeEffectLabels?.[cls],language);
  const actions=d.param_effects.map((ref:any)=>nativeEffectText(doc,'effects',get('effects',ref),language,rules,depth+1)).filter(Boolean);
  if(actions.length)return (timing?timing+': ':'')+actions.join(' · ');
 }
 if(section==='room_modifiers'&&Array.isArray(d.param_effects)&&d.param_effects.length){
  const effects=d.param_effects.map((reference:any)=>nativeEffectText(doc,'effects',get('effects',reference),language,rules,depth+1)).filter(Boolean);
  if(effects.length)return effects.join(' · ');
 }
 if(cls==='CardEffectAddTempCardUpgradeToNextDrawnCard'){
  const upgrade=get('upgrades',d.param_upgrade);
  const reduction=upgrade?.cost_reduction;
  const wording=rules.nativeActionText?.nextDrawnCost?.[language];
  if(wording&&Number.isFinite(reduction)&&reduction>0&&
   (!upgrade.x_cost_reduction||upgrade.x_cost_reduction===reduction)){
   return wording.replace('{amount}',String(reduction));
  }
 }
 if(cls==='CardEffectAddBattleCard'){
  const pool=get('card_pools',d.param_card_pool);
  const cards=(pool?.cards??[]).map((ref:any)=>text(get('cards',ref)?.names,language)).filter(Boolean);
  const directCard=text(get('cards',d.param_card)?.names,language);
  const pile=rules.battleCardPiles?.[d.param_int]?.[language];
  if(pile){
   const cardName=directCard||(cards.length===1?cards[0]:label(rules.labels.generatedCard,language));
   return pile.replace('{amount}',String(Math.max(1,d.param_int_2??1))).replace('{card}',cardName);
  }
  return label(rules.nativeEffectLabels?.[cls],language);
 }
 if(cls==='CardEffectAddCardUpgradeToUnitsPerStatusEffect'){
  const upgrade=get('upgrades',d.param_upgrade);
  const stats=[['bonus_damage','attack'],['bonus_hp','maximumHealth'],['bonus_size','size']]
   .filter(([field])=>typeof upgrade?.[field]==='number'&&upgrade[field]!==0)
   .map(([field,key])=>(upgrade[field]>0?'+':'')+upgrade[field]+' '+label(rules.labels[key],language));
  const statuses=(d.param_status_effects??[]).map((entry:any)=>status(entry.status));
  if(stats.length&&statuses.length){
   const scope=d.target_mode==='room'?label(rules.nativeRoomTeams?.[d.target_team],language):
    d.target_mode==='tower'?label(rules.targets?.find((choice:any)=>choice.value===
     ('all_floors_'+(d.target_team==='both'?'units':d.target_team==='heroes'?'enemy':'friendly')))?.label,language):
    label(rules.nativeTargetLabels?.[d.target_mode],language);
   const wording=rules.conditionalUpgradeText?.[d.target_mode==='self'?'self':'group']?.[language];
   if(wording)return wording.replace('{stats}',stats.join(' · ')).replace('{status}',statuses.join(' / ')).replace('{target}',scope);
  }
 }
 if(section==='effects'&&Number.isInteger(d.param_int)){
  if(cls==='CardEffectDraw')return language==='es'?'Roba '+d.param_int+(d.param_int===1?' carta':' cartas'):
   'Draw '+d.param_int+(d.param_int===1?' card':' cards');
  if(cls==='CardEffectGainEnergy')return (language==='es'?'Gana ':'Gain ')+d.param_int+' ember';
 }
 const passive=rules.passives?.find((recipe:any)=>section==='relic_effects'?recipe.class===cls:section==='room_modifiers'&&recipe.modifier===cls);
 if(passive&&Number.isInteger(d.param_int)&&d.param_int>=0)return label(passive.description,language).replace('{amount}',String(d.param_int));
 const name=label(rules.nativeEffectLabels?.[cls],language)||label(passive?.label,language)||label(rules.labels.specialEffect,language);if(d.param_status_effects?.length)return name+': '+d.param_status_effects.map((s:any)=>status(s.status)+statusAmount(s.status,s.count,rules)).join(' · ');
 const statUpgrade=cls==='CardEffectAddCardUpgradeToUnits'&&get('upgrades',d.param_upgrade);
 if(statUpgrade){
  const stats=[['bonus_damage','attack'],['bonus_hp','maximumHealth'],['bonus_size','size']]
   .filter(([field])=>typeof statUpgrade[field]==='number'&&statUpgrade[field]!==0)
   .map(([field,key])=>(statUpgrade[field]>0?'+':'')+statUpgrade[field]+' '+label(rules.labels[key],language));
  if(stats.length&&!statUpgrade.status_effect_upgrades?.length&&!statUpgrade.trigger_upgrades?.length&&
   !statUpgrade.card_trigger_upgrades?.length&&!statUpgrade.room_modifier_upgrades?.length&&!statUpgrade.trait_upgrades?.length&&
   !statUpgrade.ability_upgrade&&!statUpgrade.room_ability_upgrade){
   const summary=stats.join(' · ');
   return d.param_int_3===2?label(rules.labels.permanentEffect,language).replace('{text}',summary):summary;
  }
 }
 if(typeof d.param_int==='number'&&Math.abs(d.param_int)<=rules.limits.maxNumber)return name+': '+d.param_int;
 const upgrade=get('upgrades',d.param_upgrade);if(upgrade){const values=[['bonus_damage','attack'],['bonus_hp','health'],['bonus_size','size']].filter(([key])=>upgrade[key]).map(([key,name])=>(upgrade[key]>0?'+':'')+upgrade[key]+' '+label(rules.labels[name],language));if(upgrade.status_effect_upgrades?.length)values.push(...upgrade.status_effect_upgrades.map((s:any)=>status(s.status)+statusAmount(s.status,s.count,rules)));for(const [field,section]of [['trigger_upgrades','character_triggers'],['card_trigger_upgrades','card_triggers'],['room_modifier_upgrades','room_modifiers']])for(const ref of upgrade[field]??[])values.push(nativeEffectText(doc,section,get(section,ref),language,rules,depth+1));return [name,...values].filter(Boolean).join(' · ');}
 return name;
}
export function simplifiedEffectText(document:Record<string,any[]>,root:any,language:string,rules:any){
 if(!root)return '';
 const section=root.relic_effects?'relic_effects':'effects';
 return (root[section]??[]).map((ref:any)=>(document[section]??[]).find(d=>d.id===id(ref)))
  .filter((effect:any)=>effect&&!['CardEffectSpawnMonster','CardEffectAttachEquipment'].includes(effect.name))
  .map((effect:any)=>nativeEffectText(document,section,effect,language,rules)).filter(Boolean).join('. ');
}

export function reviseEffectDescriptions(original:Record<string,any[]>,doc:Record<string,any[]>,changed:TemplateEffect[],rules:any){const owners=new Map<string,TemplateEffect>();for(const e of changed)if(['effects','trigger_effects','relic_effects','traits'].includes(e.field))owners.set(e.ownerSection+'|'+e.ownerId,e);
 for(const e of owners.values()){
  const before=original[e.ownerSection].find(d=>d.id===e.ownerId)!;
  const after=doc[e.ownerSection].find(d=>d.id===e.ownerId)!;
  if(!before.descriptions)continue;
  const field=e.field==='traits'?'effects':e.field,oldRefs=before[field]??[],refs=after[field]??[];
  const explicit=new Set(changed.filter(row=>!row.affectedOnly&&row.ownerSection===e.ownerSection&&row.ownerId===e.ownerId&&row.field===field).map(row=>row.index));
  const used=new Set<number>();
  const indexes=oldRefs.map((ref:any,index:number)=>{
   if(explicit.has(index))return -1;
   const next=refs.findIndex((candidate:any,i:number)=>!used.has(i)&&id(ref)===id(candidate));
   if(next>=0)used.add(next);
   return next;
  });
  const removed=indexes.flatMap((next:number,index:number)=>next<0?[index]:[]);
  const descriptions:Record<string,string>={};
  const section=field==='relic_effects'?'relic_effects':'effects';
  for(const [locale,value] of Object.entries(before.descriptions)){
   if(locale==='key'||typeof value!=='string')continue;
   let faithful=!e.affectedOnly&&e.field!=='traits'&&removed.every((i:number)=>new RegExp('(?:effect|triggereffect)'+i+'[.]','i').test(value));
   const kept=splitDescription(value).flatMap(sentence=>{
    const indices=[...sentence.matchAll(/(?:effect|triggereffect)(\d+)[.]/gi)].map(match=>Number(match[1]));
    if(indices.some(i=>removed.includes(i))){
     if(indices.some(i=>indexes[i]>=0))faithful=false;
     return [];
    }
    return [sentence.replace(/((?:effect|triggereffect))(\d+)([.])/gi,(_,prefix,n,dot)=>prefix+(indexes[n]??n)+dot)];
   });
   if(faithful){descriptions[locale]=kept.join(' ');continue;}
   const language=generatedLocales[locale as keyof typeof generatedLocales];
   if(language)descriptions[locale]=refs.map((ref:any)=>nativeEffectText(doc,section,(doc[section]??[]).find(d=>d.id===id(ref)),language,rules)).filter(Boolean).join('. ');
  }
  after.descriptions=descriptions;
 }
}
// 2026-11-15-2047||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Mostrar componentes con nombres legibles y actualizar textos afectados al eliminar acciones sin conservar afirmaciones del efecto retirado
// 2026-11-15-2054||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Actualizar descripciones de efectos compuestos y reliquias cuando se elimina un componente interior
// 2026-11-15-2107||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Usar el mismo resolvedor de textos nativos en componentes y carta completa
// 2026-11-15-2117||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Omitir cantidades de capacidades fijas en resumen de componentes y efectos restantes
// 2026-11-19-2135||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Nombrar Avanzar y Retirar según el destino del movimiento dentro del piso
// 2026-11-19-2137||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Actualizar los términos de movimiento del texto al cambiar el destino
// 2026-11-19-2138||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Comprobar que el dueño del texto tenga una lista de efectos
// 2026-11-19-2215||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Nombrar los efectos incluidos en un modificador de sala
// 2026-11-21-1100||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Resumir los efectos conservados sin copiar la descripción eliminada
// 2026-11-21-1246||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Mostrar los atributos reales de una mejora simple en vez del parámetro genérico
// 2026-11-21-1341||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Resolver nombres localizados para activaciones de librerías en descripciones
// 2026-11-21-1341||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Compartir el resolvedor de activaciones del editor
// 2026-11-21-1509||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Preservar frases multilingües al eliminar acciones y describir las mejoras condicionales y cartas añadidas
// 2026-11-21-1515||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Mantener los índices de acciones repetidas al trasladar o retirar una de ellas
// 2026-11-21-1516||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Mostrar la reducción real de coste de la siguiente carta robada en Weapons Cache
// 2026-11-21-1554||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Sincronizar los avisos de oro y ascua con el valor real del efecto
// 2026-11-21-1555||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Resolver el texto de disparadores al leerlos sin escribir nuevos avisos en el JSON
// 2026-11-21-1619||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Actualizar avisos de robo con cantidad y plural propios de cada idioma
// 2026-11-21-1620||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Tipar las formas del plural ruso para el aviso de robo
// 2026-11-21-1902||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Nombrar los efectos de escala según el parámetro que realmente modifican
// 2026-11-21-1905||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Actualizar los términos de la descripción cuando cambia una dirección o fase lunar
// 2026-11-21-1909||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Actualizar las descripciones nativas que expresaban una cantidad fija literalmente
// 2026-11-21-1945||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Reutilizar las descripciones concretas de recetas al mostrar pasivas nativas
// 2026-11-21-1946||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Nombrar propiedades de presentación en el editor sin añadirlas al texto visible de la carta
// 2026-11-21-2015||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Sincronizar números escritos, fases y acciones anidadas con las descripciones de vista previa y exportación
// 2026-11-21-2016||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Actualizar el resumen de una acción de artefacto cuando el texto del ejemplo tenía una cantidad literal
// 2026-11-21-2020||codex-clan-editor||clan-creator/src/server/creator/template-effect-text.ts||Aclarar qué copia mueve una habilidad que apunta al último personaje invocado
