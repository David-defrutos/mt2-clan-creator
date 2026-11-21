import {stableText,playableContent} from './workflow-state.js';
import type {CardDraft,Draft} from './model.js';

export interface Change {name:string;field:string;recipe?:string;status?:string;before?:string|number;after?:string|number}
export function cardChanges(original:CardDraft,current:CardDraft):Change[]{
 const changes:Change[]=[];
 const covered=new Set(['uid']);
 for(const key of ['name','cost','attack','health','size','unlockLevel','rarity'] as const){
  covered.add(key);
  if(original[key]!==current[key])changes.push({name:current.name,field:key,before:original[key],after:current[key]});
 }
 const groups={appearance:['characterImage','image','appearanceTemplateId','positionY','scale'],rewards:['reward','banner']};
 for(const [field,keys] of Object.entries(groups)){
  keys.forEach(key=>covered.add(key));
  if(keys.some(key=>original[key as keyof CardDraft]!==current[key as keyof CardDraft]))changes.push({name:current.name,field});
 }
 for(const field of ['effects','abilities'] as const){
  const old=original[field]??[],now=current[field]??[];
  const withoutAmount=(item:object)=>Object.fromEntries(Object.entries(item).filter(([key])=>key!=='count'&&key!=='amount'));
  if(old.length!==now.length||old.some((item,i)=>stableText(withoutAmount(item))!==stableText(withoutAmount(now[i]))))continue;
  covered.add(field);
  for(const [i,item] of now.entries()){
   const prior=old[i];
   const before='amount' in prior?prior.amount:prior.count;
   const after='amount' in item?item.amount:item.count;
   if(before!==after)changes.push({name:current.name,field:'behavior',...('recipe' in item?{recipe:item.recipe}:{status:item.status}),before,after});
  }
 }
 const rest=(c:CardDraft)=>Object.fromEntries(Object.entries(c).filter(([key])=>!covered.has(key)));
 if(stableText(rest(original))!==stableText(rest(current)))changes.push({name:current.name,field:'behavior'});
 return changes;
}
type Snapshot=ReturnType<typeof playableContent>;
export function installationChanges(before:Snapshot,after:Snapshot){
 const changes:Change[]=[];
 const cards=(s:Snapshot)=>new Map([...s.cards,...s.starters,...s.champions.map(c=>c.card)].map(c=>[c.uid,c]));
 const old=cards(before),now=cards(after);
 for(const [id,c] of now){const prior=old.get(id);if(prior)changes.push(...cardChanges(prior,c));else changes.push({name:c.name,field:'added'});}
 for(const [id,c] of old)if(!now.has(id))changes.push({name:c.name,field:'removed'});
 for(const [i,c] of after.champions.entries())if(stableText(c.paths)!==stableText(before.champions[i]?.paths))changes.push({name:c.card.name,field:'paths'});
 if(before.icon!==after.icon||stableText(before.artwork)!==stableText(after.artwork))changes.push({name:after.name,field:'appearance'});
 if(before.name!==after.name||before.description!==after.description)changes.push({name:after.name,field:'settings'});
 return changes;
}
// 2026-11-19-0759||codex-clan-editor||clan-creator/src/server/creator/play-changes.ts||Comparar valores jugables, cartas añadidas o retiradas, arte y sendas
// 2026-11-19-0800||codex-clan-editor||clan-creator/src/server/creator/play-changes.ts||Detallar cantidades de efectos y habilidades en cambios de variantes e instalación
