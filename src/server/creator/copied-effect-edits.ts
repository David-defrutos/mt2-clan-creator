import {gameText} from './description-tokens.js';
import {applyExampleParameterValues,type ExampleParameter} from './example-parameter-values.js';
import {triggerLabel,triggerOption,triggerReference} from './trigger-reference.js';
import {effectTargetMode,effectTargetTeam,recipeDescription} from './recipe-text.js';
import {unitStatusKey,type CardDraft,type CopiedEffectEdit} from './model.js';
import {isActivatedCard,restoreSpellEffectTargets,runsRelicActions,templateEffects,type TemplateEffect} from './template-effects.js';
import {nativeEffectText,reviseEffectDescriptions,reviseMovementDescriptions,splitDescription,generatedLocales} from './template-effect-text.js';

type Doc=Record<string,Record<string,any>[]>;
type Root={section:string;id:string};
const direct='on_spawn';
const dialogActions=new Set([
 'CardEffectAddTempCardUpgradeToDeckScreenChosenCard','CardEffectChooseDiscard','CardEffectChooseMonsterToSpawnInBack',
 'CardEffectCraftSpike','CardEffectDuplicateCardInHand','CardEffectFreezeCard','CardEffectMergeEquipment','CardEffectMix','CardEffectRecursion',
]);
function automaticAction(effect:Record<string,any>){
 return typeof effect.name==='string'&&!dialogActions.has(effect.name)&&!['drop_target_character','last_targeted_characters'].includes(effect.target_mode)&&
  !(typeof effect.target_card_selection_mode==='string'&&effect.target_card_selection_mode.startsWith('choose_'));
}
const delayed=new Set(['on_unplayed_positive','on_unplayed_negative']);
const roomCombatModifiers=['RoomStateAddEffectPreCombatModifier','RoomStateAddEffectPostCombatModifier'];
const basicTargets=new Set(['room','tower','front_in_room','drop_target_character','self']);
const playerActionClasses=new Set(['CardEffectDraw','CardEffectDrawType','CardEffectGainEnergy']);
const targetedClasses=new Set(['CardEffectDamage','CardEffectHeal','CardEffectBuffDamage','CardEffectAddStatusEffect','CardEffectAddCardUpgradeToUnits']);
const otherTargetedClasses=new Set([
 'CardEffectRemoveStatusEffect','CardEffectAddTempCardUpgradeToUnits',
 'CardEffectAddCardUpgradeToUnitsPerStatusEffect','CardEffectDamagePerHp',
]);
const linked=(doc:Doc,section:string,ref:any)=>(doc[section]??[]).find(item=>item.id===String(typeof ref==='object'?ref?.id:ref).replace(/^@/,''));
export function occurrenceParameters(doc:Doc,row:TemplateEffect,parameters:readonly ExampleParameter[]){
 const upgrade=linked(doc,'upgrades',row.definition.param_upgrade);
 return parameters.filter(item=>item.section===row.section&&item.id===row.id||
  item.section==='upgrades'&&item.id===upgrade?.id);
}

export function applyOccurrenceParameters(doc:Doc,definition:Record<string,any>,parameters:readonly ExampleParameter[],values:Record<string,number>){
 const selected=parameters.filter(item=>Object.hasOwn(values,item.key));
 const direct=selected.filter(item=>item.section==='effects').map(item=>({...item,id:definition.id}));
 applyExampleParameterValues({effects:[definition]},direct,values);
 const nested=selected.filter(item=>item.section==='upgrades');
 if(!nested.length)return;
 const upgrade=linked(doc,'upgrades',definition.param_upgrade);
 if(!upgrade)return;
 let id='CreatorUpgrade_'+definition.id;
 while(linked(doc,'upgrades',id))id+='_';
 const copy={...structuredClone(upgrade),id};
 applyExampleParameterValues({upgrades:[copy]},nested.map(item=>({...item,id})),values);
 doc.upgrades.push(copy);
 definition.param_upgrade='@'+id;
}

const structuralEffectClasses=new Set([
 'CardEffectNULL','CardEffectAttachEquipment','CardEffectAttachTrainRoomAttachment','CardEffectSpawnMonster',
]);
const isPlayerAction=(effect:Record<string,any>)=>playerActionClasses.has(effect.name)||
 effect.name==='CardEffectAddBattleCard'&&effect.target_team==='none';
const unitAction=(row:TemplateEffect,owner?:Record<string,any>)=>row.section==='effects'&&(
 row.ownerSection==='character_triggers'||owner?.is_an_ability===true&&row.definition.target_mode==='self'
);
const hasSelectionFilter=(effect:Record<string,any>)=>Object.keys(effect).some(key=>
 /^target_(?:subtype|mode2|team2)|param_card_(?:filter|upgrade_mask)/.test(key)&&effect[key]!==undefined);
const basicTarget=(effect:Record<string,any>)=>basicTargets.has(effect.target_mode)&&!hasSelectionFilter(effect);
const timedWithoutDrop=(effect:Record<string,any>)=>['room','tower','pyre','front_in_room'].includes(effect.target_mode)&&!hasSelectionFilter(effect);
const unitTarget=(effect:Record<string,any>)=>['self','front_in_room','room'].includes(effect.target_mode)&&
 ['heroes','monsters'].includes(effect.target_team);
export function targetForDefinition(effect:Record<string,any>,unit:boolean){
 const enemy=effect.target_team==='heroes';
 if(['room','tower'].includes(effect.target_mode)&&['monsters','heroes','both'].includes(effect.target_team)){
  const scope=effect.target_mode==='tower'?'all_floors_':'all_';
  return scope+(effect.target_team==='both'?'units':enemy?'enemy':'friendly');
 }
 if(unit&&effect.target_mode==='self')return 'friendly';
 if(!unit&&effect.target_mode==='drop_target_character'&&effect.target_team==='both')return 'spell_target';
 if(effect.target_mode==='drop_target_character'&&['heroes','monsters'].includes(effect.target_team)||unit&&unitTarget(effect))return enemy?'enemy':'friendly';
}
export function spellTimingOptions(rules:any,canDelay:boolean){
 return (rules.spellTimings??[]).filter((timing:any)=>canDelay||timing.value===direct);
}
export function copiedEffectControls(kind:CardDraft['kind'],doc:Doc,root:Root,row:TemplateEffect,rules:any,edit?:CopiedEffectEdit){
 const effect=row.definition,owner=linked(doc,row.ownerSection,row.ownerId);
 const spell=['spell','blight','junk'].includes(kind)&&root.section==='cards';
 const isAbility=isActivatedCard(doc,row.ownerSection==='cards'?owner:undefined);
 const directSpell=spell&&!isAbility&&row.ownerSection==='cards'&&row.ownerId===root.id&&row.field==='effects'&&row.section==='effects';
 const spellTrigger=spell&&row.ownerSection==='cards'&&row.ownerId===root.id&&row.section==='card_triggers'&&
  [direct,'on_cast',...delayed].includes(effect.trigger);
 const unitTrigger=row.section==='character_triggers'&&
  !!triggerOption(effect.trigger,rules);
 const roomTiming=row.section==='room_modifiers'&&roomCombatModifiers.includes(effect.name)&&effect.param_effects?.length;
 const triggerEffects=[...(effect.effects??[]),...(effect.trigger_effects??[])].map(ref=>linked(doc,'effects',ref));
 const simpleTrigger=triggerEffects.length&&triggerEffects.every(child=>child&&automaticAction(child));
 const when=directSpell?direct:roomTiming?effect.name:spellTrigger||unitTrigger?unitStatusKey(effect.trigger):undefined;
 const characterAction=unitAction(row,owner);
 const internalRelicAction=row.ownerSection==='relic_effects'&&row.field==='param_effects';
 const nestedAction=row.section==='effects'&&['character_triggers','card_triggers','room_modifiers','relic_effects'].includes(row.ownerSection)&&
  (!internalRelicAction||runsRelicActions(owner));
 const roomAction=kind==='room'&&row.ownerSection==='cards'&&row.ownerId===root.id&&row.section==='effects';
 const abilityAction=row.section==='effects'&&isAbility;
 const action=directSpell||nestedAction||roomAction||abilityAction;
 const selectedRecipe=rules.recipes.find((r:any)=>r.id===edit?.recipe);
 const mixWithSingleAction=directSpell&&effect.name==='CardEffectMix'&&owner?.effects?.length===1;
 const targetingMixReplacement=mixWithSingleAction&&selectedRecipe&&selectedRecipe.target!=='none';
 const target=targetingMixReplacement?'spell_target':action?targetForDefinition(effect,characterAction):undefined;
 const knownTargetedAction=targetedClasses.has(effect.name)||otherTargetedClasses.has(effect.name);
 const editableAction=action&&!structuralEffectClasses.has(effect.name)&&
  !effect.should_cancel_subsequent_effects_if_test_fails;
 const selectable=target&&(targetingMixReplacement||basicTarget(effect)&&(knownTargetedAction||editableAction&&!!edit?.recipe));
 const relicRecipient=nestedAction&&internalRelicAction&&effect.target_mode==='self'&&
  effect.target_team!=='none'&&!hasSelectionFilter(effect);
 const castOnly=selectedRecipe?selectedRecipe.castOnly:effect.name==='CardEffectMix';
 const canDelay=directSpell&&!castOnly&&(automaticAction(effect)&&timedWithoutDrop(effect)||selectedRecipe?.target==='none'||
  (selectedRecipe||!dialogActions.has(effect.name))&&selectable&&edit?.target?.startsWith('all_'))||spellTrigger&&simpleTrigger;
 const times=directSpell?spellTimingOptions(rules,Boolean(canDelay)):
  spellTrigger&&canDelay?(rules.officialCardTriggers??[]).filter((value:any)=>value.value===effect.trigger||value.value==='on_cast'||delayed.has(value.value)):
  unitTrigger&&simpleTrigger?rules.triggers.filter((option:any)=>{
   const scope=rules.copiedUnitTriggerScopes?.[kind];
   return !scope||option.value===when||scope.includes(option.value);
  }):
  roomTiming?roomCombatModifiers.map(value=>({value,label:rules.nativeRoomTiming[value]})):[];
 const recipes=!editableAction?[]:rules.recipes.filter((recipe:any)=>{
  // Mix opens a game dialog, so it belongs in manually played actions.
  if(recipe.castOnly)return directSpell&&(isPlayerAction(effect)||effect.name==='CardEffectMix'||
   owner?.effects?.length===1&&!!target&&basicTarget(effect))||abilityAction&&effect.name==='CardEffectMix';
  if(relicRecipient)return recipe.target!=='none'&&recipe.id!=='max_health'&&targetedClasses.has(recipe.class);
  if((mixWithSingleAction&&recipe.target!=='none')||target&&basicTarget(effect))return recipe.target!=='none'&&recipe.id!=='max_health'&&
   (directSpell||targetedClasses.has(recipe.class))&&(!recipe.singleTarget||!(edit?.target??target??'spell_target').startsWith('all_'));
  return (isPlayerAction(effect)||effect.name==='CardEffectMix')&&recipe.target==='none'&&playerActionClasses.has(recipe.class);
 });

 const selectedMode=edit?.when??when;
 const otherSelectedTeam=directSpell?(owner?.effects??[])
  .filter((ref:string)=>ref!=='@'+row.id).map((ref:string)=>linked(doc,'effects',ref))
  .find((other:any)=>other?.target_mode==='drop_target_character')?.target_team:undefined;
 const editedRecipe=recipes.find((recipe:any)=>recipe.id===edit?.recipe);
 const targets=selectable&&editedRecipe?.target!=='none'?(rules.targets??[]).filter((value:any)=>{
  if(value.value==='spell_target'&&target!=='spell_target'||value.value.startsWith('all_')&&recipes.find((recipe:any)=>recipe.id===edit?.recipe)?.singleTarget)return false;
  if(characterAction||value.value.startsWith('all_'))return true;
  if(!directSpell&&!abilityAction)return false;
  return !delayed.has(selectedMode)&&(value.value==='spell_target'||!otherSelectedTeam||otherSelectedTeam==='both'||otherSelectedTeam===effectTargetTeam(value.value));
 }):[];
 return {when,times:times.filter((value:any)=>!delayed.has(value.value)||!edit?.target||edit.target.startsWith('all_')),target,targets,recipes,unitTarget:characterAction};
}

export function validateCopiedEffectEdits(card:CardDraft,doc:Doc,root:Root,rules:any,parameters:readonly ExampleParameter[]=[]){
 const edits=card.copiedEffectEdits;
 if(edits===undefined)return true;
 if(!edits||typeof edits!=='object'||Array.isArray(edits)||Object.keys(edits).length>500)return false;
 const rows=new Map(templateEffects(doc,root).map(row=>[row.key,row]));
 return Object.entries(edits).every(([key,edit])=>{
  const row=rows.get(key);
  if(!row||!edit||typeof edit!=='object'||Array.isArray(edit)||Object.keys(edit).some(k=>!['when','target','recipe','amount','parameters'].includes(k)))return false;
  const controls=copiedEffectControls(card.kind,doc,root,row,rules,edit);
  const recipe=controls.recipes.find((value:any)=>value.id===edit.recipe);
  const validAction=edit.recipe===undefined?edit.amount===undefined:recipe&&typeof edit.amount==='number'&&
   Number.isInteger(edit.amount)&&edit.amount>=(recipe.minimumAmount??0)&&edit.amount<=rules.limits.maxNumber&&(!recipe.fixedAmount||edit.amount===1);
  const overrides=edit.parameters;
  const validParameters=overrides===undefined||!edit.recipe&&row.section==='effects'&&isSharedEffect(doc,row.id)&&
   overrides&&typeof overrides==='object'&&!Array.isArray(overrides)&&Object.entries(overrides).every(([key,value])=>{
    const parameter=occurrenceParameters(doc,row,parameters).find(item=>item.key===key);
    return parameter&&Number.isInteger(value)&&value>=(parameter.minimum??-rules.limits.maxNumber)&&value<=(parameter.maximum??rules.limits.maxNumber)&&
     (!parameter.choices||parameter.choices.includes(value));
   });
  return validAction&&validParameters&&(edit.when===undefined||controls.times.some((value:any)=>value.value===edit.when))&&
   (edit.target===undefined||controls.targets.some((value:any)=>value.value===edit.target));
 });
}

function editedEffectText(doc:Doc,effect:Record<string,any>,language:string,rules:any,unit=false){
 const recipe=({CardEffectDamage:'damage',CardEffectHeal:'heal',CardEffectBuffDamage:'attack'} as Record<string,string>)[effect.name];
 const target=targetForDefinition(effect,unit);
 if(recipe&&target&&Number.isFinite(effect.param_int))return recipeDescription({recipe,amount:effect.param_int,target,when:direct},rules,language,unit);
 if(effect.name==='CardEffectMix')return '[mix].';
 const playerRecipe=effect.name==='CardEffectDraw'?'draw':effect.name==='CardEffectGainEnergy'?'energy':undefined;
 if(playerRecipe&&Number.isFinite(effect.param_int)){
  return recipeDescription({recipe:playerRecipe,amount:effect.param_int,target:'none',when:direct},rules,language,unit);
 }
 if(target&&effect.name==='CardEffectAddStatusEffect'&&effect.param_status_effects?.length){
  const choices=effect.param_status_effects.map((entry:any)=>({
   recipe:rules.recipes.find((choice:any)=>choice.status===unitStatusKey(entry.status))?.id,
   amount:entry.count,
   target,
   when:direct,
  }));
  if(choices.every((choice:any)=>choice.recipe&&Number.isFinite(choice.amount))){
   return choices.map((choice:any)=>recipeDescription(choice,rules,language,unit)).join(' ');
  }
 }
 return nativeEffectText(doc,'effects',effect,language,rules);
}

function reviseTargetText(doc:Doc,owner:Record<string,any>,changed:Set<string>,rules:any,unit=false,changedClasses=new Set<string>()){
 if(!changed.size||!Object.entries(owner.descriptions??{}).some(([locale,text])=>locale!=='key'&&typeof text==='string'&&text.trim()))return;
 const effects=(owner.effects??owner.trigger_effects??owner.param_effects??[]).map((ref:unknown)=>linked(doc,'effects',ref));
 if(!effects.some((effect:any)=>effect&&changed.has(effect.id)))return;
 const original=owner.descriptions??{};
 owner.descriptions=Object.fromEntries(Object.entries(generatedLocales).map(([locale,language])=>{
  const summarize=(effect:any)=>editedEffectText(doc,effect,language,rules,unit);
  const message=original[locale];
  const fresh=()=>effects.filter(Boolean).map(summarize).filter(Boolean).join(' ');
  if(typeof message!=='string'||effects.length===1||effects.some((effect:any)=>effect&&changedClasses.has(effect.id))){
   return [locale,fresh()];
  }
  const referenced=new Set([...message.matchAll(/\[(?:trigger)?effect(\d+)\./gi)].map(match=>Number(match[1])));
  if(effects.some((effect:any,index:number)=>effect&&!referenced.has(index)))return [locale,fresh()];
  const summaries=effects.map((effect:any)=>effect&&changed.has(effect.id)?summarize(effect):'');
  let found=false;
  const revised=splitDescription(message).map(sentence=>{
   const indices=[...sentence.matchAll(/\[(?:trigger)?effect(\d+)\./gi)].map(match=>Number(match[1]));
   if(!indices.some(index=>summaries[index]))return sentence;
   found=true;
   return [...new Set(indices)].map(index=>effects[index]&&summarize(effects[index])).filter(Boolean).join(' ');
  });
  return [locale,found?revised.join(' '):fresh()];
 }));
}

export function isSharedEffect(doc:Doc,id:string){
 let references=0;
 for(const definitions of Object.values(doc))for(const owner of definitions)
  for(const field of ['effects','trigger_effects','param_effects']){
   if(!Array.isArray(owner[field]))continue;
   for(const reference of owner[field]){
    const ref=typeof reference==='object'&&!reference?.mod_reference?reference?.id:reference;
    if((ref==='@'+id||ref===id)&&++references>1)return true;
   }
  }
 return false;
}

export function applyCopiedEffectEdits(doc:Doc,original:Doc,root:Root,card:CardDraft,rules:any,parameters:readonly ExampleParameter[]=[]){
 const edits=card.copiedEffectEdits??{};
 const originalRows=templateEffects(original,root),removed=new Set(card.removedTemplateEffects);
 const owner=linked(doc,root.section,root.id);
 const moves:TemplateEffect[]=[],changedTargets=new Set<string>(),changedClasses=new Set<string>();
 const changes=new Map<string,{owner:Record<string,any>;ids:Set<string>;unit:boolean}>();
 const changedBranches=new Set<string>();
 const quantityOwners=new Map<Record<string,any>,{previous:readonly unknown[];field:string}>();
 const localCopies=new Map<string,{id:string;source:Record<string,any>}>();
 let movementChanged=false;
 for(let row of originalRows){
  let definition=linked(doc,row.section,row.id);
  if(!definition||removed.has(row.key))continue;
  if(row.ownerId===root.id&&row.definition.name==='CardEffectAddBattleCard'&&row.definition.param_int_2!==definition.param_int_2){
   changedTargets.add(row.id);
   changedClasses.add(row.id);
  }
  const edit=edits[row.key];
  if(!edit)continue;
  const parent=linked(doc,row.ownerSection,row.ownerId);
  if(parent&&edit.parameters&&!edit.recipe&&Array.isArray(parent[row.field])&&!quantityOwners.has(parent)){
   quantityOwners.set(parent,{previous:[...parent[row.field]],field:row.field});
  }
  const scoped=edit.parameters?occurrenceParameters(original,row,parameters):[];
  if(row.section==='effects'&&parent&&row.index>=0&&Array.isArray(parent[row.field])&&isSharedEffect(doc,row.id)){
   const index=row.index-originalRows.filter(other=>other.ownerSection===row.ownerSection&&other.ownerId===row.ownerId&&
    other.field===row.field&&other.index>=0&&other.index<row.index&&removed.has(other.key)).length;
   if(linked(doc,'effects',parent[row.field][index])?.id===row.id){
    let id='CreatorEffect_'+row.index+'_'+row.id;
    while(linked(doc,'effects',id))id+='_';
    definition={...structuredClone(definition),id};
    doc.effects.push(definition);
    parent[row.field][index]='@'+id;
    localCopies.set(row.key,{id,source:row.definition});
    row={...row,id};
   }
  }
  if(edit.parameters&&!edit.recipe){
   const previousMovement=['CardEffectFloorRearrange','CardEffectBump'].includes(definition.name)?definition.param_int??0:undefined;
   applyOccurrenceParameters(doc,definition,scoped,edit.parameters);
   if(previousMovement!==undefined&&previousMovement!==(definition.param_int??0))movementChanged=true;
  }
  const unit=unitAction(row,parent);
  if(edit.recipe){
   const recipe=rules.recipes.find((item:any)=>item.id===edit.recipe);
   const newAction=definition.name!==recipe.class||!!definition.param_status_effects?.length;
   if(newAction){
    changedClasses.add(row.id);
    for(const key of Object.keys(definition))if(key!=='id'&&!key.startsWith('target_'))delete definition[key];
   }
   definition.name=recipe.class;
   if(recipe.target==='none'&&(newAction||recipe.class!=='CardEffectMix')){
    for(const field of Object.keys(definition))if(field.startsWith('target_'))delete definition[field];
    if(recipe.class!=='CardEffectMix'){definition.target_team='none';definition.target_mode='room';}
   }
   if(newAction&&recipe.cardPool)definition.param_card_pool=recipe.cardPool;
   if(row.definition.name==='CardEffectMix'&&recipe.target!=='none'&&!edit.target){
    definition.target_team='both';definition.target_mode='drop_target_character';
   }
   if(recipe.status){
    const status=rules.unitAbilities.find((item:any)=>item.status===recipe.status)?.reference??recipe.status;
    definition.param_status_effects=[{status:structuredClone(status),count:edit.amount}];
   }else{
    const value=recipe.paramInt??edit.amount;
    if(definition.name==='CardEffectFloorRearrange'&&(definition.param_int??0)!==value)movementChanged=true;
    definition.param_int=value;
   }
  }
  if(edit.target){
   definition.target_team=edit.target==='spell_target'?'both':effectTargetTeam(edit.target);
   definition.target_mode=effectTargetMode(edit.target,unit);
  }
  if(edit.target||changedClasses.has(row.id)){
   if(row.ownerId===root.id)changedTargets.add(row.id);
   else if(parent){
    if(row.ownerSection==='room_modifiers'&&changedClasses.has(row.id))delete parent.triggered_vfx;
    const key=row.ownerSection+'|'+row.ownerId,change=changes.get(key)??{owner:parent,ids:new Set<string>(),unit};
    change.ids.add(row.id);
    changes.set(key,change);
   }
  }
  if(edit.target||edit.recipe||edit.when||edit.parameters)changedBranches.add(row.key);
  if(!edit.when)continue;
  if(row.section==='character_triggers')definition.trigger=triggerReference(edit.when,rules);
  else if(row.section==='card_triggers')definition.trigger=edit.when;
  else if(row.section==='room_modifiers')definition.name=edit.when;
  else if(edit.when!==direct&&owner?.effects?.includes('@'+row.id))moves.push(row);
 }
 for(const [quantityOwner,{previous,field}] of quantityOwners){
  reviseSharedAmountDescriptions(doc,original,quantityOwner,previous,field,rules);
 }
 if(movementChanged){
  const copies=[...localCopies.values()].map(copy=>({...copy.source,id:copy.id}));
  reviseMovementDescriptions({...original,effects:[...(original.effects??[]),...copies]},doc);
 }
 if(moves.length&&owner){
  const selected=new Set(moves.map(row=>'@'+row.id));
  const indices=new Set<number>(owner.effects.flatMap((ref:string,index:number)=>selected.has(ref)?[index]:[]));
  const before={...owner,effects:[...owner.effects]};
  restoreSpellEffectTargets(doc,owner,indices);
  owner.effects=owner.effects.filter((ref:string)=>!selected.has(ref));
  const removedRows=moves.map(row=>({...row,index:before.effects.indexOf('@'+row.id)}));
  reviseEffectDescriptions({...doc,[root.section]:[before]},doc,removedRows,rules);
  const triggers=doc.card_triggers??=[];
  for(const row of moves){
   const definition=linked(doc,'effects',row.id);
   let id='CreatorTiming_'+row.id;
   while(triggers.some(trigger=>trigger.id===id))id+='_';
   const descriptions=Object.fromEntries([['english','en'],['spanish','es']].map(([locale,language])=>[
    locale, editedEffectText(doc,definition!,language,rules),
   ]));
   triggers.push({id,trigger:edits[row.key].when,effects:['@'+row.id],descriptions});
   (owner.triggers??=[]).push('@'+id);
  }
 }
 for(const change of changes.values())reviseTargetText(doc,change.owner,change.ids,rules,change.unit,changedClasses);
 if(owner&&changedTargets.size){
  reviseTargetText(doc,owner,changedTargets,rules,false,changedClasses);
  if(['spell','blight','junk'].includes(card.kind))owner.targetless=!(owner.effects??[]).some((ref:string)=>linked(doc,'effects',ref)?.target_mode==='drop_target_character');
 }
 if(card.kind==='room'&&owner){
  const activeRows=originalRows.map(row=>({...row,id:localCopies.get(row.key)?.id??row.id}));
  refreshRoomText(doc,activeRows,owner,changedBranches,rules);
 }
 if(card.kind==='artifact'&&owner&&changedBranches.size)refreshArtifactText(doc,root,owner,changedBranches,rules);
}

function reviseSharedAmountDescriptions(doc:Doc,original:Doc,owner:Record<string,any>,previous:readonly unknown[],field:string,rules:any){
 if(!owner.descriptions||previous.length!==owner[field]?.length)return;
 const definitions=previous.map(ref=>linked(original,'effects',ref));
 // A first hit may have its own definition for visuals or to establish the target for later hits.
 const comparable=definitions.map(effect=>{
  if(effect?.name!=='CardEffectDamage')return;
  const fields=Object.entries(effect).filter(([key])=>
   !['id','applied_vfx','should_test'].includes(key)).sort(([a],[b])=>a.localeCompare(b));
  return JSON.stringify(fields.map(([key,value])=>[key,key==='target_mode'&&value==='last_targeted_characters'?
   'drop_target_character':value]));
 });
 const pattern=/\[((?:trigger)?effect)(\d+)\.([\w.]+)\]/gi;
 for(const [locale,message] of Object.entries(owner.descriptions)){
  if(locale==='key'||typeof message!=='string')continue;
  const tags=[...message.matchAll(pattern)];
  const revised=message.replace(pattern,(tag,prefix,index,suffix)=>{
   const source=definitions[Number(index)];
   if(!source)return tag;
   const signature=comparable[Number(index)];
   const siblings=definitions.flatMap((effect,i)=>effect&&(effect.id===source.id||signature&&signature===comparable[i])?[i]:[]);
   const repeats=new Set(siblings.map(i=>definitions[i]?.id)).size<siblings.length;
   if(!repeats||tags.some(other=>Number(other[2])!==Number(index)&&siblings.includes(Number(other[2]))&&
    other[3].toLowerCase()===suffix.toLowerCase()))return tag;
   const context={section:field==='effects'?'cards':'character_triggers',definition:owner};
   const replacements=siblings.map(i=>'['+prefix+i+'.'+suffix+']');
   const values=replacements.map(value=>gameText(value,doc,context,'en',rules));
   return values.every(value=>/^-?\d+$/.test(value))&&new Set(values).size>1?replacements.join(' / '):tag;
  });
  if(revised===message)continue;
  owner.descriptions[locale]=revised;
  delete owner.descriptions.key;
 }
}

function refreshArtifactText(doc:Doc,root:Root,owner:Record<string,any>,changed:Set<string>,rules:any){
 const rows=templateEffects(doc,root);
 const children=(row:TemplateEffect)=>rows.filter(candidate=>candidate.parent===row.key);
 const affected=(row:TemplateEffect):boolean=>changed.has(row.key)||children(row).some(affected);
 const sources=rows.filter(row=>row.ownerSection==='relics'&&row.ownerId===root.id&&row.section==='relic_effects');
 const changedIndexes=new Set(sources.filter(affected).map(source=>source.index));
 if(!changedIndexes.size)return;
 const describe=(source:TemplateEffect,language:string):string=>{
  const triggers=children(source).filter(row=>row.section==='character_triggers');
  if(!triggers.length)return nativeEffectText(doc,'relic_effects',source.definition,language,rules);
  return triggers.map(trigger=>{
   if(trigger.definition.descriptions?.[language==='es'?'spanish':'english'])
    return nativeEffectText(doc,'character_triggers',trigger.definition,language,rules);
   const timing=triggerLabel(trigger.definition.trigger,rules,language);
   const actions=children(trigger).filter(action=>action.section==='effects')
    .map(action=>editedEffectText(doc,action.definition,language,rules,true)).filter(Boolean).join(' ');
   return timing&&actions?timing+': '+actions:actions;
  }).filter(Boolean).join(' ');
 };
 owner.descriptions=Object.fromEntries(Object.entries(generatedLocales).map(([locale,language])=>{
  const message=owner.descriptions?.[locale],seen=new Set<number>();
  if(sources.length===1&&sources[0].definition.param_effects?.length)return [locale,describe(sources[0],language)];
  const render=(index:number)=>{
   if(seen.has(index))return '';
   seen.add(index);
   const source=sources.find(candidate=>candidate.index===index);
   return source?describe(source,language):'';
  };
  const sentences=typeof message==='string'?splitDescription(message).map(sentence=>{
   const indexes=[...sentence.matchAll(/\[effect(\d+)\./gi)].map(match=>Number(match[1]));
   return indexes.some(index=>changedIndexes.has(index))?indexes.map(render).filter(Boolean).join(' '):sentence;
  }):[];
  for(const index of changedIndexes)sentences.push(render(index));
  return [locale,sentences.filter(Boolean).join(' ')];
 }));
}

function refreshRoomText(doc:Doc,rows:TemplateEffect[],owner:Record<string,any>,changed:Set<string>,rules:any){
 if(!changed.size||!owner.descriptions)return;
 const children=(row:TemplateEffect)=>rows.filter(child=>child.parent===row.key);
 const affected=(row:TemplateEffect):boolean=>changed.has(row.key)||children(row).some(affected);
 const rootRows=rows.filter(row=>!row.parent&&row.ownerId===owner.id&&row.field==='effects');
 if(!rootRows.some(affected))return;
 const live=new Set(templateEffects(doc,{section:'cards',id:owner.id}).map(row=>row.section+'|'+row.id));
 const roomSummary=(row:TemplateEffect,language:string):string=>{
  if(!live.has(row.section+'|'+row.id))return '';
  const effect=linked(doc,row.section,row.id);
  if(!effect)return '';
  const nested=children(row);
  if(effect.name==='CardEffectAttachTrainRoomAttachment'){
   return nested.map(child=>roomSummary(child,language)).filter(Boolean).join(' ');
  }
  if(nested.length&&['character_triggers','room_modifiers'].includes(row.section)){
   const timing=triggerLabel(effect.trigger,rules,language)||rules.nativeRoomTiming[effect.name]?.[language];
   const actions=nested.map(child=>roomSummary(child,language)).filter(Boolean).join(' ');
   return timing&&actions?timing+': '+actions:actions;
  }
  const action=row.section==='effects'?editedEffectText(doc,effect,language,rules,row.ownerSection==='character_triggers'):
   nativeEffectText(doc,row.section,effect,language,rules);
  return action&&!/[.!?]$/.test(action)?action+'.':action;
 };
 // Preserve mixed modifiers whose full description cannot be reconstructed from their definitions.
 const allSummarizable=rootRows.every(row=>row.definition.name==='CardEffectAttachTrainRoomAttachment'&&
  children(row).length&&children(row).every(group=>['character_triggers','room_modifiers'].includes(group.section)));
 if(!allSummarizable)return;
 owner.descriptions=Object.fromEntries([['english','en'],['spanish','es']].map(([locale,language])=>[
  locale,rootRows.map(row=>roomSummary(row,language)).filter(Boolean).join(' '),
 ]));
}
// 2026-11-21-1255||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Compartir los cambios de activación y objetivo entre formulario, visor y exportador
// 2026-11-21-1256||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Actualizar el texto de los efectos cuyo objetivo cambia y mostrar destinatarios de Reserve
// 2026-11-21-1258||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Conservar el texto de efectos intactos al trasladar otro a Reserva
// 2026-11-21-1301||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Evitar que un efecto con ambos equipos aparezca como si estuviera limitado a aliados
// 2026-11-21-1309||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Editar los efectos copiados que afectan a ambos equipos del piso
// 2026-11-21-1312||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Editar todos los pisos en copias y actualizar el texto de Dazed y otros estados
// 2026-11-21-1317||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Editar acciones en sus contenedores nativos, incluidas salas, equipos, artefactos y sendas
// 2026-11-21-1318||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Mantener cada selector dentro de los objetivos que admite su acción
// 2026-11-21-1320||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Permitir sustituir acciones de robo o energía en sus activaciones nativas
// 2026-11-21-1341||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Editar la activación Accursed sin convertir la referencia de Conductor en una cadena
// 2026-11-21-1342||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Ofrecer edición en acciones habituales de equipo como mejoras temporales y estados dependientes
// 2026-11-21-1508||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Mantener posición y selección al modificar un hechizo y quitar el VFX incompatible de una sala
// 2026-11-21-1510||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Regenerar descripciones de destino en idiomas conocidos y actualizar la descripción de artefactos editados
// 2026-11-21-1510||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Actualizar también el texto de una carta añadida al cambiar exclusivamente la cantidad
// 2026-11-21-1513||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Conservar las acciones hermanas sin token cuando se cambia la descripción de una cadena
// 2026-11-21-1515||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Editar solo la aparición seleccionada cuando un hechizo comparte la misma referencia varias veces
// 2026-11-21-1555||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Aislar cada referencia compartida entre disparadores, actualizar Advance y Retreat y preservar los textos ausentes
// 2026-11-21-1555||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Contar solo listas de referencias de acciones del juego
// 2026-11-21-1556||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Actualizar en la ficha del artefacto solo las reglas editadas y conservar el texto de las demás
// 2026-11-21-1557||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Aplicar y validar cantidades específicas en acciones con varias referencias
// 2026-11-21-1619||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Aislar mejoras anidadas y actualizar el texto de cantidades distintas en acciones repetidas
// 2026-11-21-1622||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Mostrar todas las cantidades cuando el primer impacto de una repetición tiene una definición propia
// 2026-11-21-1813||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Editar acciones de habilidades activadas y más efectos copiados dentro de su contenedor original
// 2026-11-21-1814||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Conservar el texto nativo en cambios con la misma clase de acción
// 2026-11-21-1825||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Ofrecer Mix en acciones manuales sin mover el diálogo a una activación automática
// 2026-11-21-1827||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Permitir cambiar Mix por efectos con destinatario cuando es la única acción del hechizo
// 2026-11-21-1904||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Separar la edición de activación de la receta y conservar la compatibilidad observada por tipo de carta
// 2026-11-21-1905||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Conservar la edición de desplazamiento localizado cuando su acción está compartida
// 2026-11-21-1909||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Evitar que una activación trasladada dependa del objetivo de una acción anterior
// 2026-11-21-2013||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Ofrecer cambios de acción cuando se puede conservar el destinatario de un artefacto y reconocer habilidades de sala
// 2026-11-21-2015||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Reescribir la descripción de un artefacto de una regla a partir de sus acciones activas
// 2026-11-21-2016||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Limitar sustituciones de artefactos a contenedores que ejecutan las acciones y mantener la capacidad de sus destinatarios
// 2026-11-21-2142||codex-clan-editor||clan-creator/src/server/creator/copied-effect-edits.ts||Eliminar un espacio sobrante antes del cálculo de la activación seleccionada
