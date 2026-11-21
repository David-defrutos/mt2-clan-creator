import React from 'react';
import {effectiveUnitStats} from './template-upgrades';
import type {CardDraft} from '../../server/creator/model';
import {description,imageUrl,local,type Language} from './presentation';
export function CardPreview({card,template,config,language,projectId,small=false,original=false}:{card:CardDraft;template?:any;config:any;language:Language;projectId:string;small?:boolean;original?:boolean}){
 const displayRarity=original?template?.example?.rarity??card.rarity:card.rarity;
 const {attack,health,size:capacity}=effectiveUnitStats(card,template);
 const rules=config.rules,ui=rules.officialFrames??{},labels=rules.cardPresentation??{};
 const fallback=config.catalog.items.find((e:any)=>e.id===(card.kind==='unit'?rules.defaultUnit:card.kind==='room'?rules.defaultRoom:card.kind==='artifact'?rules.defaultArtifact:rules.defaultSpell));
 const costType=template?.example?.costType??'normal';const kind=card.kind,unit=kind==='unit',relic=kind==='artifact',art=card.image??(card.appearanceTemplateId?config.catalog.items.find((e:any)=>e.id===card.appearanceTemplateId)?.picture:card.templateId?template?.example?.picture??config.catalog.items.find((e:any)=>e.id===card.templateId)?.picture:fallback?.picture);
 const sprite=(name:string)=>ui[name]?'/catalog/'+ui[name].asset:undefined;
 const sourceUnit=template?.example?.document?.characters?.find((x:any)=>x.character_art);
 const banner=unit&&(card.banner||original&&sourceUnit?.subtypes?.some((s:any)=>String(s).includes('BannerUnit')));
 const subtype=unit&&sourceUnit?.subtypes?.some((s:any)=>String(s).includes('TrainSteward'))?'TrainSteward':unit&&displayRarity==='champion'?'Champion':null;
 const typeName=local(subtype?labels.subtypes?.[subtype]:labels.types?.[kind],language)||(language==='es'?'UNIDAD':'UNIT');
 const frame=unit?'unit-backframe-normal-nonchampion':kind==='room'?'room-backframe-normal':kind==='equipment'?'equipment-backframe-normal':kind==='blight'?'blight-backframe':kind==='junk'?'junk-backframe':'spell-backframe-normal';
 const body=unit?'unit-textbody-nonchampion':kind==='room'?'room-textbody':kind==='equipment'?'equipment-textbody':kind==='blight'?'blight-textbody':kind==='junk'?'junk-textbody':'spell-textbody';
 const plate=unit?'unit-nameplate-normal-nonchampion':kind==='spell'?'spell-nameplate-normal':'shared-nameplate-normal';
 const icons=labels.icons??{};const iconKeys=Object.keys(icons);const tokens=Object.fromEntries(iconKeys.map((key,i)=>[key,{es:String.fromCharCode(0xe000+i),en:String.fromCharCode(0xe000+i)}]));
 const wording=description(card,template,language,{...rules,statusLabels:{...rules.statusLabels,...tokens}});
 const abilityPrefix=language==='es'?'Habilidad: ':'Ability: ';const abilityHelp=description(card,template,language,{...rules,includeAbilityDetails:true}).split('\n').filter(line=>line.startsWith(abilityPrefix));
 const textSize=wording.length>220?labels.bodySize?.long:wording.length>120?labels.bodySize?.medium:labels.bodySize?.short;
 const inline=(line:string)=>line.split(/([\uE000-\uE00F])/).map((text,i)=>{const key=iconKeys[text.charCodeAt(0)-0xe000];if(key)return <img key={i} className="inline-game-icon" src={sprite(icons[key])} alt={local(rules.statusLabels?.[key],language)||key}/>;const prefix=text.match(/^([^:.]{1,32}:)(.*)$/);return prefix?<React.Fragment key={i}><b>{prefix[1]}</b>{prefix[2]}</React.Fragment>:text;});
 const native=!!sprite(frame)&&!relic;
 return <article className={'game-card '+(small?'compact ':'')+(relic?'relic':native?'authentic mt2-card':'')+(art?'':' no-local-image')} aria-label={card.name||local(rules.labels.preview,language)} data-card-kind={kind} style={{'--wording-size':textSize??7.8} as React.CSSProperties}>
 {native&&<img className="card-backframe" src={sprite(frame)} alt=""/>}
 {art?<img className="card-image" src={imageUrl(projectId,art)} alt={card.name}/>:<div className="card-image no-card-art"><span>◇</span><p>{language==='es'?'Sin vista previa de imagen':'No image preview'}</p><small>{language==='es'?'Se conserva el arte original en el juego.':'Original in-game artwork is preserved.'}</small></div>}
 {native&&<img className="card-textbody" src={sprite(body)} alt=""/>}
 {banner&&native&&<img className="card-unit-banner" src={sprite('unit-banner')} alt=""/>}
 {!relic&&<span className="ember" title={language==='es'?'Coste de ember':'Ember cost'}>{native&&<img src={sprite('shared-ember')} alt=""/>}<span>{costType==='x'?'X':costType==='unplayable'?'—':card.cost}</span></span>}
 {unit&&<div className="card-capacity" title={(language==='es'?'Espacio en el piso: ':'Floor capacity: ')+capacity} style={{width:Math.min(52,capacity*7+7)+'%'}}>{native?<><img src={sprite('shared-pips-normal-'+Math.min(6,capacity))} alt={String(capacity)}/>{capacity>6&&<span>×{capacity}</span>}</>:<span>◈ {capacity}</span>}</div>}
 <div className="card-title">{native&&<img src={sprite(plate)} alt=""/>}<h3>{card.name||local(rules.labels.name,language)}</h3></div>
 {!relic&&!['blight','junk'].includes(kind)&&<span className="card-rarity" title={local(labels.rarities?.[displayRarity],language)||displayRarity}>{native&&<img src={sprite('shared-normal-'+(['common','uncommon','rare','champion'].includes(displayRarity)?displayRarity==='champion'?'champ':displayRarity:'common'))} alt=""/>}</span>}
 <div className="card-description">{wording.split('\n').filter(Boolean).map((line,i)=><p key={i}>{line.startsWith(abilityPrefix)?<span className="ability-reference" tabIndex={0} title={abilityHelp.find(help=>help.startsWith(line))??line} aria-label={abilityHelp.find(help=>help.startsWith(line))??line}>{inline(line)} ⓘ</span>:inline(line)}</p>)}</div>
 {!relic&&<div className="card-type">{native&&<img src={sprite('all-typeplate-normal')} alt=""/>}<span>{typeName}</span></div>}
 {unit&&<><span className="card-stat card-attack" title={language==='es'?'Ataque':'Attack'}>{native&&<img src={sprite('cardAttackIcon')} alt=""/>}<span>{attack}</span></span><span className="card-stat card-health" title={language==='es'?'Salud':'Health'}>{native&&<img src={sprite('cardHealthIcon_0')} alt=""/>}<span>{health}</span></span></>}
 </article>;
}
// 2026-11-15-1141||codex-clan-editor||clan-creator/src/web/creator/card-preview.tsx||Componer cartas con marco rectangular, panel inferior, placa central e indicadores originales del juego
// 2026-11-15-1222||codex-clan-editor||clan-creator/src/web/creator/card-preview.tsx||Representar cartas sin imagen sin confundirlas con otra carta y añadir marcos de equipos, plagas y cargas
// 2026-11-15-1228||codex-clan-editor||clan-creator/src/web/creator/card-preview.tsx||Mostrar costes X y cartas no jugables sin hacerlos pasar por coste cero
// 2026-11-15-1233||codex-clan-editor||clan-creator/src/web/creator/card-preview.tsx||Permitir una ficha compacta de artefacto cuando solo hay información textual
// 2026-11-15-1238||codex-clan-editor||clan-creator/src/web/creator/card-preview.tsx||Dar acceso por ratón y teclado al efecto de una habilidad sin saturar el cuerpo de la carta
// 2026-11-15-1425||codex-clan-editor||clan-creator/src\web\creator\card-preview.tsx||Previsualizar atributos efectivos de la senda sin aplicar dos veces sus bonificaciones al generar
// 2026-11-15-1431||codex-clan-editor||clan-creator/src\web\creator\card-preview.tsx||Mostrar distintivo y tipo de campeón en la vista original de las variantes
// 2026-11-15-1819||codex-clan-editor||clan-creator/src\web\creator\card-preview.tsx||Actualizar la carta al editar las bonificaciones y capacidades propias de la senda copiada
// 2026-11-15-2328||codex-clan-editor||clan-creator/src/web/creator/card-preview.tsx||Conservar imagen de vista previa al sustituir efectos por comportamiento oficial
// 2026-11-21-1333||codex-clan-editor||clan-creator/src/web/creator/card-preview.tsx||Mostrar arte del catálogo en la vista previa mientras se carga el detalle de un artefacto
