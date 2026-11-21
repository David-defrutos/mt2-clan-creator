export interface TemplateEffect {key:string;ownerSection:string;ownerId:string;field:string;index:number;section:string;id:string;definition:Record<string,any>;parent?:string;affectedOnly?:boolean}
const refId=(v:any)=>typeof v==='string'?v.replace(/^@/,''):v?.mod_reference?undefined:String(v?.id??'').replace(/^@/,'');
export function activeCardTraitClasses(doc:Record<string,any[]>,root:{section:string;id:string},removed:readonly string[]=[]){
 const excluded=new Set(removed);
 return new Set(templateEffects(doc,root)
  .filter(row=>row.ownerSection===root.section&&row.ownerId===root.id&&row.section==='traits'&&!excluded.has(row.key))
  .map(row=>row.definition.name));
}

export function isActivatedCard(doc:Record<string,any[]>,card:Record<string,any>|undefined){
 if(!card)return false;
 return card.is_an_ability===true||card.is_room_ability===true||
  (doc.upgrades??[]).some(upgrade=>refId(upgrade.room_ability_upgrade)===card.id);
}

const editableRelicActionGroups=new Set([
 'RelicEffectAddEffectOnUnitSpawn','RelicEffectAddEffectStartOfTurn',
 'RelicEffectChanceAddEffectAfterSpawn','RelicEffectChanceAddEffectOnSpawn',
 'RelicEffectAddEffectOnStatusAdded','RelicEffectAddEffectOnMooncycle','RelicEffectAddEffectOnUnitDeath',
]);

export function runsRelicActions(definition:Record<string,any>|undefined){
 return editableRelicActionGroups.has(definition?.name);
}

export function equipmentUpgrade(doc:Record<string,any[]>,root:Record<string,any>|undefined){
 const attached=(root?.effects??[]).map((ref:unknown)=>(doc.effects??[]).find(effect=>effect.id===refId(ref)))
  .find((effect:any)=>effect?.name==='CardEffectAttachEquipment');
 return (doc.upgrades??[]).find(upgrade=>upgrade.id===refId(attached?.param_upgrade));
}
export function templateEffects(doc:Record<string,any[]>,root:{section:string;id:string}):TemplateEffect[]{const rows:TemplateEffect[]=[],visited=new Set<string>();const get=(section:string,id:string)=>(doc[section]??[]).find(d=>d.id===id);
 function visit(section:string,id:string,parent?:string){const identity=section+'|'+id;if(visited.has(identity))return;visited.add(identity);const d=get(section,id);if(!d)return;
  function field(name:string,target:string,skip?:number){const array=Array.isArray(d[name]),values=array?d[name]:d[name]?[d[name]]:[];for(const [index,ref]of values.entries()){const rid=refId(ref),definition=rid&&get(target,rid);if(!rid||!definition)continue;if(index===skip)continue;const key=JSON.stringify([section,id,name,array?index:-1]);rows.push({key,ownerSection:section,ownerId:id,field:name,index:array?index:-1,section:target,id:rid,definition,parent});visit(target,rid,key);}}
  if(section==='cards'){const spawn=(d.effects??[]).findIndex((ref:any)=>get('effects',refId(ref)??'')?.param_character);field('effects','effects',root.section==='cards'&&id===root.id&&d.card_type==='monster'?spawn:undefined);field('traits','traits');field('triggers','card_triggers');if(id===root.id&&d.card_type==='monster'&&spawn>=0){const e=get('effects',refId(d.effects[spawn])!);visit('characters',refId(e?.param_character)??'');}const active:any[]=[];for(const ref of d.initial_upgrades??[]){const u=get('upgrades',refId(ref)??'');if(!u)continue;const removed=new Set((u.remove_upgrades??[]).map(refId));for(let i=active.length-1;i>=0;i--)if(removed.has(active[i].id))active.splice(i,1);active.push(u);}for(const u of active)visit('upgrades',u.id,parent);}
  if(section==='characters'){field('triggers','character_triggers');field('room_modifiers','room_modifiers');field('ability','cards');}
  if(section==='upgrades'){field('trigger_upgrades','character_triggers');field('card_trigger_upgrades','card_triggers');field('room_modifier_upgrades','room_modifiers');field('trait_upgrades','traits');field('ability_upgrade','cards');field('room_ability_upgrade','cards');}
  if(section==='relics')field('relic_effects','relic_effects');
  if(['character_triggers','card_triggers','relic_effects'].includes(section)){field('effects','effects');field('trigger_effects','effects');field('triggers','character_triggers');}
  if(section==='room_modifiers'||section==='relic_effects')field('param_effects','effects');
  if(['effects','relic_effects','room_modifiers'].includes(section)){const uid=refId(d.param_upgrade);if(uid)visit('upgrades',uid,parent);}
 }
 visit(root.section,root.id);return rows;
}
export function restoreSpellEffectTargets(doc:Record<string,any[]>,card:Record<string,any>,removedIndices:Set<number>){
 if(card.card_type!=='spell')return;
 restoreEffectTargets(doc,card.effects,removedIndices);
}

function restoreEffectTargets(doc:Record<string,any[]>,references:unknown[],removedIndices:Set<number>){
 if(!Array.isArray(references))return;
 const effects=new Map((doc.effects??[]).map(effect=>[effect.id,effect]));
 let originalTarget:Record<string,any>|undefined;
 let selectionWasRemoved=false;
 for(const [index,reference] of references.entries()){
  const effect=effects.get(refId(reference));
  if(!effect)continue;
  if(effect.target_mode==='last_targeted_characters'){
   if(removedIndices.has(index)||!selectionWasRemoved||!originalTarget)continue;
   const mode=originalTarget.target_mode;
   // Keep the predicate of the previous target and any additional restrictions on this effect.
   for(const [key,value] of Object.entries(originalTarget)){
    if(key.startsWith('target_')&&effect[key]===undefined)effect[key]=structuredClone(value);
   }
   effect.target_mode=mode;
   if(!effect.target_team||effect.target_team==='both')effect.target_team=originalTarget.target_team??effect.target_team;
   selectionWasRemoved=false;
  }else if(effect.target_mode&&effect.target_team!=='none'){
   originalTarget=effect;
   selectionWasRemoved=removedIndices.has(index);
  }
 }
}

export function removeTemplateEffects(doc:Record<string,any[]>,root:{section:string;id:string},removed:string[]=[]){if(!removed.length)return [];const records=templateEffects(doc,root),chosen=new Set(removed),changes:TemplateEffect[]=[];const fields=new Map<string,TemplateEffect[]>();for(const e of records)if(chosen.has(e.key)){const key=JSON.stringify([e.ownerSection,e.ownerId,e.field]);fields.set(key,[...(fields.get(key)??[]),e]);changes.push(e);}for(const records of fields.values()){const first=records[0],owner=doc[first.ownerSection].find(d=>d.id===first.ownerId)!,indices=new Set(records.map(r=>r.index));if(indices.has(-1))delete owner[first.field];else {
 if(first.ownerSection==='cards'&&first.field==='effects')restoreSpellEffectTargets(doc,owner,indices);
 if(first.ownerSection==='relic_effects'&&first.field==='param_effects')restoreEffectTargets(doc,owner.param_effects,indices);
 owner[first.field]=owner[first.field].filter((_:any,i:number)=>!indices.has(i));
 }}
 const affected=new Set(changes.map(e=>e.ownerSection+'|'+e.ownerId));let pruned=true;while(pruned){pruned=false;for(const e of records){if(!affected.has(e.section+'|'+e.id))continue;const target=(doc[e.section]??[]).find(d=>d.id===e.id);if(!target)continue;const emptyTrigger=['character_triggers','card_triggers'].includes(e.section)&&!(target.effects?.length||target.trigger_effects?.length),emptyModifier=e.section==='room_modifiers'&&Array.isArray(target.param_effects)&&!target.param_effects.length,emptyRelic=e.section==='relic_effects'&&(target.name==='RelicEffectAddTrigger'&&!target.triggers?.length||runsRelicActions(target)&&Array.isArray(target.param_effects)&&!target.param_effects.length),emptyAbility=e.section==='cards'&&['ability','ability_upgrade','room_ability_upgrade'].includes(e.field)&&!target.effects?.length&&!target.triggers?.length;if(!emptyTrigger&&!emptyModifier&&!emptyRelic&&!emptyAbility)continue;const owner=doc[e.ownerSection].find(d=>d.id===e.ownerId)!;const before=JSON.stringify(owner[e.field]);if(Array.isArray(owner[e.field]))owner[e.field]=owner[e.field].filter((r:any)=>refId(r)!==e.id);else delete owner[e.field];if(JSON.stringify(owner[e.field])!==before){pruned=true;affected.add(e.ownerSection+'|'+e.ownerId);if(!changes.some(r=>r.key===e.key))changes.push(e);}}}
 for(const row of records){
  if(row.definition.name!=='CardEffectAttachTrainRoomAttachment'||row.ownerSection!=='cards')continue;
  const upgrade=doc.upgrades?.find(item=>item.id===refId(row.definition.param_upgrade));
  if(!upgrade||!affected.has('upgrades|'+upgrade.id))continue;
  const metadata=new Set(['id','titles','descriptions','filters','icon','persistent_vfx','hide_icon_on_card','show_description_on_cards',
   'applied_vfx','skip_default_status_effect_notification']);
  if(Object.entries(upgrade).some(([key,value])=>!metadata.has(key)&&(Array.isArray(value)?value.length>0:!!value)))continue;
  const card=doc.cards?.find(item=>item.id===row.ownerId);
  if(!card?.effects?.some((ref:any)=>refId(ref)===row.id))continue;
  card.effects=card.effects.filter((ref:any)=>refId(ref)!==row.id);
  changes.push(row);
 }
 const lookup=new Map(records.map(e=>[e.key,e]));for(let i=0;i<changes.length;i++){const parent=changes[i].parent&&lookup.get(changes[i].parent!);if(parent&&!changes.some(e=>e.key===parent.key))changes.push({...parent,affectedOnly:true});}
 return changes;
}
export function activeTemplateEffects(original:Record<string,any[]>,current:Record<string,any[]>,root:{section:string;id:string},removed:string[]=[]){const active=templateEffects(current,root),identity=(e:TemplateEffect)=>JSON.stringify([e.ownerSection,e.ownerId,e.field,e.section,e.id]),live=new Set(active.map(identity));return templateEffects(original,root).filter(e=>!removed.includes(e.key)&&live.has(identity(e)));}
// 2026-11-15-2046||codex-clan-editor||clan-creator/src/server/creator/template-effects.ts||Representar y eliminar efectos activaciones auras habilidades y rasgos en todas las categorias de cartas sin retirar la invocacion estructural de unidades
// 2026-11-15-2050||codex-clan-editor||clan-creator/src/server/creator/template-effects.ts||Mantener copia sin cambios cuando no hay componentes eliminados
// 2026-11-15-2054||codex-clan-editor||clan-creator/src/server/creator/template-effects.ts||Propagar retirada de activaciones vacias a habilidades y reliquias y marcar textos de componentes dependientes
// 2026-11-19-2220||codex-clan-editor||clan-creator/src/server/creator/template-effects.ts||Conservar la selección directa cuando se borra el efecto que la establecía
// 2026-11-21-1246||codex-clan-editor||clan-creator/src/server/creator/template-effects.ts||Reutilizar la reparación de objetivos de hechizos al simplificar ejemplos
// 2026-11-21-1316||codex-clan-editor||clan-creator/src/server/creator/template-effects.ts||Exponer acciones reales de modificadores de sala y quitar el modificador vacío
// 2026-11-21-1342||codex-clan-editor||clan-creator/src/server/creator/template-effects.ts||Localizar la mejora aplicada por una carta de equipo
// 2026-11-21-1513||codex-clan-editor||clan-creator/src/server/creator/template-effects.ts||Retirar un anclaje de sala cuando deja de tener cualquier regla jugable
// 2026-11-21-1902||codex-clan-editor||clan-creator/src/server/creator/template-effects.ts||Identificar propiedades activas para evitar duplicarlas al editar o exportar
// 2026-11-21-2013||codex-clan-editor||clan-creator/src/server/creator/template-effects.ts||Recorrer acciones internas de artefactos y reconocer cartas de habilidad enlazadas
// 2026-11-21-2016||codex-clan-editor||clan-creator/src/server/creator/template-effects.ts||Conservar el objetivo previo en cadenas de artefacto y retirar contenedores de acciones verificados al quedar vacíos
