import {championBaseDocument} from '../../server/creator/champion-base';
import {nativePathDraft} from '../../server/creator/model';
import type {ChampionDraft} from '../../server/creator/model';
export function copyChampionPath(detail:any,language:string):ChampionDraft['paths'][number]|undefined {return nativePathDraft(detail?.example,language);}
export function nativeLevelTemplate(level:any,detail:any){if(!level.native||!detail)return;const example=structuredClone(detail.example),root=example.document.cards.find((c:any)=>c.id===example.root.id);root.initial_upgrades=['@'+level.native.upgradeId];const u=example.document.upgrades.find((u:any)=>u.id===level.native.upgradeId);u.bonus_damage=level.attack;u.bonus_hp=level.health;u.bonus_size=level.size;return {...detail,example};}
export function referencedParameters(detail:any,section:string,id:string){const doc=detail.example.document,seen=new Set<string>();const fields:Record<string,string>={ability:'cards',ability_upgrade:'cards',room_ability_upgrade:'cards',param_card:'cards',param_character:'characters',param_upgrade:'upgrades',initial_upgrades:'upgrades',effects:'effects',traits:'traits',trait_upgrades:'traits',trigger_upgrades:'character_triggers',card_trigger_upgrades:'card_triggers',room_modifier_upgrades:'room_modifiers',room_modifiers:'room_modifiers',param_card_filter:'upgrade_masks',filters:'upgrade_masks'};const visit=(section:string,id:string)=>{const key=section+'|'+id;if(seen.has(key))return;seen.add(key);const node=(doc[section]??[]).find((o:any)=>o.id===id);const walk=(v:any,field='')=>{if(field==='remove_upgrades')return;if(Array.isArray(v))v.forEach(x=>walk(x,field));else if(v&&typeof v==='object'){if(!v.mod_reference)Object.entries(v).forEach(([k,x])=>walk(x,k));}else if(typeof v==='string'&&v.startsWith('@')){const target=v.slice(1),preferred=field==='triggers'?(section==='cards'?'card_triggers':'character_triggers'):fields[field];if(preferred)visit(preferred,target);else for(const [next,arr]of Object.entries(doc))if((arr as any[]).some(o=>o.id===target))visit(next,target);}};walk(node);};visit(section,id);return (detail.parameters??[]).filter((p:any)=>seen.has(p.section+'|'+p.id));}
export function levelParameters(level:any,detail:any){if(!level.native||!detail)return [];return referencedParameters(detail,'upgrades',level.native.upgradeId).filter((p:any)=>!['bonus_damage','bonus_hp','bonus_size'].includes(p.path.at(-1)));}
export function championBaseDetail(detail:any){
 if(!detail?.example?.championPath)return detail;
 return {...detail,example:{...detail.example,document:championBaseDocument(detail.example)}};
}
export function currentCardParameters(detail:any){
 if(!detail?.example?.championPath)return detail?.parameters??[];
 return referencedParameters(detail,detail.example.root.section,detail.example.root.id);
}
// 2026-11-15-2019||codex-clan-editor||clan-creator/src/web/creator/champion-copy.ts||Resolver cantidades editables de cada nivel por seccion y evitar colisiones entre mejoras y habilidades
// 2026-11-15-2041||codex-clan-editor||clan-creator/src/web/creator/champion-copy.ts||Reutilizar resolucion de cantidades para agrupar cada aura con sus controles
// 2026-11-19-2126||codex-clan-editor||clan-creator/src/web/creator/champion-copy.ts||Ocultar los atributos de la mejora que se edita en la senda
// 2026-11-19-2129||codex-clan-editor||clan-creator/src/web/creator/champion-copy.ts||Preparar una plantilla base para todos los controles del campeón
