import {equipmentUpgrade} from '../../server/creator/template-effects';
import {unitStatusKey} from '../../server/creator/model';
import {activeInitialUpgrades} from './template-upgrades';
import type {CardDraft} from '../../server/creator/model';
export interface InheritedAbility {status:string;count:number;key?:string}
export function inheritedAbilities(card:CardDraft,template:any):InheritedAbility[]{
 if(!['unit','equipment'].includes(card.kind)||!template?.example)return [];const e=template.example,doc=e.document,get=(sec:string,ref:any)=>(doc[sec]??[]).find((x:any)=>x.id===String(ref).replace(/^@/,'')),root=get(e.root.section,e.root.id),result:InheritedAbility[]=[];
 function add(values:any[],section:string,id:string,field:string){for(const [i,value]of (values??[]).entries()){const p=template.parameters?.find((p:any)=>p.section===section&&p.id===id&&p.path.join('|')===[field,i,'count'].join('|'));result.push({status:unitStatusKey(value.status),count:p?card.parameters[p.key]??p.value:value.count,...(p?{key:p.key}:{})});}}
 if(card.kind==='equipment'){
  const upgrade=equipmentUpgrade(doc,root);
  if(upgrade)add(upgrade.status_effect_upgrades,'upgrades',upgrade.id,'status_effect_upgrades');
  return result;
 }
 const spawn=(root?.effects??[]).map((ref:any)=>get('effects',ref)).find((x:any)=>x?.param_character),character=get('characters',spawn?.param_character);if(character)add(character.starting_status_effects,'characters',character.id,'starting_status_effects');
 for(const upgrade of activeInitialUpgrades(doc,root))add(upgrade.status_effect_upgrades,'upgrades',upgrade.id,'status_effect_upgrades');
 for(const s of !e.championPath?.localUpgradeId?e.championPath?.upgrade?.statusEffectUpgrades??[]:[])result.push({status:s.statusId,count:s.count});return result;
}
// 2026-11-15-1451||codex-clan-editor||clan-creator/src/web/creator/inherited-abilities.ts||Identificar capacidades copiadas y sus cantidades propias sin modificar la plantilla o inventar efectos
// 2026-11-15-1819||codex-clan-editor||clan-creator/src\web\creator\inherited-abilities.ts||Habilitar edición de Armadura y Multistrike del campeón copiado sin duplicar estados de la senda
// 2026-11-15-2011||codex-clan-editor||clan-creator/src/web/creator/inherited-abilities.ts||Mostrar y eliminar capacidades Conductor copiadas como capacidades editables
// 2026-11-21-1344||codex-clan-editor||clan-creator/src/web/creator/inherited-abilities.ts||Listar capacidades que un equipo concede a su portador como capacidades editables
