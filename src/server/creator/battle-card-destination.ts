type Document = Record<string, Record<string, any>[]>;

const destinations = {
 english: {
  0:'to your draw pile',1:'to your discard pile',3:'to your hand',
  5:'on top of your draw pile',7:'to a random position in your draw pile',
 },
 spanish: {
  0:'a tu mazo de robo',1:'a tu pila de descartes',3:'a tu mano',
  5:'encima de tu mazo de robo',7:'a una posición aleatoria de tu mazo de robo',
 },
} as const;
type Locale = keyof typeof destinations;
type Destination = keyof typeof destinations.english;
const originalPhrases:Record<Locale,Partial<Record<Destination,RegExp>>> = {
 english:{1:/\bto (?:your|the) discard pile\b/gi,3:/\bto (?:(?:your|the) )?hand\b/gi,7:/\binto your deck\b/gi},
 spanish:{1:/\ba (?:tu|la) pila de descartes?\b/gi,3:/\ba (?:tu|la) mano\b/gi,7:/\ben tu mazo\b/gi},
};
const action:(locale:Locale)=>RegExp=locale=>locale==='english'?/\bShuffle\b/i:/\bMezcla\b/i;
const locales=['english','spanish'] as const;
const id=(reference:unknown)=>typeof reference==='string'?reference.replace(/^@/,''):undefined;

function ownerOf(doc:Document,effectId:string,source:Destination){
 const effects=new Map((doc.effects??[]).map(effect=>[effect.id,effect]));
 const owners=Object.values(doc).flat().filter(owner=>{
  const refs=owner.trigger_effects??owner.effects??owner.param_effects;
  return Array.isArray(refs)&&refs.some(reference=>id(reference)===effectId);
 });
 if(owners.length!==1)return undefined;
 const owner=owners[0],refs=owner.trigger_effects??owner.effects??owner.param_effects;
 const adds=refs.filter((ref:unknown)=>effects.get(id(ref))?.name==='CardEffectAddBattleCard');
 if(adds.length!==1)return undefined;
 return locales.every(locale=>{
  const phrase=originalPhrases[locale][source],text=owner.descriptions?.[locale];
  return phrase&&typeof text==='string'&&Array.from(text.matchAll(phrase)).length===1&&
   (source!==7||action(locale).test(text));
 })?owner:undefined;
}

export function canEditBattleCardDestination(doc:Document,effect:Record<string,any>){
 return effect.name==='CardEffectAddBattleCard'&&Number.isInteger(effect.param_int)&&!!ownerOf(doc,effect.id,effect.param_int);
}

export function reviseBattleCardDestinations(original:Document,current:Document){
 const originalEffects=new Map((original.effects??[]).map(effect=>[effect.id,effect]));
 for(const effect of current.effects??[]){
  const before=originalEffects.get(effect.id),from=before?.param_int as Destination,to=effect.param_int as Destination;
  if(effect.name!=='CardEffectAddBattleCard'||before?.name!==effect.name||from===to||!Object.hasOwn(destinations.english,to))continue;
  const originalOwner=ownerOf(original,effect.id,from);
  const owner=originalOwner&&ownerOf(current,effect.id,from);
  if(!owner)continue;
  owner.descriptions=Object.fromEntries(locales.map(locale=>{
   let text=owner.descriptions[locale].replace(originalPhrases[locale][from]!,destinations[locale][to]);
   if(from===7)text=text.replace(action(locale),locale==='english'?'Add':'Añade');
   return [locale,text];
  }));
 }
}
// 2026-11-22-0956||codex-clan-editor||clan-creator/src/server/creator/battle-card-destination.ts||Restringir la edición del destino a acciones y descripciones inequívocas
