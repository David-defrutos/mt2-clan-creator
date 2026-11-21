import {effectHelp,helpText} from './mechanic-help';
import {local,type Language} from './presentation';

export const guideTopics=['effects','timings','targets','abilities','properties','duration'] as const;
export type GuideTopic=typeof guideTopics[number];
export type GuideRequest={
 topic:GuideTopic;
 allowed?:readonly string[];
 variant?:'spell'|'unit'|'equipment'|'room';
 selected?:string;
};
type Facet='category'|'context'|'scope'|'team'|'duration'|'source'|'amount';
export type GuideEntry={
 id:string;
 value:string;
 variant?:GuideRequest['variant'];
 name:string;
 text:string;
 searchText:string;
 facets:Partial<Record<Facet,string[]>>;
};

export function guideTopic(value:unknown):GuideTopic|undefined{
 return guideTopics.find(topic=>topic===value);
}

export const guideFacets:Record<GuideTopic,Facet[]>={
 effects:['category','context','scope','duration','source'],
 timings:['category','context','source'],
 targets:['scope','team','context'],
 abilities:['amount','source'],
 properties:['context','source'],
 duration:[],
};

const timedCardEvents=new Set(['end_turn_pre_hand_discard','card_exhausted','card_monster_played','card_spell_played','on_equipment_added','on_equipment_added_to_any','on_pre_own_ability_activated','on_own_ability_activated']);
const timedCombatEvents=new Set(['on_round_start','on_turn_begin','pre_combat','post_combat','on_attacking','on_attacking_before_damage','on_hit','on_heal','on_encounter_complete','on_reanimated','on_any_unit_death_on_floor','on_any_hero_death_on_floor','on_death','on_kill','on_spawn']);
const cardKinds=['spell','unit','equipment','room','artifact','blight','junk'];
const nativeName=(name:unknown)=>typeof name==='string'?name:'';

export function guideEntries(topic:GuideTopic,rules:any,language:Language):GuideEntry[]{
 const copy=rules.mechanicGuide;
 const label=(key:string)=>local(copy.labels[key],language);
 const text=(value:any)=>helpText(value,rules,language);
 const labels=(keys:string[])=>keys.map(label).filter(Boolean);
 const entry=(value:string,name:any,body:string,facets:GuideEntry['facets'],variant?:GuideEntry['variant'],aliases:readonly string[]=[]):GuideEntry=>({
  id:variant?variant+':'+value:value,value,variant,name:local(name,language),text:body,
  searchText:[value,typeof name==='object'?Object.values(name).join(' '):name,...aliases].join(' '),facets,
 });
 let results:GuideEntry[];
 switch(topic){
 case 'effects':{
  const recipes=rules.recipes.map((recipe:any)=>{
   const group=rules.effectGroups.find((item:any)=>item.recipes.includes(recipe.id));
   return entry(recipe.id,recipe.label,effectHelp(recipe,rules,language,recipe.amount,'spell_target'),{
    category:[local(group?.label,language)||label('other')],
    context:labels(recipe.castOnly?['spell']:['spell','unit','equipment']),
    scope:labels([recipe.target==='none'?'noTarget':'units']),
    duration:(recipe.durations??[]).map((duration:string)=>local(rules.effectDurations.find((item:any)=>item.value===duration)?.label,language)),
    source:labels(['ready']),amount:labels([recipe.fixedAmount?'fixed':'withAmount']),
   },undefined,[nativeName(recipe.class),...(recipe.aliases??[])]);
  });
  const passives=rules.passives.map((rule:any)=>entry(rule.id,rule.label,text(rule.description).replace('{amount}',String(rule.amount)),{
   category:labels(['passive']),context:labels([rule.kind]),scope:labels([rule.kind==='room'?(rule.modifier?'floor':'units'):'noTarget']),source:labels(['ready']),
  },undefined,[nativeName(rule.class??rule.modifier)]));
  const represented=new Set([...rules.recipes,...rules.passives].map((rule:any)=>rule.class??rule.modifier));
  const native=Object.entries(rules.nativeEffectLabels??{}).filter(([name])=>!represented.has(name))
   .map(([name,title])=>entry(name,title,text(copy.nativeEffects[name]),{category:labels(['native']),source:labels(['copied'])}));
  results=[...recipes,...passives,...native];
  break;
 }
 case 'timings':{
  const timing=(option:any,variant:'spell'|'unit'|'room',category:string,context:string[])=>{
   const token=variant+':'+option.value;
   const name=option.label;
   const body=text(copy.timingText[token]??option.help);
   const keyword=rules.triggerLabels?.[option.value];
   const aliases=keyword&&variant==='unit'?Object.values(keyword) as string[]:[];
   return entry(option.value,name,body,{category:labels([category]),context:labels(context),source:option.reference?['Conductor']:labels(['game'])},
    variant,aliases);
  };
  const spellOptions=new Map([...rules.officialCardTriggers,...rules.spellTimings].map(option=>[option.value,option]));
  results=[...Array.from(spellOptions.values(),option=>timing(option,'spell','cardEvent',['spell'])),
   timing({value:'activate_ability',label:rules.guidedText.abilityActivation},'spell','cardEvent',['unit','room','equipment']),
   timing({value:'equip_card',label:rules.guidedText.whenEquipped},'spell','cardEvent',['equipment']),
   ...rules.triggers.map((option:any)=>{
    const contexts=['unit',...['room','equipment','artifact'].filter(kind=>rules.copiedUnitTriggerScopes?.[kind]?.includes(option.value))];
    const category=timedCardEvents.has(option.value)?'cardEvent':timedCombatEvents.has(option.value)?'combatEvent':
     /(?:vanguard|shift|equipment|feed|eaten|armor|spawn|death|bloodshed|hatch|punish|silence)/.test(option.value)?'unitEvent':'otherEvent';
    return timing(option,'unit',category,contexts);
   }),
   ...Object.entries(rules.nativeRoomTiming).map(([value,title])=>timing({value,label:title},'room','combatEvent',['room']))];
  break;
 }
 case 'targets':
  results=rules.targets.flatMap((option:any)=>{
   const value=option.value;
   const type=value.startsWith('all_floors_')?'train':value.startsWith('all_')?'floor':'single';
   const team=value==='spell_target'?'selected':value.endsWith('enemy')?'enemy':value.endsWith('units')?'both':'allied';
   const target=(title:any,context:string[],description:any,variant?:GuideRequest['variant'])=>
    entry(value,title,text(description),{scope:labels([type]),team:labels([team]),context:labels(context)},variant);
   if(value==='friendly')return [
    target(option.label,['spell'],copy.targetText.spellFriendly,'spell'),
    target(option.unitLabel,['unit','room','artifact'],copy.targetText.unitFriendly,'unit'),
    target(rules.guidedText.equippedUnit,['equipment'],copy.targetText.equipped,'equipment'),
   ];
   if(value==='enemy')return [
    target(option.label,['spell'],copy.targetText.spellEnemy,'spell'),
    target(option.unitLabel,['unit','room','equipment','artifact'],copy.targetText.unitEnemy,'unit'),
   ];
   return [target(option.label,value==='spell_target'?['spell']:cardKinds.slice(0,5),option.help??copy.targetText[type])];
  });
  break;
 case 'abilities':
  results=rules.unitAbilities.map((ability:any)=>entry(ability.status,ability.label,text(ability.help),{
   amount:labels([ability.fixed?'fixed':'withAmount']),source:ability.provider?[ability.provider]:labels(['game']),
  },undefined,ability.aliases));
  break;
 case 'properties':
  results=Object.entries({...rules.traitLabels,...rules.nativeTraitLabels}).map(([value,title])=>{
   const kinds=rules.cardTraitOptions?.[value];
   return entry(value,title,text(copy.traitText[value]),{
    context:kinds?labels(kinds):[],source:labels([kinds?'ready':'copied']),
   });
  });
  break;
 case 'duration':
  results=rules.effectDurations.map((option:any)=>entry(option.value,option.label,text(copy.durationText[option.value]),{}));
  break;
 }
 return results.sort((a,b)=>a.name.localeCompare(b.name,language)||a.id.localeCompare(b.id));
}

function matchesVariant(entry:GuideEntry,request:GuideRequest){
 return !entry.variant||!request.variant||entry.variant===request.variant||
  request.topic==='targets'&&entry.variant==='unit'&&['equipment','room'].includes(request.variant)&&entry.value==='enemy';
}

export function isGuideOptionAvailable(entry:GuideEntry,request:GuideRequest){
 return Boolean(request.allowed?.includes(entry.value)&&matchesVariant(entry,request));
}

const normalize=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase();
export function filterGuideEntries(entries:GuideEntry[],request:GuideRequest,query:string,facets:Partial<Record<Facet,string>>,availableOnly:boolean){
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 return entries.filter(entry=>{
  if(availableOnly&&!isGuideOptionAvailable(entry,request))return false;
  if(Object.entries(facets).some(([facet,value])=>value&&!entry.facets[facet as Facet]?.includes(value)))return false;
  const searchable=normalize([entry.name,entry.text,entry.searchText,...Object.values(entry.facets).flat()].join(' '));
  return terms.every(term=>searchable.includes(term));
 });
}
// 2026-11-21-1929||codex-clan-editor||clan-creator/src/web/creator/guide-catalog.ts||Construir las páginas de referencia con las opciones reales de cada selector
// 2026-11-21-1932||codex-clan-editor||clan-creator/src/web/creator/guide-catalog.ts||Incluir la ayuda específica de reglas nativas y activaciones fijas de las cartas
// 2026-11-21-1934||codex-clan-editor||clan-creator/src/web/creator/guide-catalog.ts||Mostrar una sola nota común para las reglas copiadas sin una explicación específica
// 2026-11-21-1945||codex-clan-editor||clan-creator/src/web/creator/guide-catalog.ts||Distinguir pasivas de piso de estados aplicados a unidades y reconocer modificadores de sala
// 2026-11-21-1946||codex-clan-editor||clan-creator/src/web/creator/guide-catalog.ts||Incluir propiedades de presentación y términos de los nuevos modificadores en la búsqueda
