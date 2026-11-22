import {applyCopiedEffectEdits} from './copied-effect-edits.js';
import {canEditBattleCardDestination,reviseBattleCardDestinations} from './battle-card-destination.js';
import {communitySummary,communityTemplates} from './community-templates.js';
import {isActivatedCard,removeTemplateEffects,templateEffects} from './template-effects.js';
import {parameterKeywordOptions,applyExampleParameterValues,type ExampleParameter} from './example-parameter-values.js';
import {reviseArtifactActivation,reviseEffectDescriptions,reviseMovementDescriptions} from './template-effect-text.js';
import {removeUnitAuras} from './unit-auras.js';
import {unitStatusKey} from './model.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {applicationRoot,projectRoot} from '../paths.js';
import type {CardDraft} from './model.js';
export type Definition=Record<string,any>;
export interface Example {simplified?:{removed:string[];path?:boolean;needsEffect?:boolean};externalResources?:{provider:string;section:string;id:string;names:Record<string,string>;descriptions:Record<string,string>;file:string;sha256:string}[];legacy?:boolean;championPath?:{levels?:{upgradeId:string;ref:string}[];localUpgradeId?:string;baseId:string;path:number;level:number;upgradeId:string;guid:string;names:Record<string,string>;upgrade:Record<string,any>};costType?:string;previewIncomplete?:boolean;official?:boolean;requiredDlc?:string|null;clan?:string;id:string;source:string;sourceId:string;version:string;commit:string;root:{section:string;id:string};kind:CardDraft['kind'];names:Record<string,string>;descriptions:Record<string,string>;cost:number;rarity:string;health:number|null;attack:number|null;size:number;picture:string;detailPicture?:string;characterPicture?:string;searchText?:string;providers:string[];assets:Record<string,string>;document:Record<string,Definition[]>;files:Record<string,string>}
export const catalogRoot=process.env.CLAN_CREATOR_CATALOG_ROOT?path.resolve(process.env.CLAN_CREATOR_CATALOG_ROOT):path.join(projectRoot,'catalog');
type OfficialIcons={relics:Record<string,{picture:string;detailPicture?:string}>;clans:Record<string,Record<string,string>>};
export async function officialIcons():Promise<OfficialIcons>{
 return fs.readFile(path.join(catalogRoot,'official/icon-manifest.json'),'utf8').then(JSON.parse).catch(error=>{
  if(error.code!=='ENOENT')throw error;
  return {relics:{},clans:{}};
 });
}
export async function creatorRules(){const rules=JSON.parse(await fs.readFile(path.join(projectRoot,'config/creator.json'),'utf8'));const art=await fs.readFile(path.join(catalogRoot,'official/art-manifest.json'),'utf8').then(JSON.parse).catch(()=>null);if(!art){rules.defaultUnit='ww-WW_T01';rules.defaultSpell='freecompany-Bless';rules.defaultRoom='freecompany-PaymastersTent';}const officialStatistics=JSON.parse(await fs.readFile(path.join(projectRoot,'config/official-statistics.json'),'utf8'));const templates=JSON.parse(await fs.readFile(path.join(projectRoot,'config/official-clans.json'),'utf8'));return {...rules,officialStatistics,officialClanTemplates:templates.clans.map((c:any)=>({id:c.id,name:c.name,cards:c.cards.length,requiredDlc:c.requiredDlc})),communityClanTemplates:(await communityTemplates(catalogRoot)).map(communitySummary),officialClanIcons:(await officialIcons()).clans,officialFrames:art?.frames??{}};}
let listCache:{token:string;value:{items:Omit<Example,'document'|'assets'|'files'>[]}}|undefined;
export async function exampleList(){const paths=[...['index.json','official/index.json'].map(n=>path.join(catalogRoot,n)),path.join(projectRoot,'config/official-clan-overrides.json'),path.join(catalogRoot,'official/icon-manifest.json'),path.join(applicationRoot,'dist-server/catalog-search.json')];const stats=await Promise.all(paths.map(p=>fs.stat(p).catch((e:any)=>{if(e.code==='ENOENT')return null;throw e;})));const token=stats.map(s=>s?.mtimeMs+'|'+s?.size).join(';');if(listCache?.token===token)return listCache.value;const mods=JSON.parse(await fs.readFile(paths[0],'utf8'));const official=stats[1]?JSON.parse(await fs.readFile(paths[1],'utf8')):{items:[]};const overrides=stats[2]?JSON.parse(await fs.readFile(paths[2],'utf8')).clans:{};const icons=(await officialIcons()).relics;const search:Record<string,[string,string]>=stats[4]?JSON.parse(await fs.readFile(paths[4],'utf8')):{};
 const items=[...official.items.map((e:any)=>({...e,...icons[e.root?.id],...(overrides[e.id]?{clan:overrides[e.id]}:{})})),...mods.items].map(item=>{
  const indexed=search[item.id];
  return indexed?.[0]===item.sha256?{...item,searchText:indexed[1]}:item;
 });
 const value={items};listCache={token,value};return value;}
export async function readExample(id:string):Promise<Example>{if(!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw Error('Este ejemplo no está incluido en el creador.');const entry=(await exampleList()).items.find(e=>e.id===id) as any;if(!entry)throw Error('Este ejemplo no está incluido en el creador.');const bytes=await fs.readFile(path.join(catalogRoot,entry.official?'official/examples':'examples',id+'.json'));if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('El ejemplo cambió después de su auditoría. Restaura el catálogo del creador.');return {...JSON.parse(bytes.toString('utf8')),...(entry.official?{clan:entry.clan,picture:entry.picture,detailPicture:entry.detailPicture}:{}),...(entry.legacy?{legacy:true}:{})};}
const parameterConfig=JSON.parse(readFileSync(path.join(projectRoot,'config/creator.json'),'utf8'));
const parameterRules=parameterConfig.exampleParameterRules,extraRules=parameterConfig.exampleExtraParameters;
const paramIntRules:Record<string,{minimum?:number;maximum?:number;ignoreRange?:boolean;selectionPrefix?:string;excludeFields?:string[]}>=parameterConfig.exampleParamIntRules??{};
function editableParamInt(effectClass:string,definition:Record<string,any>){
 const constraints=paramIntRules[effectClass];
 const choices=parameterKeywordOptions[effectClass];
 const mode=definition.target_card_selection_mode;
 return Object.hasOwn(parameterRules,effectClass)&&!(
  constraints?.ignoreRange&&definition.use_int_range||
  constraints?.selectionPrefix&&(typeof mode!=='string'||!mode.startsWith(constraints.selectionPrefix))||
  constraints?.minimum!==undefined&&definition.param_int<constraints.minimum||
  choices&&!Object.hasOwn(choices,definition.param_int)||
  constraints?.excludeFields?.some(field=>!!definition[field])
 );
}
const editableSections=new Set(['characters','effects','upgrades','relic_effects','room_modifiers','character_triggers','card_triggers','traits','relic_effect_conditions']);
export function exampleParameters(example:Example,includeLegacy=false){const rows:ExampleParameter[]=[];
 for(const [section,definitions]of Object.entries(example.document)){
 if(section==='cards'){
  for(const d of definitions){
   if(!isActivatedCard(example.document,d))continue;
   for(const field of ['cooldown','initial_cooldown']){
    const value=d[field]??0;
    if(Number.isInteger(value)&&value>=0)rows.push({key:[section,d.id,field].join('|'),label:'ability',value,section,id:d.id,path:[field],minimum:0});
   }
   const teleports=(d.effects??[]).some((ref:string)=>(example.document.effects??[]).some(effect=>'@'+effect.id===ref&&effect.name==='CardEffectUnitAbilityTeleport'));
   if(teleports){
    const field='can_ability_target_other_floors';
    rows.push({key:[section,d.id,field].join('|'),label:'ability',value:Number(Boolean(d[field])),section,id:d.id,path:[field],boolean:true,choices:[0,1]});
   }
  }
  continue;
 }
 if(!editableSections.has(section))continue;
 for(const d of definitions){
 if(section==='relic_effect_conditions'){
  if(d.param_tracked_value==='any_card_played'&&d.param_card_type==='spell'&&d.param_entry_duration==='this_turn'&&
   d.allow_multiple_triggers_per_duration===false&&d.param_comparator?.includes('greater_than')&&d.param_comparator.includes('equal')&&
   Number.isInteger(d.param_int)&&d.param_int>0&&d.param_int<=parameterConfig.limits.maxNumber){
   rows.push({key:[section,d.id,'param_int'].join('|'),label:'RelicSpellCountThreshold',value:d.param_int,section,id:d.id,path:['param_int'],minimum:1});
  }
  continue;
 }
 if(section==='relic_effects'&&d.name==='RelicEffectModifyEnergyOnMoonPhase'&&[1,2].includes(d.param_int_2)){
  rows.push({key:[section,d.id,'param_int_2'].join('|'),label:'RelicActiveMoonPhase',value:d.param_int_2,section,id:d.id,path:['param_int_2'],choices:[1,2],choiceKeywords:{1:'moonshade',2:'moonlit'}});
 }
 if(section==='effects'&&d.name==='CardEffectFloorRearrange'&&(d.param_int===undefined||d.param_int===0||d.param_int===1)){
  rows.push({key:[section,d.id,'param_int'].join('|'),label:d.name,value:d.param_int??0,section,id:d.id,path:['param_int'],choices:[0,1]});
 }
 if(section==='effects'&&canEditBattleCardDestination(example.document,d)){
  const choiceLabels=parameterConfig.verifiedParameters.CardEffectAddBattleCard.param_int.choices;
  rows.push({key:[section,d.id,'param_int'].join('|'),label:d.name,value:d.param_int,section,id:d.id,
   path:['param_int'],choices:Object.keys(choiceLabels).map(Number),choiceLabels});
 }
 function visit(v:any,keys:(string|number)[]){if(Array.isArray(v)){v.forEach((x,i)=>visit(x,[...keys,i]));return;}if(v&&typeof v==='object'){for(const [k,x]of Object.entries(v)){
 const effectClass=typeof v.trigger_effect==='string'?v.trigger_effect:typeof d.name==='string'?d.name:'';
 const legacyStatusCount=includeLegacy&&effectClass==='CardEffectDamagePerStatusEffect';
 if(typeof x==='number'&&Math.abs(x)<=parameterConfig.limits.maxNumber&&(['bonus_damage','bonus_hp','bonus_size'].includes(k)||k==='count'&&(typeof v.status==='string'||v.status?.mod_reference)&&(legacyStatusCount||!(parameterConfig.exampleReadOnlyStatusCountClasses??[]).includes(effectClass))||k==='param_int'&&editableParamInt(effectClass,v)||extraRules?.[effectClass]?.[k]))rows.push({key:[section,d.id,...keys,k].join('|'),label:effectClass||section,value:x,section,id:d.id,path:[...keys,k],...(k==='param_int'?{
  minimum:effectClass==='CardEffectMix'?1:paramIntRules[effectClass]?.minimum,
  maximum:paramIntRules[effectClass]?.maximum,
  ...(parameterKeywordOptions[effectClass]?{
   choices:Object.keys(parameterKeywordOptions[effectClass]).map(Number),
   choiceKeywords:parameterKeywordOptions[effectClass],
  }:{}),
 }:{} ),...(v.status?{status:unitStatusKey(v.status)}:{})});else if(x&&typeof x==='object')visit(x,[...keys,k]);}}}visit(d,[]);}}
 const auxiliary=new Map<string,Record<string,string>>();
 if(example.root.section==='cards')for(const card of example.document.cards??[]){
  if(card.id===example.root.id||!card.names)continue;
  for(const action of templateEffects(example.document,{section:'cards',id:card.id})){
   if(action.section==='effects')auxiliary.set(action.id,card.names);
  }
 }
 return rows.map(parameter=>auxiliary.has(parameter.id)?{
  ...parameter,auxiliaryCard:auxiliary.get(parameter.id),
  pyreDamage:parameter.label==='CardEffectDamage'&&example.document.effects?.find(effect=>effect.id===parameter.id)?.target_mode==='pyre',
 }:parameter);}
export function cloneExampleCard(e:Example,uid:string,language='es'):CardDraft{return {uid,kind:e.kind,name:e.names[language==='es'?'spanish':'english']??e.names.english??e.root.id,description:e.descriptions[language==='es'?'spanish':'english']??e.descriptions.english??'',templateId:e.id,cost:e.cost,attack:e.attack??5,health:e.health??10,size:e.size,rarity:['common','uncommon','rare'].includes(e.rarity)?e.rarity:'common',banner:false,reward:!['blight','junk'].includes(e.kind)&&e.costType!=='unplayable',unlockLevel:1,scale:1,positionY:0,effects:[],parameters:Object.fromEntries(exampleParameters(e).map(p=>[p.key,p.value]))};}
export function applyExampleParameters(e:Example,card:CardDraft){const copy=structuredClone(e.document),parameters=exampleParameters(e);removeUnitAuras(copy,e.root,card.removedAuras);applyExampleParameterValues(copy,parameters,card.parameters);
 if(e.kind==='room'){const replacements=new Map<string,string>();for(const p of exampleParameters(e)){if(p.section==='upgrades'&&p.path.at(-1)==='count'&&card.parameters[p.key]!==undefined&&card.parameters[p.key]!==p.value)replacements.set(String(p.value),String(card.parameters[p.key]));}if(replacements.size)for(const section of ['cards','upgrades'])for(const d of copy[section]??[])if(d.descriptions)for(const [lang,text]of Object.entries(d.descriptions))if(typeof text==='string')d.descriptions[lang]=text.replace(/\b\d+\b/g,n=>replacements.get(n)??n);}
 for(const upgrade of copy.upgrades??[])if(upgrade.status_effect_upgrades)upgrade.status_effect_upgrades=upgrade.status_effect_upgrades.filter((s:any)=>s.count!==0);
 reviseMovementDescriptions(e.document,copy,parameterConfig);
 if(e.kind==='artifact')reviseArtifactActivation(e.document,copy);
 const changed=removeTemplateEffects(copy,e.root,card.removedTemplateEffects);if(changed.length)reviseEffectDescriptions(e.document,copy,changed,parameterConfig);applyCopiedEffectEdits(copy,e.document,e.root,card,parameterConfig,parameters);
 reviseBattleCardDestinations(e.document,copy);
 return copy;
}
// 2026-11-15-0853||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Resolver catálogo autocontenido y exponer cantidades editables sin código ni JSON
// 2026-11-15-0855||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Conservar las transformaciones del ejemplo al copiarlo
// 2026-11-15-0913||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Actualizar descripciones literales de salas al modificar la cantidad de su estado
// 2026-11-15-0920||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Editar solo cantidades con significado verificado y preservar parámetros internos no explicados
// 2026-11-15-0922||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Comprobar el hash del ejemplo aprobado antes de permitir copiarlo o generarlo
// 2026-11-15-0938||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Permitir editar estados iniciales y cantidades verificadas conservando parámetros internos
// 2026-11-15-1018||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Integrar catálogo oficial local con prioridad y hashes, manteniendo compatibilidad de borradores anteriores
// 2026-11-15-1029||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Conservar arranque de desarrollo sin extracción local del juego, sin fingir un catálogo oficial presente
// 2026-11-15-1031||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Tipar el requisito de expansión de los ejemplos oficiales
// 2026-11-15-1220||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Mantener cartas sin ilustración y dejar plagas y cargas fuera de las recompensas por defecto
// 2026-11-15-1227||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Evitar releer y procesar el catálogo completo en cada selección, conservando invalidación por fecha y tamaño
// 2026-11-15-1228||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Evitar recompensas accidentales de unidades que solo generan otros efectos
// 2026-11-15-1233||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||No ofrecer cantidades editables que RelicEffectPreventStatusEffectDecay no utiliza
// 2026-11-15-1425||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Conservar metadatos de senda oficial y mejora nativa con efectos completos
// 2026-11-15-1819||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Identificar sendas importadas como mejoras locales independientes
// 2026-11-15-1820||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Excluir del contenido generado las capacidades eliminadas de las mejoras copiadas
// 2026-11-15-1828||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Entregar tablas oficiales autocontenidas sin depender de fuentes del juego al utilizar el creador
// 2026-11-15-1851||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Identificar ejemplos de compatibilidad retenidos cuando la nueva extracción omite su definición
// 2026-11-15-1852||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Conservar el indicador de compatibilidad al abrir una plantilla archivada sin alterar su hash aprobado
// 2026-11-15-1911||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Permitir probar un catálogo provisional completo antes de sustituir el activo, mediante variable de entorno de desarrollo
// 2026-11-15-1914||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Tipar metadatos de recursos externos verificados sin duplicar sus definiciones en el clan exportado
// 2026-11-15-1937||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Tipar los tres niveles de senda incluidos en el catalogo
// 2026-11-15-2009||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Entregar opciones de clanes oficiales autocontenidos a la portada
// 2026-11-15-2011||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Permitir editar cantidades de capacidades externas copiadas de ejemplos de mods
// 2026-11-15-2013||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Conservar cantidades centinela nativas sin exponerlas como importes editables fuera de limites
// 2026-11-15-2041||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Eliminar el enlace al aura al generar la carta sin afectar al ejemplo original
// 2026-11-15-2048||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Aplicar eliminaciones generales a la copia exportada y corregir los textos de acciones restantes
// 2026-11-17-1909||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Leer preferencia local de expansiones sin incluir datos personales en configuración pública
// 2026-11-17-1918||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Retirar excepción privada del selector DLC al habilitarlo públicamente
// 2026-11-17-2308||codex-clan-editor||clan-creator/src\server\creator\catalog.ts||Aplicar clasificación corregida al índice y detalle sin alterar archivos auditados ni sus hashes
// 2026-11-19-2137||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Exponer y exportar los destinos válidos de Advance y Retreat
// 2026-11-21-1017||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Exponer recarga y alcance de las habilidades activadas copiadas
// 2026-11-21-1045||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Leer las plantillas de clanes de la comunidad desde el catálogo
// 2026-11-21-1045||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Exponer al asistente el resumen de los clanes de la comunidad
// 2026-11-21-1100||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Exponer metadatos de las versiones simplificadas
// 2026-11-21-1255||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Aplicar los controles de efectos copiados al generar las cartas
// 2026-11-21-1331||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Mostrar iconos oficiales del catálogo sin reescribir ni volver a auditar definiciones de cartas
// 2026-11-21-1510||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Conservar el nombre de la carta auxiliar al etiquetar los parámetros del formulario
// 2026-11-21-1554||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Actualizar el aviso de activación de una copia de artefacto después de editar su cantidad
// 2026-11-21-1557||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Aplicar cantidades específicas del ejemplo desde el catálogo
// 2026-11-21-1825||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Permitir editar las opciones de una infusión en los ejemplos
// 2026-11-21-1904||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Exponer cantidades verificadas solo cuando ese campo controla la mecánica activa
// 2026-11-21-1905||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Limitar la edición a valores escalares y opciones comprobadas sin rechazar valores especiales del juego
// 2026-11-21-2013||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Exponer recargas de sala, umbrales de hechizos y parámetros nativos con semántica verificada
// 2026-11-21-2016||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Aplicar textos de condiciones cambiadas en el JSON de clan
// 2026-11-21-2043||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Cargar el índice derivado y usarlo solo para la versión auditada de cada ejemplo
// 2026-11-22-0935||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Mantener válidos los borradores con un antiguo campo de acumulaciones que el juego ignora
// 2026-11-22-0956||codex-clan-editor||clan-creator/src/server/creator/catalog.ts||Exponer los destinos comprobados sin migrar los datos originales
