export const parameterKeywordOptions:Record<string,Record<string,string>>={
 CardEffectBump:{'-1':'descend','1':'ascend'},
 CardTraitAddCardUpgradeOnMoonPhase:{'1':'moonshade','2':'moonlit'},
};

export interface ExampleParameter {
 key:string;
 label:string;
 value:number;
 section:string;
 id:string;
 path:(string|number)[];
 status?:string;
 choices?:readonly number[];
 choiceKeywords?:Record<string,string>;
 choiceLabels?:Record<string,{en:string;es:string}>;
 boolean?:boolean;
 minimum?:number;
 maximum?:number;
 auxiliaryCard?:Record<string,string>;
 pyreDamage?:boolean;
}

const destinations:Record<string,[string,string]> = {
 english:['on any floor','on the current floor'],
 spanish:['de cualquier piso','del piso actual'],
 french:["de n'importe quel niveau",'du niveau actuel'],
 german:['auf einer beliebigen Ebene','auf der aktuellen Ebene'],
 russian:['любого этажа','текущего этажа'],
 portuguese:['em qualquer andar','no andar atual'],
 chinese:['任意层','当前层'],
 chinese_traditional:['任意樓層','目前樓層'],
 korean:['선택한 층','현재 층'],
 japanese:['任意のフロア','現在のフロア'],
};

export function applyExampleParameterValues(
 document:Record<string,any[]>,parameters:ExampleParameter[],values:Record<string,number>,
){
 for(const parameter of parameters){
  const value=values[parameter.key];
  if(value===undefined)continue;
  const definition=document[parameter.section]?.find(item=>item.id===parameter.id);
  if(!definition)continue;
  let node=definition;
  for(const field of parameter.path.slice(0,-1))node=node?.[field];
  if(!node)continue;
  const field=parameter.path.at(-1)!;
  if(parameter.label==='ability'&&value===parameter.value&&node[field]===undefined)continue;
  node[field]=parameter.boolean?Boolean(value):value;
  if(field==='can_ability_target_other_floors'&&value!==parameter.value){
   for(const [language,[anyFloor,currentFloor]] of Object.entries(destinations)){
    const text=node.descriptions?.[language];
    if(typeof text==='string')node.descriptions[language]=value?text.replace(currentFloor,anyFloor):text.replace(anyFloor,currentFloor);
   }
  }
 }
}
// 2026-11-21-1017||codex-clan-editor||clan-creator/src/server/creator/example-parameter-values.ts||Compartir conversion de parametros para que el exportador y los visores apliquen los mismos cambios
// 2026-11-21-1018||codex-clan-editor||clan-creator/src/server/creator/example-parameter-values.ts||Conservar el JSON de habilidades que no se modificaron
// 2026-11-21-1510||codex-clan-editor||clan-creator/src/server/creator/example-parameter-values.ts||Identificar los parámetros de una carta auxiliar
// 2026-11-21-1905||codex-clan-editor||clan-creator/src/server/creator/example-parameter-values.ts||Representar el desplazamiento de un piso y las fases lunares con los valores nativos
// 2026-11-21-2013||codex-clan-editor||clan-creator/src/server/creator/example-parameter-values.ts||Declarar límites máximos para cantidades nativas como las probabilidades
// 2026-11-22-0956||codex-clan-editor||clan-creator/src/server/creator/example-parameter-values.ts||Permitir etiquetas traducidas para valores enumerados
