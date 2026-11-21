import type {Example} from './catalog.js';
import {gameText} from './description-tokens.js';
import {unitStatusKey} from './model.js';
import {nativeEffectText} from './template-effect-text.js';
import {templateEffects} from './template-effects.js';
import {triggerLabel} from './trigger-reference.js';

export function exampleSearchText(example:Example,rules:any):string{
 const {document,root}=example;
 const phrases=new Set<string>();
 const add=(value:unknown)=>{
  if(typeof value!=='string')return;
  const plain=value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  if(plain&&/[\p{L}]/u.test(plain))phrases.add(plain);
 };
 const bilingual=(value:any)=>{add(value?.english??value?.en);add(value?.spanish??value?.es);};
 const status=(value:unknown)=>{
  const key=unitStatusKey(value);
  const named=rules.statusLabels?.[key]??rules.unitAbilities?.find((ability:any)=>ability.status===key)?.label;
  if(named){add(key);bilingual(named);}
 };
 bilingual(example.names);
 bilingual(rules.cardPresentation?.types?.[example.kind]);
 bilingual(example.descriptions);
 for(const [section,definitions] of Object.entries(document)){
  for(const definition of definitions){
   if(['cards','characters','upgrades','relics','character_triggers','card_triggers','room_modifiers','traits'].includes(section)){
    bilingual(definition.names);
    bilingual(definition.titles);
    bilingual(definition.param_description);
   }
   for(const [language,locale] of [['en','english'],['es','spanish']] as const){
    const description=definition.descriptions?.[locale];
    if(typeof description==='string'){
     add(gameText(description,document,{section,definition},language,rules));
     for(const match of description.matchAll(/\[([^\].]+)\]/g))status(match[1]);
    }
    if(['character_triggers','card_triggers'].includes(section))add(triggerLabel(definition.trigger,rules,language));
   }
   for(const field of ['starting_status_effects','status_effect_upgrades','param_status_effects']){
    for(const effect of definition[field]??[])status(effect.status);
   }
  }
 }
 const generic=new Set([
  ...Object.values(rules.labels.specialEffect??{}),
  ...Object.values(rules.labels.cardProperty??{}),
 ]);
 const rows=templateEffects(document,root);
 for(const level of example.championPath?.levels??[]){
  if(document.upgrades?.some(upgrade=>upgrade.id===level.upgradeId)){
   rows.push(...templateEffects(document,{section:'upgrades',id:level.upgradeId}));
  }
 }
 for(const row of rows)for(const language of ['en','es']){
  const text=nativeEffectText(document,row.section,row.definition,language,rules);
  if(text&&!generic.has(text.split(':')[0]))add(text);
 }
 return [...phrases].join(' ');
}
// 2026-11-21-2043||codex-clan-editor||clan-creator/src/server/creator/example-search-text.ts||Indexar textos, estados, activaciones y reglas nativas de ejemplos oficiales y comunitarios
