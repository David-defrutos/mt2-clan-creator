import {restoreSpellEffectTargets} from '../dist-server/creator/template-effects.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as jsonc from 'jsonc-parser';
import {simplifyCommunityExample} from './simplify-community-example.mjs';
import {stringLiterals,mentions,referenceSection,resolveLocal} from './catalog-audit-core.mjs';
import {readBundle,bundleRoot} from '../dist-server/creator/bundled.js';
const home=path.resolve(import.meta.dirname,'..'), workspace=path.dirname(home);
const out=process.env.CLAN_MOD_CATALOG_OUTPUT?path.resolve(process.env.CLAN_MOD_CATALOG_OUTPUT):path.join(home,'catalog');
const settings=JSON.parse(await fs.readFile(path.join(home,'config/mod-catalog-import.json'),'utf8'));
const sources=settings.sources;
const hash=b=>createHash('sha256').update(b).digest('hex');
const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short'}).format(new Date()).replace(' ','-').replace(':','');
const log=path.join(workspace,'docs/registro/codex-clan-editor.md');
async function write(file,data){const before=(await fs.stat(file).catch(()=>null))?.mtimeMs;if(before!==undefined&&(await fs.readFile(file)).equals(Buffer.from(data)))return;if((await fs.stat(file).catch(()=>null))?.mtimeMs!==before)throw Error('Cambio concurrente: '+file);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);if((await fs.stat(file)).size!==Buffer.byteLength(data))throw Error('Escritura incompleta: '+file);await fs.appendFile(log,`${stamp}||codex-clan-editor||clan-creator/${path.relative(home,file).replaceAll('\\','/')}||Catálogo auditado autocontenido; SHA256 ${hash(data)}\n`);}
async function walk(folder,ext){let all=[];for(const e of await fs.readdir(folder,{withFileTypes:true})){if(['bin','obj','.git'].includes(e.name))continue;const p=path.join(folder,e.name);if(e.isDirectory())all.push(...await walk(p,ext));else if(p.endsWith(ext))all.push(p);}return all.sort();}
const gameDll=process.env.MT2_GAME_DLL;
if(!gameDll)throw Error('Set MT2_GAME_DLL to the local Assembly-CSharp.dll before rebuilding the catalog.');
const types=execFileSync('ilspycmd',['-l','c',gameDll],{encoding:'utf8',maxBuffer:12e6});
const nativeTypes=new Set(types.split(/\r?\n/).map(x=>x.trim().split(/[ .+]/).at(-1)));
const bundle=await readBundle(),libraryTypes=new Map(),conductorIndex=new Map(),libraryProof={};
for(const [provider,dll]of [['Conductor',bundle.references.Conductor],['TrainworksReloaded.Base',bundle.references['TrainworksReloaded.Base']],['TrainworksReloaded.Core',bundle.references['TrainworksReloaded.Core']],['TrainworksReloaded.Plugin',bundle.references['TrainworksReloaded.Plugin']]]){const file=path.join(bundleRoot,dll);const listed=execFileSync('ilspycmd',['-l','c',file],{encoding:'utf8',maxBuffer:12e6});libraryTypes.set(provider,new Set(listed.split(/\r?\n/).map(x=>x.trim().split(/[ .+]/).at(-1))));libraryProof[provider]={file:dll,sha256:hash(await fs.readFile(file))};}
for(const file of await walk(path.join(bundleRoot,'packages/Conductor-Conductor/json'),'.json')){const bytes=await fs.readFile(file),doc=jsonc.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));for(const [section,arr]of Object.entries(doc))if(Array.isArray(arr))for(const data of arr)if(data?.id){const row={section,data,file};conductorIndex.set(data.id,[...(conductorIndex.get(data.id)??[]),row]);}}
const conductorTypes=libraryTypes.get('Conductor'),preferred=settings.referenceSections;
const classSections=new Set(['effects','relic_effects','traits','room_modifiers','status_effects','relic_effect_conditions']);
const fields=JSON.parse(await fs.readFile(path.join(home,'config/fields.json'),'utf8'));
const nativeStatuses=new Set();
const statusDirectory=path.join(workspace,'datos-juego/MonsterTrain2GameData/StatusEffectData');
for(const file of await walk(statusDirectory,'.json'))for(const status of jsonc.parse(await fs.readFile(file,'utf8')).status_effects??[])nativeStatuses.add(status.id);
const triggerOptions=Object.fromEntries(['card_triggers','character_triggers'].map(s=>[s,new Set(fields[s].find(f=>f.path==='trigger').options)]));
const reports=[],catalog=[],clans=[];await fs.mkdir(path.join(out,'examples'),{recursive:true});
for(const source of sources){
 const root=path.join(workspace,source.root), assetRoot=source.id==='ww'?path.join(root,'content'):root;
 const manifest=JSON.parse((await fs.readFile(path.join(root,source.manifest),'utf8')).replace(/^\uFEFF/,''));
 let commit='';try{commit=execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
 const entries=[],index=new Map(),originals={};
 for(const file of await walk(path.join(root,source.json),'.json')){const b=await fs.readFile(file);originals[file]=hash(b);const errors=[];const doc=jsonc.parse(b.toString('utf8').replace(/^\uFEFF/,''),errors,{allowTrailingComma:true});if(errors.length)throw Error(`JSON inválido: ${file}`);for(const [section,items]of Object.entries(doc??{}))if(Array.isArray(items))for(const data of items)if(data?.id){const item={section,data,file};entries.push(item);const key=String(data.id);index.set(key,[...index.get(key)??[],item]);}}
 const customClasses=new Set(),code=[],codeProof=[],reviewed=[];
 for(const file of await walk(path.join(root,'src'),'.cs')){const text=await fs.readFile(file,'utf8');for(const m of text.matchAll(/\bclass\s+(\w+)/g))customClasses.add(m[1]);const relative=path.relative(root,file).replaceAll('\\','/'),review=settings.reviews.find(r=>r.source===source.id&&r.file===relative);const digest=hash(await fs.readFile(file));codeProof.push({file:relative,sha256:digest});if(review&&review.sha256!==digest)throw Error('Revisar cambio en código auditado: '+relative);if(review)reviewed.push(review);if(!['Plugin.cs','MyPluginInfo.cs','AssemblyInfo.cs'].includes(path.basename(file)))code.push({file:relative,text:stringLiterals(text),review});}
 const report={codeSources:codeProof,reviewedCode:reviewed,source:source.id,version:manifest.version_number,commit,totalCards:entries.filter(e=>e.section==='cards').length,totalRelics:entries.filter(e=>e.section==='relics').length,notCandidates:entries.filter(e=>e.section==='cards'&&(e.data.is_an_ability||!settings.cardTypes.includes(e.data.card_type))).map(e=>({id:e.data.id,reason:e.data.is_an_ability?'Carta auxiliar de habilidad: se revisa si una carta seleccionada la necesita.':'Tipo fuera del asistente inicial: '+e.data.card_type})),scanned:0,accepted:[],excluded:[],notes:['Cierre por sección y proveedor real; no es una prueba en partida.','Se excluyen clases propias y parches funcionales; sonidos y animaciones revisados no bloquean reglas nativas.','Spare y otros eventos externos solo se admiten si su registro existe en la biblioteca incluida.']};
 async function inspect(roots,{overrides=new Map(),relaxed=new Set()}={}){
  const used=new Set(),pending=[...roots],reasons=new Set(),providers=new Set(['game']),images=new Map(),externalResources=new Map();
  function nativeClass(v){const sym=typeof v==='string'?v:v?.id,mod=typeof v==='object'?v.mod_reference:null,name=String(sym??'').replace(/^@/,'');if(mod){if(!libraryTypes.get(mod)?.has(name))reasons.add('Proveedor externo o clase no verificada: '+mod+'/'+name);else providers.add(mod);return;}if(String(sym).startsWith('@')||!nativeTypes.has(name))reasons.add('Clase propia o no verificada: '+name);}
  function reference(v,key,owner){if(typeof v==='object'&&v&&!Array.isArray(v)&&v.mod_reference){const id=String(v.id??'').replace(/^@/,''),section=referenceSection(key,owner.section,preferred);if(v.mod_reference==='Conductor'&&resolveLocal(conductorIndex,id,section).length===1){const resource=resolveLocal(conductorIndex,id,section)[0];externalResources.set(resource.section+'|'+id,{provider:'Conductor',section:resource.section,id,names:resource.data.names??{},descriptions:resource.data.descriptions??{},file:path.relative(bundleRoot,resource.file).replaceAll('\\','/'),sha256:bundle.files.find(f=>f.path===path.relative(bundleRoot,resource.file).replaceAll('\\','/'))?.sha256});providers.add('Conductor');return;}if(libraryTypes.get(v.mod_reference)?.has(id)&&['name','class_name','trigger_effect'].includes(key)){providers.add(v.mod_reference);return;}reasons.add('Referencia externa no verificada: '+JSON.stringify(v)+'; campo '+key);return;}
   if(Array.isArray(v)){v.forEach(x=>reference(x,key,owner));return;}if(v&&typeof v==='object'){for(const [k,x]of Object.entries(v)){if(settings.ignoredReferenceFields.includes(k))continue;if((k==='name'&&classSections.has(owner.section))||k==='class_name'||k==='trigger_effect'){nativeClass(x);continue;}reference(x,k,owner);}return;}
   if(typeof v!=='string')return;
   if(relaxed.size&&key==='status'&&!v.startsWith('@')&&!index.has(v)&&!nativeStatuses.has(v))reasons.add('Estado sin proveedor verificado: '+v);
   if(key==='trigger'&&triggerOptions[owner.section]&&!triggerOptions[owner.section].has(v))reasons.add('Evento no verificado: '+v);
   if(key==='path'){if(!v.toLowerCase().endsWith('.png')){reasons.add('Recurso no PNG: '+v);return;}const absolute=path.resolve(assetRoot,v);if(!absolute.startsWith(path.resolve(assetRoot)+path.sep))reasons.add('Recurso fuera del clan');else images.set(v,absolute);return;}
   if(v.startsWith('@')||key==='status'&&index.has(v)){
    const id=v.replace(/^@/,''),section=referenceSection(key,owner.section,preferred),matches=resolveLocal(index,id,section);
    if(!matches.length){reasons.add('Referencia local no resuelta: '+key+' '+id);return;}
    if(matches.length>1){reasons.add('Referencia ambigua: '+key+' '+id);return;}
    for(const match of matches)pending.push(overrides.get(match)??match);
   }
  }
  while(pending.length){const e=pending.pop();if(used.has(e))continue;used.add(e);if(['asset_bundles','character_trigger_types'].includes(e.section)){reasons.add('Requiere bundle o evento propio: '+e.data.id);continue;}
   if(!relaxed.has(e))for(const c of code){if(c.review?.classification==='required_visual_fix'&&c.review.ids.includes(e.data.id)){reasons.add('Corrección visual propia necesaria: '+c.file+' -> '+e.data.id);continue;}if(!mentions(c.text,String(e.data.id)))continue;if(c.review?.classification==='presentation'||c.review?.classification==='consumer'&&c.review.sections.includes(e.section))continue;reasons.add('Dependencia funcional o no resuelta en C#: '+c.file+' -> '+e.section+'/'+e.data.id);}
   if(!relaxed.has(e)&&(settings.functionalAssignments[source.id]??[]).includes(e.data.id))reasons.add('Registro de estado propio en Plugin.cs: '+e.section+'/'+e.data.id);
   reference(e.data,'',e);
  }
  for(const [key,file]of images){try{const stat=await fs.stat(file);if(!stat.isFile())throw Error();}catch{reasons.add('Imagen ausente: '+key);}}
  return {used,reasons:[...reasons].sort(),providers,images,externalResources};
 }
 async function saveImage(file){
  const bytes=await fs.readFile(file),target='assets/'+hash(bytes)+'.png';
  if(!(await fs.stat(path.join(out,target)).catch(()=>null)))await write(path.join(out,target),bytes);
  return target;
 }
 function exampleId(candidate){return source.id+'-'+candidate.data.id.replace(/[^A-Za-z0-9_-]/g,'_');}
 async function saveExample(candidate,result,id=exampleId(candidate),championPath,simplified){
  const {used,providers,images,externalResources}=result,section=candidate.section;
  const document={};for(const e of used){const d=structuredClone(e.data);delete d.chatter;delete d.lore_tooltips;delete d.lore_style;if(e.section==='cards'||e.section==='relics'){delete d.class;delete d.pools;}
   (document[e.section]??=[]).push(d);
  }
  if(championPath){
   const card=document.cards.find(card=>card.id===candidate.data.id);
   card.initial_upgrades=[...new Set([...(card.initial_upgrades??[]),'@'+championPath.localUpgradeId])];
  }
  const assets={};for(const [image,file]of images){assets[image]=await saveImage(file);}
  // Keep original paths in definitions and a complete immutable mapping to bundled files.
  const rootData=candidate.data;const spawn=(document.effects??[]).find(e=>e.name==='CardEffectSpawnMonster'&&(rootData.effects??[]).includes('@'+e.id));const char=spawn?(document.characters??[]).find(c=>c.id===String(spawn.param_character).replace(/^@/,'')):null;
  const findImage=ref=>{const art=(document.game_objects??[]).find(a=>a.id===String(ref).replace(/^@/,''));const s=art?.extensions?.[art.type]?.sprite;const sprite=(document.sprites??[]).find(x=>x.id===String(typeof s==='object'?s.id:s).replace(/^@/,''));return assets[sprite?.path]??null;};
  let picture=findImage(rootData.card_art);if(section==='relics'){const icon=rootData.icon??rootData.icon_sprite??rootData.sprite;picture=assets[(document.sprites??[]).find(x=>x.id===String(icon).replace(/^@/,''))?.path]??findImage(icon);}
  if(!picture||simplified&&rootData.card_type==='monster'&&(!char||!findImage(char.character_art)))return false;
  if(simplified){
   const effects=(rootData.effects??[]).map(ref=>(document.effects??[]).find(effect=>'@'+effect.id===ref));
   const attachmentHasEffect=effect=>{
    if(!['CardEffectAttachEquipment','CardEffectAttachTrainRoomAttachment'].includes(effect?.name))return !!effect;
    const upgrade=(document.upgrades??[]).find(u=>'@'+u.id===effect.param_upgrade);
    return upgrade&&Object.entries(upgrade).some(([key,value])=>
     /^bonus_|^cost_reduction$|_upgrades$|_ability_upgrade$|^ability_upgrade$/.test(key)&&
     (Array.isArray(value)?value.length:!!value));
   };
   if(section==='relics')simplified.needsEffect=!rootData.relic_effects?.length;
   else if(['spell','room','equipment'].includes(rootData.card_type)&&rootData.cost_type!=='unplayable')
    simplified.needsEffect=!(effects.some(attachmentHasEffect)||rootData.triggers?.length);
  }
  const collectible=(rootData.extensions??[]).find(e=>e.collectable)?.collectable??{};
  const baseNames=rootData.names??char?.names??{english:rootData.id};
  const names=championPath?Object.fromEntries(Object.entries(baseNames).map(([language,name])=>
   [language,name+' · '+(championPath.names[language]??championPath.names.english)+' · I'])):baseNames;
  const item={id,...(simplified?{simplified}:{}),...(championPath?{championPath}:{}),source:source.name,sourceId:source.id,version:manifest.version_number,commit,root:{section,id:rootData.id},kind:section==='relics'?'artifact':rootData.card_type==='monster'?'unit':rootData.card_type,names,descriptions:rootData.descriptions??{},cost:rootData.cost??0,costType:rootData.cost_type??'normal',rarity:rootData.rarity??collectible.rarity??'common',health:char?.health??null,attack:char?.attack_damage??null,size:char?.size??1,picture,characterPicture:char?findImage(char.character_art):null,providers:[...providers],externalResources:[...externalResources.values()],assets,document,files:Object.fromEntries([...used].map(e=>[path.relative(root,e.file).replaceAll('\\','/'),originals[e.file]]))};
  await write(path.join(out,'examples',id+'.json'),JSON.stringify(item,null,2)+'\n');
  const {document:_,files:__,assets:___,...summary}=item;summary.sha256=hash(JSON.stringify(item,null,2)+'\n');catalog.push(summary);return true;
 }
 const candidates=entries.filter(e=>e.section==='relics'||e.section==='cards'&&!e.data.is_an_ability&&settings.cardTypes.includes(e.data.card_type));
 const available=new Map(),simplifiedCards=[];
 const staticArt=new Set(reviewed.filter(r=>r.classification==='required_visual_fix').flatMap(r=>r.ids));
 const local=(section,ref)=>resolveLocal(index,typeof ref==='string'?ref.replace(/^@/,''):'',section)[0];
 const simplify=roots=>simplifyCommunityExample(roots,{local,inspect,staticArt,restoreSpellEffectTargets});
 for(const candidate of candidates){
  report.scanned++;
  let reasons;
  if(settings.excludeCandidatePatterns.some(p=>new RegExp(p).test(candidate.data.id)))reasons=['Contenido de pruebas o selección auxiliar, no una carta autónoma para aprender.'];
  else{
   const result=await inspect([candidate]);
   reasons=result.reasons;
   if(!reasons.length&&!(await saveExample(candidate,result)))reasons=['No se resuelve imagen principal para una ficha completa.'];
  }
  if(reasons.length){
   const row={id:candidate.data.id,name:candidate.data.names?.english??candidate.data.id,reasons};
   if(!settings.excludeCandidatePatterns.some(p=>new RegExp(p).test(candidate.data.id))){
    const result=await simplify([candidate]);
    const id=exampleId(candidate)+'-simplified';
    if(!result.reasons.length&&await saveExample(result.roots[0],result,id,undefined,{removed:result.removed})){
     available.set(candidate,id);
     simplifiedCards.push({id,original:row.id,reasons,removed:result.removed});
    }else row.simplificationProblems=result.reasons.length?result.reasons:['Falta arte de carta o de combate verificable.'];
   }
   report.excluded.push(row);
  }else {
   available.set(candidate,exampleId(candidate));
   report.accepted.push(exampleId(candidate));
  }
 }
 const get=local;
 const clan=entries.find(e=>e.section==='classes'&&e.data.champions?.length===2)?.data;
 if(!clan)throw Error('No se encuentra la clase de '+source.name);
 const originalsByRole=new Set();
 const paths=[];
 const champions=[];
 for(const [slot,champion]of clan.champions.entries()){
  const base=get('cards',champion.card_data),starter=get('cards',champion.starter_card);
  originalsByRole.add(base);originalsByRole.add(starter);
  const availableBase=available.get(base);
  const approvedPaths=[];
  for(const [pathIndex,tree]of champion.upgrade_tree.entries()){
   const levels=tree.map(ref=>get('upgrades',ref));
   const names=levels[0]?.data.titles??{english:'Path '+(pathIndex+1)};
   const pathResult=levels.length===3&&levels.every(Boolean)?await inspect(levels):{reasons:['Faltan niveles de la senda.']};
   const pathReport={champion:base?.data.names?.english??champion.id,path:names.english??tree[0],reasons:pathResult.reasons};
   if(availableBase&&levels.length===3&&levels.every(Boolean)){
    const simplifyPath=!!pathReport.reasons.length;
    const baseIsSimplified=availableBase.endsWith('-simplified');
    const result=simplifyPath||baseIsSimplified?await simplify([base,...levels]):await inspect([base,...levels]);
    const [card,...projectedLevels]=result.roots??[base,...levels];
    const id=exampleId(base)+'-clan-path-'+(pathIndex+1)+(simplifyPath||baseIsSimplified?'-simplified':'');
    const first=projectedLevels[0].data;
    const simplified=simplifyPath||baseIsSimplified?{removed:result.removed??[],path:simplifyPath}:undefined;
    if(!result.reasons.length&&await saveExample(card,result,id,{
     baseId:availableBase,path:pathIndex+1,level:1,names,
     upgradeId:first.id,localUpgradeId:first.id,upgrade:first,levels:projectedLevels.map(level=>({upgradeId:level.data.id,ref:'@'+level.data.id})),
    },simplified))pathReport.templateId=id;
    else pathReport.reasons=result.reasons.length?result.reasons:['No hay arte para la ficha.'];
   }
   paths.push(pathReport);
   approvedPaths.push(pathReport.templateId??null);
  }
  champions.push({
   name:base?.data.names?.english??champion.id,card:availableBase??null,paths:approvedPaths,
   starterName:starter?.data.names?.english??champion.starter_card,
   starter:available.get(starter)??null,
  });
 }
 const banner=entries.find(e=>e.section==='map_nodes'&&e.data.is_banner_node)?.data;
 const mapArt=get('game_objects',banner?.prefab)?.data.extensions?.map_node_icon;
 const style=get('class_card_styles',clan.card_style)?.data;
 const artRules=JSON.parse(await fs.readFile(path.join(home,'config/creator.json'),'utf8')).aiArt.resources;
 const artwork={};
 const artAudit=[];
 for(const resource of artRules){
  const {id,target,field,champion}=resource;
  if(target==='logo')continue;
  const definition=clan.champions[champion];
  const character=target==='champion-display'
   ?get('game_objects',clan.class_select_character_displays?.[champion])?.data.extensions?.character_art:undefined;
  const ref=target==='class-icon'?clan.icons?.[field]:target==='draft-icon'?clan.card_draft_icon:
   target==='banner'?(mapArt?.[field]??source.bannerSprites?.[field]):target==='map'?banner?.[field]:target==='frame'?style?.[field]:
   target==='champion'?definition?.[field]:character?.sprite;
  const sprite=get('sprites',typeof ref==='object'?ref?.id:ref);
  const file=sprite?.data.path&&path.resolve(assetRoot,sprite.data.path);
  const valid=file&&path.extname(file).toLowerCase()==='.png'&&file.startsWith(path.resolve(assetRoot)+path.sep)&&
   (await fs.stat(file).catch(()=>null))?.isFile();
  const linkedChampion=target==='champion'||target==='champion-display';
  const transform=character?.transform, scale=transform?.scale, offset=transform?.offset;
  const supportedTransform=(!scale||scale.x===scale.y&&scale.x>=.1&&scale.x<=4)&&
   (!offset||(!offset.x&&!offset.z)&&(offset.y===undefined||offset.y>=-5&&offset.y<=5));
  const eligible=valid&&(!linkedChampion||!!champions[champion].card)&&supportedTransform;
  let reason=valid?undefined:'No se encontró un PNG enlazado y legible.';
  if(valid&&!eligible)reason=linkedChampion&&!champions[champion].card?'Arte disponible por separado; el campeón no se puede cargar.':'El arte requiere una transformación que el editor no representa.';
  artAudit.push({id,source:sprite?.data.path??null,included:!!eligible,...(reason?{reason}:{})});
  if(eligible)artwork[id]={image:await saveImage(file),...(character?{scale:scale?.x??1,positionY:offset?.y??0}:{})};
 }
 const {assetPath='icon.png'}=source;
 const icon=path.join(root,assetPath);
 const logo=(await fs.stat(icon).catch(()=>null))?.isFile()?await saveImage(icon):undefined;
 const bannerRewards=new Set((banner?.extensions??[]).flatMap(x=>x.reward?.rewards??[]).map(ref=>String(typeof ref==='string'?ref:ref.id).replace(/^@/,'')));
 const bannerRefs=new Set(entries.filter(e=>e.section==='rewards'&&bannerRewards.has(e.data.id)).flatMap(e=>(e.data.extensions??[]).flatMap(x=>{
  const pool=x.draft?.draft_pool;if(!pool)return [];
  const p=get('card_pools',pool);
  return p?.data.cards??[];
 })).map(ref=>String(typeof ref==='string'?ref:ref?.card??ref?.id??'').replace(/^@/,'')));
 const compatibleCollection=candidates.filter(item=>!originalsByRole.has(item)&&available.has(item));
 // Hidden generated cards remain available through their original effects, not as editable reward cards.
 report.hiddenExamples=compatibleCollection.filter(item=>item.data.hide_in_logbook).map(item=>available.get(item));
 const cards=compatibleCollection.filter(item=>!item.data.hide_in_logbook).map(item=>{
  const entry=catalog.find(row=>row.id===available.get(item)),card=item.data;
  const banner=entry.kind==='unit'&&((card.pools??[]).includes('UnitsAllBanner')||bannerRefs.has(card.id));
  const reward=entry.kind==='artifact'||(card.pools??[]).some(pool=>['MegaPool','UnitsAllBanner'].includes(pool))||banner;
  return {templateId:entry.id,banner,reward:reward&&!['blight','junk'].includes(entry.kind)&&entry.costType!=='unplayable',
   unlockLevel:Number.isInteger(card.unlock_level)&&card.unlock_level>0?card.unlock_level:1};
 });
 artAudit.unshift({id:'clan-logo',source:logo?assetPath:null,included:!!logo});
 report.simplified=simplifiedCards;report.champions=champions;report.paths=paths;report.artwork=artAudit;report.bannerUnits=cards.filter(c=>c.banner).map(c=>c.templateId);
 report.excludedBannerUnits=[...bannerRefs].filter(id=>!available.has(get('cards','@'+id)));
 report.cardTypes=Object.fromEntries([...new Set(cards.map(c=>catalog.find(e=>e.id===c.templateId).kind))].map(kind=>[kind,cards.filter(c=>catalog.find(e=>e.id===c.templateId).kind===kind).length]));
 clans.push({id:source.id,name:source.name,version:manifest.version_number,champions,cards,artwork,...(logo?{logo}:{}),excluded:report.excluded.length-simplifiedCards.length,simplified:simplifiedCards.length});
 for(const proof of codeProof)if(hash(await fs.readFile(path.join(root,proof.file)))!==proof.sha256)throw Error('Código cambió durante la auditoría: '+proof.file);
 for(const [file,h]of Object.entries(originals))if(hash(await fs.readFile(file))!==h)throw Error('Fuente cambió durante la auditoría: '+file);
 for(const filename of ['LICENSE','NOTICE.md']){
  const notice=await fs.readFile(path.join(root,filename),'utf8').catch(()=>null);
  if(!notice)continue;
  // Only the creator-owned notice is normalized. Attribution for other authors is preserved.
  const publicNotice=source.id==='succclan'&&filename==='LICENSE'?notice.replace(/^Copyright \(c\) 2026 [^\r\n]+/m,'Copyright (c) 2026 frutos'):notice;
  await write(path.join(out,'credits',source.id+'-'+filename),publicNotice);
 }
 reports.push(report);console.log(source.id,'completos',report.accepted.length,'simplificados',simplifiedCards.length,'excluidos',report.excluded.length-simplifiedCards.length);
}
const previous=await fs.readFile(path.join(out,'index.json'),'utf8').then(JSON.parse).catch(error=>{
 if(error.code!=='ENOENT')throw error;
 return {items:[]};
});
const activeIds=new Set(catalog.map(item=>item.id));
for(const item of previous.items){
 // Existing drafts may still refer to a snapshot that is no longer approved for new copies.
 if(!activeIds.has(item.id))catalog.push({...item,legacy:true});
}
await write(path.join(out,'index.json'),JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),items:catalog},null,2)+'\n');
await write(path.join(out,'community-clans.json'),JSON.stringify({schemaVersion:1,clans},null,2)+'\n');
await write(path.join(out,'audit.json'),JSON.stringify({generatedAt:new Date().toISOString(),method:'Typed transitive reference closure + verified game/Trainworks/Conductor DLL types and Conductor JSON resources + hash-bound code review + functional patch exclusion + complete bundled art',libraries:libraryProof,dependencyVersions:bundle.packages.map(p=>({id:p.id,version:p.version})),gameAssemblySha256:hash(await fs.readFile(gameDll)),sources:reports},null,2)+'\n');
await write(path.join(out,'credits','WW-PROVENANCE.md'),Buffer.from('<!-- Documento generado el '+stamp+' -->\n\n# W&W Inc.\n\nContenido y arte de frutos, incorporado por instrucción expresa del autor en este proyecto el 15-11-2026. No se redistribuyen DLL ni recursos del juego. Procedencia, versión y hashes en audit.json y examples/.\n'));
console.log('Catálogo',catalog.length,Object.fromEntries(['unit','spell','room','artifact'].map(k=>[k,catalog.filter(c=>c.kind===k).length])));
// 2026-11-15-0850||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Auditoría previa reproducible: cierre de referencias, exclusión de lógica C# propia, arte local, hashes y procedencia
// 2026-11-15-0850||codex-clan-editor||clan-creator/scripts\audit-catalog.mjs||Aceptar BOM en manifiestos y registrar fecha local con el formato del proyecto
// 2026-11-15-0907||codex-clan-editor||clan-creator/scripts\audit-catalog.mjs||Excluir cartas internas de pruebas y selección auxiliar del catálogo para principiantes
// 2026-11-15-0920||codex-clan-editor||clan-creator/scripts\audit-catalog.mjs||Retirar solo los snapshots propios de candidatos excluidos al regenerar el catálogo
// 2026-11-15-0922||codex-clan-editor||clan-creator/scripts\audit-catalog.mjs||Conservar niveles técnicos de auxiliares y registrar hashes de los snapshots aprobados
// 2026-11-15-0923||codex-clan-editor||clan-creator/scripts\audit-catalog.mjs||Registrar también habilidades auxiliares y tipos fuera del asistente para completar la cobertura de auditoría
// 2026-11-15-0938||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Auditar también clases de triggers inline y eventos, sin admitir símbolos propios
// 2026-11-15-1908||codex-clan-editor||clan-creator/scripts\audit-catalog.mjs||Corregir resolución tipada, recursos Conductor y falsos positivos de C#; ampliar todos los tipos y auditar binarios y revisiones
// 2026-11-15-1910||codex-clan-editor||clan-creator/scripts\audit-catalog.mjs||Conservar rarezas de artefactos y rechazar cambios de código fuente durante una auditoría en curso
// 2026-11-15-1914||codex-clan-editor||clan-creator/scripts\audit-catalog.mjs||Guardar nombres y procedencia de estados y eventos externos de Conductor para mostrar sus condiciones en la carta
// 2026-11-15-1919||codex-clan-editor||clan-creator/scripts\audit-catalog.mjs||Distinguir correcciones visuales imprescindibles de sonido o animación opcionales; no admitir personajes que se renderizarían incorrectamente
// 2026-11-15-1920||codex-clan-editor||clan-creator/scripts\audit-catalog.mjs||Usar el nombre propio configurado del origen sin crear claves de traducción innecesarias
// 2026-11-21-1041||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Auditar y generar ejemplos de clanes con campeones sendas pools y recursos graficos verificables
// 2026-11-21-1044||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Auditar pool real y recursos de estandarte, y preservar copias anteriores
// 2026-11-21-1047||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Mantener las cartas generadas ocultas en sus efectos y fuera de la colección inicial
// 2026-11-21-1050||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Generar las sendas como fichas con su primer nivel y los tres niveles editables
// 2026-11-21-1058||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Generar bases simplificadas con identificadores propios y reauditar sus referencias antes de incluirlas
// 2026-11-21-1100||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Verificar estados sin prefijo en el catálogo de estados nativos para las copias simplificadas
// 2026-11-21-1100||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Identificar las cartas simplificadas que necesitan un efecto antes de jugar
// 2026-11-21-1103||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Dejar candidatas ocultas en el catálogo individual y señalar hechizos que solo conservan modificadores
// 2026-11-21-1113||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Obtener la biblioteca local del juego desde una variable al auditar
// 2026-11-21-1113||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Aplicar el alias al regenerar la documentación de procedencia
// 2026-11-21-1113||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Mantener el alias en futuras regeneraciones del catálogo
// 2026-11-21-1246||codex-clan-editor||clan-creator/scripts/audit-catalog.mjs||Usar la misma lógica de objetivos que al eliminar efectos en el editor
