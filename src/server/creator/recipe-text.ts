import type {EffectChoice} from './model.js';

export function effectTargetTeam(target:string){
 return target.endsWith('_units')?'both':target.endsWith('enemy')?'heroes':'monsters';
}
export function effectTargetsAllFloors(target:string){
 return target.startsWith('all_floors_');
}

export function effectTargetMode(target:string,unit:boolean){
 if(effectTargetsAllFloors(target))return 'tower';
 if(target.startsWith('all_'))return 'room';
 if(!unit)return 'drop_target_character';
 return target==='enemy'?'front_in_room':'self';
}

export function recipeDescription(choice:EffectChoice,rules:any,language:string,unit=false){const target=rules.targets.find((t:any)=>t.value===choice.target);const single=!unit&&!choice.target.startsWith('all_');const template=(single?rules.spellRecipeDescriptions:rules.recipeDescriptions)?.[choice.recipe]?.[language]??'';const recipe=rules.recipes.find((r:any)=>r.id===choice.recipe);let text=(recipe?.fixedAmount?template.replace(' {amount}',''):template).replace('{amount}',String(choice.amount)).replace('{target}',(unit?target?.unitLabel:target?.label)?.[language]?.toLocaleLowerCase()??'');if(choice.duration==='run')text=rules.labels.permanentEffect[language].replace('{text}',text);return text;}
export function spellRecipientTeam(document:Record<string,any[]>,root:any,choices:EffectChoice[],rules:any){const effects=(root?.effects??[]).map((ref:any)=>(document.effects??[]).find(e=>e.id===String(typeof ref==='object'?ref.id:ref).replace(/^@/,'')));const native=effects.find((e:any)=>e?.target_mode==='drop_target_character'&&['monsters','heroes','both'].includes(e.target_team));if(native)return native.target_team;const previous=choices.find(c=>['friendly','enemy'].includes(c.target));if(previous)return previous.target==='enemy'?'heroes':'monsters';const first=choices.find(c=>c.target==='spell_target');const recipe=rules.recipes.find((r:any)=>r.id===first?.recipe);return recipe?.spellTeam??(recipe?.target==='enemy'?'heroes':'monsters');}
// 2026-11-15-2107||codex-clan-editor||clan-creator/src/server/creator/recipe-text.ts||Compartir texto de efectos entre visor y generador y resolver destinatario nativo del hechizo
// 2026-11-15-2117||codex-clan-editor||clan-creator/src/server/creator/recipe-text.ts||No mostrar numero al conceder Quick y otras capacidades de cantidad fija
// 2026-11-19-2142||codex-clan-editor||clan-creator/src/server/creator/recipe-text.ts||Permitir dirigir el movimiento a una unidad aliada o enemiga
// 2026-11-21-1309||codex-clan-editor||clan-creator/src/server/creator/recipe-text.ts||Compartir el equipo objetivo para cartas nuevas y copiadas
// 2026-11-21-1312||codex-clan-editor||clan-creator/src/server/creator/recipe-text.ts||Compartir el alcance nativo de piso y de tren para cartas nuevas y copiadas
