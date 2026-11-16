export interface EffectChoice {recipe:string;amount:number;target:string;when:string;duration?:'combat'|'run'}
export interface UnitAbility {status:string;count:number}
export interface CardDraft {abilities?:UnitAbility[];uid:string;kind:'unit'|'spell'|'room'|'artifact'|'equipment'|'blight'|'junk';name:string;description:string;templateId?:string;appearanceTemplateId?:string;pathInTree?:boolean;removedAuras?:string[];removedTemplateEffects?:string[];cost:number;attack:number;health:number;size:number;rarity:string;banner:boolean;reward?:boolean;unlockLevel:number;image?:string;characterImage?:string;scale:number;positionY:number;effects:EffectChoice[];passive?:{recipe:string;amount:number};parameters:Record<string,number>}
export interface PathLevel {native?:{templateId:string;upgradeId:string;removedTemplateEffects?:string[];parameters:Record<string,number>};abilities?:UnitAbility[];attack:number;health:number;size:number;effects:EffectChoice[]}
export interface ChampionDraft {card:CardDraft;paths:{name:string;levels:PathLevel[]}[]}
export interface Draft {schemaVersion:1;id:string;revision:number;updatedAt:string;name:string;author?:string;description:string;step:number;guidedMode?:'quick';reviewedSteps?:Record<string,string>;icon?:string;champions:ChampionDraft[];starters:CardDraft[];cards:CardDraft[]}
export const kindGroups=['unit','spell','room','artifact','equipment','blight','junk'] as const;
export function blankCard(kind:CardDraft['kind'],uid:string):CardDraft{return {uid,kind,name:'',description:'',cost:1,attack:5,health:10,size:1,rarity:'common',banner:false,unlockLevel:1,scale:1,positionY:0,...(kind==='room'?{passive:{recipe:'room_avarice',amount:1}}:kind==='artifact'?{passive:{recipe:'relic_ember',amount:1}}:{}),effects:kind==='spell'?[{recipe:'damage',amount:6,target:'enemy',when:'on_spawn'}]:[],parameters:{}};}
export function blankDraft(id:string):Draft{return {schemaVersion:1,id,revision:0,updatedAt:new Date().toISOString(),name:'',description:'',step:0,champions:[0,1].map(i=>({card:{...blankCard('unit','champion-'+i),cost:0},paths:[0,1,2].map(()=>({name:'',levels:[0,1,2].map(l=>({attack:5*(l+1),health:5*(l+1),size:0,effects:[]}))}))})),starters:[0,1].map(i=>blankCard('spell','starter-'+i)),cards:[]};}
export function allCards(d:Draft){return [...d.champions.map(c=>c.card),...d.starters,...d.cards];}
// 2026-11-15-0852||codex-clan-editor||clan-creator/src/server/creator/model.ts||Modelo tipado del borrador guiado sin exigir identificadores al usuario
// 2026-11-15-0855||codex-clan-editor||clan-creator/src\server\creator\model.ts||Usar altura como desplazamiento respecto al arte original para conservar alineación
// 2026-11-15-0907||codex-clan-editor||clan-creator/src\server\creator\model.ts||Mostrar el coste cero real de los campeones desde el borrador
// 2026-11-15-0912||codex-clan-editor||clan-creator/src\server\creator\model.ts||Representar pasivas guiadas de salas y artefactos sin definiciones técnicas
// 2026-11-15-1220||codex-clan-editor||clan-creator/src/server/creator/model.ts||Admitir equipos, plagas y cargas y distinguir cartas de recompensa de auxiliares
// 2026-11-15-1431||codex-clan-editor||clan-creator/src\server\creator\model.ts||Guardar capacidades nativas en unidades y niveles de senda sin romper borradores anteriores
// 2026-11-15-1826||codex-clan-editor||clan-creator/src\server\creator\model.ts||Guardar duración opcional de efectos conservando compatibilidad con borradores existentes
// 2026-11-15-1937||codex-clan-editor||clan-creator/src/server/creator/model.ts||Guardar referencia auditada de nivel nativo editable
// 2026-11-15-1937||codex-clan-editor||clan-creator/src/server/creator/model.ts||Distinguir senda del arbol de mejoras iniciales para evitar aplicarla dos veces

export function nativePathDraft(example:any,language:string):ChampionDraft['paths'][number]|undefined {const meta=example?.championPath;if(!meta?.levels?.length)return;return {name:meta.names[language==='es'?'spanish':'english']??meta.names.english,levels:meta.levels.map((level:any)=>{const u=example.document.upgrades.find((u:any)=>u.id===level.upgradeId);if(!u)throw Error('Incomplete champion path');return {attack:u.bonus_damage??0,health:u.bonus_hp??0,size:u.bonus_size??0,effects:[],abilities:[],native:{templateId:example.id,upgradeId:u.id,parameters:{}}};})};}
// 2026-11-15-2009||codex-clan-editor||clan-creator/src/server/creator/model.ts||Compartir copia nativa de sendas entre carga de clanes y seleccion de ejemplos

export function unitStatusKey(value:any):string{return value&&typeof value==='object'&&value.mod_reference?value.mod_reference+'_'+String(value.id).replace(/^@/,''):String(value).replace(/^@/,'');}
// 2026-11-15-2011||codex-clan-editor||clan-creator/src/server/creator/model.ts||Normalizar capacidades externas sin confundir objeto de referencia con texto visible
// 2026-11-15-2041||codex-clan-editor||clan-creator/src/server/creator/model.ts||Guardar eliminacion de auras en cada copia conservando borradores anteriores
// 2026-11-15-2046||codex-clan-editor||clan-creator/src/server/creator/model.ts||Guardar eliminaciones generales por carta y nivel de senda sin alterar borradores previos
// 2026-11-15-2328||codex-clan-editor||clan-creator/src/server/creator/model.ts||Mantener apariencia original al copiar solo comportamiento oficial
// 2026-11-16-2040||codex-clan-editor||clan-creator/src/server/creator/model.ts||No crear autor en nuevos borradores y admitirlo opcionalmente por compatibilidad
// 2026-11-16-2144||codex-clan-editor||clan-creator/src/server/creator/model.ts||Conservar modo de recorrido corto opcional en borradores compatibles
// 2026-11-16-2322||codex-clan-editor||clan-creator/src/server/creator/model.ts||Conservar revisiones personales por paso sin confundirlas con datos preparados
