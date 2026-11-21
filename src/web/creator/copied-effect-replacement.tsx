import React from 'react';
import type {CardDraft} from '../../server/creator/model';
import {SearchSelect,type SearchOption} from './search-select';
import {effectOptions} from './effect-options';
import {local,type Language} from './presentation';

export function replaceCopiedEffect(card:CardDraft,key:string,when:string,recipe:any,target?:string){
 return {...card,copiedEffectEdits:{
  ...card.copiedEffectEdits,
  [key]:{...card.copiedEffectEdits?.[key],recipe:recipe.id,amount:recipe.amount,...(when!=='on_spawn'?{when}:{}),...(target?{target}:{})},
 }};
}

export function CopiedEffectReplacement({card,effectKey,when,caption,target,rules,language,onChange,allowedRecipes,onSelect}:{
 card:CardDraft;effectKey:string;when:string;caption:string;target?:string;rules:any;language:Language;onChange:(card:CardDraft)=>void;allowedRecipes?:string[];onSelect?:(recipe:any)=>void;
}){
 const t=(key:string)=>local(rules.labels[key],language);
 const delayed=when==='on_unplayed_positive'||when==='on_unplayed_negative';
 const options=effectOptions(rules,language,card.kind==='unit',!!allowedRecipes||card.kind!=='unit').filter((option:SearchOption)=>
  allowedRecipes?allowedRecipes.includes(option.value):!delayed||!rules.recipes.find((recipe:any)=>recipe.id===option.value)?.singleTarget);
 return <SearchSelect label={t('mechanics')} value="__copied__" placeholder={caption}
  searchPlaceholder={t('effectSearch')} emptyText={t('noEffectsFound')}
  options={[{value:'__copied__',label:caption,common:true},...options]} commonFirst moreLabel={local(rules.beginnerText.moreEffects,language)}
  onChange={value=>{
   const recipe=rules.recipes.find((choice:any)=>choice.id===value);
   if(!recipe)return;
   if(onSelect){onSelect(recipe);return;}
   onChange(replaceCopiedEffect(card,effectKey,when,recipe,target));
  }}/>;
}
// 2026-11-21-1018||codex-clan-editor||clan-creator/src/web/creator/copied-effect-replacement.tsx||Permitir sustituir una accion copiada por un efecto editable sin reemplazar el resto de la carta
// 2026-11-21-1256||codex-clan-editor||clan-creator/src/web/creator/copied-effect-replacement.tsx||Elegir el efecto directamente desde Qué hace manteniendo activación y objetivo compatibles
// 2026-11-21-1257||codex-clan-editor||clan-creator/src/web/creator/copied-effect-replacement.tsx||Tipar las opciones del selector de acciones copiado
// 2026-11-21-1309||codex-clan-editor||clan-creator/src/web/creator/copied-effect-replacement.tsx||Conservar ambos equipos al sustituir un efecto compatible
// 2026-11-21-1312||codex-clan-editor||clan-creator/src/web/creator/copied-effect-replacement.tsx||Conservar el alcance de ambos equipos al reemplazar un efecto
// 2026-11-21-1318||codex-clan-editor||clan-creator/src/web/creator/copied-effect-replacement.tsx||Reutilizar el buscador para sustituir acciones dentro del mismo contenedor nativo
// 2026-11-21-1508||codex-clan-editor||clan-creator/src/web/creator/copied-effect-replacement.tsx||Sustituir cada receta en la posición original y mantener su selección
// 2026-11-21-1825||codex-clan-editor||clan-creator/src/web/creator/copied-effect-replacement.tsx||Usar los resultados compatibles también en habilidades activadas
