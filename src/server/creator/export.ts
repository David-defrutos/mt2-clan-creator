import {triggerReference} from './trigger-reference.js';
import {activeCardTraitClasses,equipmentUpgrade} from './template-effects.js';
import {applyCopiedEffectEdits} from './copied-effect-edits.js';
import {championBaseDocument} from './champion-base.js';
import {applyClanArtwork} from './clan-artwork.js';
import {draftIssues,needsTemplateReview,copiedCardNeedsPassive} from './validation.js';
import {nativeDocumentCopy} from './native-copy.js';
import {effectTargetMode,effectTargetTeam,recipeDescription,spellRecipientTeam} from './recipe-text.js';
import {removeTemplateEffects} from './template-effects.js';
import {reviseEffectDescriptions,simplifiedEffectText} from './template-effect-text.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import {createClan} from '../create.js';
import {dataRoot,inside} from '../paths.js';
import {scanClan} from '../scan.js';
import {validateClan} from '../validate.js';
import {creatorRules,readExample,exampleList,exampleParameters,catalogRoot,applyExampleParameters,type Definition} from './catalog.js';
import {allCards,originalClanIcons,unitStatusKey,type Draft,type CardDraft,type EffectChoice} from './model.js';
import {projectFolder} from './projects.js';
const reserve=(choice:EffectChoice)=>choice.when==='on_unplayed_positive'||choice.when==='on_unplayed_negative';
const langKeys=['english','spanish','french','german','portuguese','russian','chinese','chinese_traditional','korean','japanese'];
const localized=(text:string)=>Object.fromEntries(langKeys.map(k=>[k,text]));
export {type ReviewIssue} from './validation.js';
export async function reviewDraft(d:Draft){
 const ids=new Set(allCards(d).filter(needsTemplateReview).map(card=>card.templateId!));
 const examples=new Map(await Promise.all([...ids].map(async id=>[id,await readExample(id)] as const)));
 return draftIssues(d,(await creatorRules()).steps,id=>examples.get(id));
}

async function imageBytes(d:Draft,asset:string){if(/^(?:official\/)?assets\/[a-f0-9]{64}\.png$/.test(asset)){const b=await fs.readFile(path.join(catalogRoot,asset));if(createHash('sha256').update(b).digest('hex')!==path.basename(asset,'.png'))throw Error('Una imagen del catálogo cambió. Reinstala el creador.');return b;}if(/^upload\/[a-f0-9-]{36}\.png$/.test(asset))return fs.readFile(path.join(projectFolder(d.id),asset));throw Error('La imagen no pertenece al catálogo ni a tu clan.');}
export async function generateClan(d:Draft,cardUid?:string){
 if(cardUid===undefined){const issues=await reviewDraft(d);if(issues.length)throw Error(issues[0].message);}
 else if(d.pendingCard?.card.uid===cardUid)d={...d,cards:[...d.cards,d.pendingCard.card]};
 const cards=allCards(d);
 const inspected=cards.find(card=>card.uid===cardUid);
 if(cardUid!==undefined&&!inspected)throw Error('No se encuentra esa carta en el borrador.');
 const rules=await creatorRules();const generated=path.join(dataRoot,'creator-output',d.id);await fs.mkdir(generated,{recursive:true});const root=path.join(generated,'clan-'+randomUUID());
 const identity='Clan'+d.id.replaceAll('-','').slice(0,16);
 const previewName=(value:string,placeholder:string)=>inspected&&!value.trim()?placeholder:value;
 await createClan({destination:root,id:identity,name:previewName(d.name,'Clan'),author:'Local',champions:d.champions.map(c=>previewName(c.card.name,'Champion')) as [string,string],starters:d.starters.map(c=>previewName(c.name,'Starter')) as [string,string],draftCount:2});
 try{
 const base=JSON.parse(await fs.readFile(path.join(root,'json/clan.json'),'utf8'));
 const inherited=JSON.parse(await fs.readFile(path.join(root,'json/cards.json'),'utf8'));
 const document:Record<string,Definition[]>={sprites:inherited.sprites,game_objects:inherited.game_objects};
 const classId=base.classes[0].id;const starterPool='StarterCardsOnly';const draftPool=base.card_pools[0].id,bannerPool=base.card_pools[1].id;
 const statusRef=(status:string)=>structuredClone(rules.unitAbilities.find((a:any)=>a.status===status)?.reference??status);const abilityData=(a:any)=>({...a,status:statusRef(a.status)});
 const add=(section:string,o:Definition)=>{(document[section]??=[]).push(o);return o;};
 const roots=new Map<string,Definition>();const characterRoots=new Map<string,Definition>();const artworks=new Map<string,string>();
 async function saveImage(asset:string,name:string){const destination='textures/'+name+'.png';if(!inspected)await fs.writeFile(path.join(root,destination),await imageBytes(d,asset));return destination;}
 async function newArt(prefix:string,asset:string,type:string){const sprite=prefix+'Sprite',id=prefix+'Art';const file=await saveImage(asset,prefix);add('sprites',{id:sprite,path:file});add('game_objects',{id,type,extensions:{[type]:{sprite:'@'+sprite}}});return '@'+id;}
 function recipeEffect(choice:EffectChoice,id:string,unit=false,recipientTeam='monsters'){const recipe=rules.recipes.find((r:any)=>r.id===choice.recipe);if(!recipe)throw Error('El efecto no está disponible.');const target=choice.target;const data:Definition={id,name:recipe.class,param_int:recipe.paramInt??choice.amount,target_team:target==='spell_target'?recipientTeam:effectTargetTeam(target),target_mode:effectTargetMode(target,unit)};if(recipe.cardPool)data.param_card_pool=recipe.cardPool;if(recipe.status){data.param_status_effects=[{status:statusRef(recipe.status),count:choice.amount}];delete data.param_int;}if(recipe.target==='none'){if(recipe.class==='CardEffectMix'){delete data.target_team;delete data.target_mode;}else{data.target_team='none';data.target_mode='room';}}if(choice.duration==='run'||choice.recipe==='max_health'){if(!recipe.durations?.includes(choice.duration??'combat'))throw Error('Duración no disponible para este efecto.');const upgrade:Definition={id:id+'Upgrade',...(choice.recipe==='attack'?{bonus_damage:choice.amount}:choice.recipe==='max_health'?{bonus_hp:choice.amount}:{status_effect_upgrades:[{status:statusRef(recipe.status),count:choice.amount}]})};add('upgrades',upgrade);data.name='CardEffectAddCardUpgradeToUnits';data.param_upgrade='@'+upgrade.id;data.param_int_3=choice.duration==='run'?2:0;delete data.param_int;delete data.param_status_effects;}return add('effects',data);}
 function trigger(choice:EffectChoice,id:string){const effect=recipeEffect(choice,id+'Effect',true);const text=recipeText(choice,true);return add('character_triggers',{id,trigger:triggerReference(choice.when,rules),effects:['@'+effect.id],descriptions:{spanish:text.es,english:text.en}});}
 function recipeText(choice:EffectChoice,unit=false){const recipe=rules.recipes.find((r:any)=>r.id===choice.recipe);return Object.fromEntries(['es','en'].map(language=>[language,recipe?.gameDescription??recipeDescription(choice,rules,language,unit)]));}
 for(const [number,card]of cards.entries()){
  if(inspected&&card!==inspected)continue;
  const prefix='C'+number+'_',rootId=prefix+'Card';let object:Definition;let useOriginalDescription=false;let character:Definition|undefined;
  const template=card.templateId?await readExample(card.templateId):undefined;
  const useNewPassive=card.kind==='room'&&!!card.passive&&(copiedCardNeedsPassive(card,template)||template?.simplified?.needsEffect);
  if(template&&!useNewPassive){const example=template;useOriginalDescription=!card.description||Object.values(example.descriptions).includes(card.description);const configured=applyExampleParameters(example,card);const copy=card.pathInTree&&d.champions.some(c=>c.card.uid===card.uid)?championBaseDocument(example,configured):configured;const copied=nativeDocumentCopy(copy,prefix,classId);for(const [section,arr]of Object.entries(copied.document))for(const renamed of arr){if(section==='sprites'){const original=copy.sprites.find(o=>copied.id('sprites',o.id)===renamed.id)!,asset=example.assets[original.path];if(!asset)throw Error('Una imagen del ejemplo no esta incluida.');renamed.path=await saveImage(asset,renamed.id);}add(section,renamed);}object=copied.document[example.root.section].find(o=>o.id===copied.id(example.root.section,example.root.id))!;
   if(card.kind==='unit'){const effect=(object.effects??[]).map((ref:any)=>(document.effects??[]).find(e=>e.id===String(ref).replace(/^@/,''))).find((e:any)=>e?.param_character);character=(document.characters??[]).find(c=>c.id===String(effect?.param_character).replace(/^@/,''));if(!character)throw Error('No se encuentra la unidad del ejemplo.');}
  }else{
   const fallback=await readExample(card.kind==='unit'?rules.defaultUnit:card.kind==='room'?rules.defaultRoom:card.kind==='artifact'?rules.defaultArtifact:rules.defaultSpell);
   object=add(card.kind==='artifact'?'relics':'cards',{id:rootId,card_type:card.kind==='unit'?'monster':card.kind==='room'?'room':'spell',cost:card.cost,rarity:card.rarity,targets_room:true,targetless:false,effects:[],card_art:await newArt(prefix+'Card',card.image??template?.picture??fallback.picture,'card_art')});
   if(card.kind==='room'||card.kind==='artifact'){const recipe=rules.passives.find((p:any)=>p.id===card.passive?.recipe&&p.kind===card.kind);if(!recipe)throw Error('Elige un efecto para tu sala o artefacto.');const amount=card.passive!.amount;
    if(card.kind==='room'){
     const rule=recipe.modifier
      ?{room_modifier_upgrades:['@'+add('room_modifiers',{id:prefix+'RoomModifier',name:recipe.modifier,param_int:amount}).id]}
      :{status_effect_upgrades:[{status:recipe.status,count:amount}]};
     const upgrade=add('upgrades',{id:prefix+'RoomUpgrade',titles:localized(card.name),descriptions:{spanish:recipe.description.es.replace('{amount}',String(amount)),english:recipe.description.en.replace('{amount}',String(amount))},...rule,hide_icon_on_card:true});const e=add('effects',{id:prefix+'RoomEffect',name:'CardEffectAttachTrainRoomAttachment',target_mode:'room',target_team:recipe.team,param_upgrade:'@'+upgrade.id,param_bool:false,param_bool_2:false});object.effects=['@'+e.id];object.targetless=true;}
    else{const file=await saveImage(card.image??template?.picture??fallback.picture,prefix+'RelicIcon');const sprite=add('sprites',{id:prefix+'RelicIcon',path:file});const effect=add('relic_effects',{id:prefix+'RelicEffect',name:recipe.class,param_int:amount});delete object.card_type;delete object.card_art;delete object.effects;delete object.targets_room;delete object.targetless;object.type='collectable';object.icon='@'+sprite.id;object.icon_small='@'+sprite.id;object.relic_effects=['@'+effect.id];object.extensions=[{collectable:{class:'@'+classId,pools:['MegaRelicPool'],rarity:card.rarity}}];}
   }
   if(card.kind==='unit'){const nativeCharacter=fallback.official&&!card.characterImage?fallback.document.characters?.find(c=>c.character_art)?.character_art:null;character=add('characters',{id:prefix+'Unit',character_art:nativeCharacter??await newArt(prefix+'Character',card.characterImage??fallback.characterPicture??fallback.picture,'character_art'),size:card.size,health:card.health,attack_damage:card.attack});const spawn=add('effects',{id:prefix+'Spawn',name:'CardEffectSpawnMonster',target_mode:'room',target_team:'monsters',param_character:'@'+character.id});object.effects=['@'+spawn.id];}
  }
  if(card.traits?.length){
   const present=activeCardTraitClasses(document,{section:'cards',id:object.id});
   for(const name of card.traits){
    if(present.has(name))continue;
    const trait=add('traits',{id:prefix+'AddedTrait_'+name,name});
    (object.traits??=[]).push('@'+trait.id);
   }
  }
  roots.set(card.uid,object);object.names=localized(card.name);if(!useOriginalDescription)object.descriptions=localized(card.description);if(card.kind==='spell'){
   const appended=card.effects.filter(effect=>!reserve(effect));
   if(appended.length){
    const existing=object.descriptions??{};
    object.descriptions=Object.fromEntries(([['spanish','es'],['english','en']] as const).map(([locale,language])=>
     [locale,[existing[locale],...appended.map(effect=>recipeText(effect)[language])].filter(Boolean).join(' ')]));
   }
  }object.cost=card.cost;object.rarity=card.rarity;object.hide_in_logbook=false;
  if(template?.simplified&&!useNewPassive&&!card.description){
   const text={english:simplifiedEffectText(document,object,'en',rules),spanish:simplifiedEffectText(document,object,'es',rules)};
   if(card.kind==='spell'&&card.effects.length)for(const [locale,language] of [['english','en'],['spanish','es']] as const)
    text[locale]=[text[locale],...card.effects.filter(effect=>!reserve(effect)).map(effect=>recipeText(effect)[language])].filter(Boolean).join(' ');
   object.descriptions=text;
  }
  if((!card.description||useNewPassive&&Object.values(template?.descriptions??{}).includes(card.description))&&(!card.templateId||useNewPassive)&&card.passive){const p=rules.passives.find((p:any)=>p.id===card.passive!.recipe);object.descriptions={spanish:p.description.es.replace('{amount}',String(card.passive.amount)),english:p.description.en.replace('{amount}',String(card.passive.amount))};}
  if(card.kind==='artifact'&&template&&card.passive){
   const recipe=rules.passives.find((p:any)=>p.id===card.passive!.recipe&&p.kind==='artifact');
   if(!recipe)throw Error('Elige un efecto para tu artefacto.');
   if(!object.relic_effects?.length)delete object.relic_activated_texts;
   const added=add('relic_effects',{id:prefix+'AddedRelicEffect',name:recipe.class,param_int:card.passive.amount});
   (object.relic_effects??=[]).push('@'+added.id);
   const original=object.descriptions??{};
   object.descriptions=Object.fromEntries((['es','en'] as const).map(language=>{
    const locale=language==='es'?'spanish':'english';
    const addedText=recipe.description[language].replace('{amount}',String(card.passive!.amount));
    return [locale,[original[locale],addedText].filter(Boolean).join(' ')];
   }));
  }
  if(card.kind==='artifact'){delete object.cost;for(const ext of object.extensions??[])if(ext.collectable){ext.collectable.class='@'+classId;ext.collectable.rarity=card.rarity;ext.collectable.pools=card.reward===false?[]:['MegaRelicPool'];object.pools=card.reward===false?[]:['MegaRelicPool'];ext.collectable.unlock_level=card.unlockLevel;}}
  else{object.class='@'+classId;object.pools=d.starters.includes(card)?[starterPool]:d.champions.some(c=>c.card===card)||card.reward===false?[]:card.banner?['UnitsAllBanner','@'+bannerPool]:['MegaPool','@'+draftPool];if(card.unlockLevel>1)object.unlock_level=card.unlockLevel;else delete object.unlock_level;}
  let artifactAppearance=template;
  if(card.appearanceTemplateId){const appearance=await readExample(card.appearanceTemplateId),original=appearance.document[appearance.root.section].find(o=>o.id===appearance.root.id)!;const graphics=Object.fromEntries(Object.entries(appearance.document).filter(([section])=>['sprites','game_objects','vfxs'].includes(section))),copied=nativeDocumentCopy(graphics,prefix+'Appearance_',classId);for(const [section,definitions]of Object.entries(copied.document))for(const item of definitions){if(section==='sprites'){const source=appearance.document.sprites.find(o=>copied.id('sprites',o.id)===item.id)!,asset=appearance.assets[source.path];if(!asset)throw Error('El arte original no esta incluido.');item.path=await saveImage(asset,item.id);}add(section,item);}const art=(ref:any,section:string)=>typeof ref==='string'&&ref.startsWith('@')&&copied.document[section]?.some(o=>o.id===copied.id(section,ref.slice(1)))?'@'+copied.id(section,ref.slice(1)):structuredClone(ref);if(card.kind==='artifact'){artifactAppearance=appearance;object.icon=art(original.icon,'sprites');object.icon_small=art(original.icon_small??original.icon,'sprites');}else object.card_art=art(original.card_art,'game_objects');if(character){const spawn=appearance.document.effects.find(o=>(original.effects??[]).includes('@'+o.id)&&o.param_character),unit=appearance.document.characters.find(o=>'@'+o.id===spawn?.param_character);if(unit?.character_art)character.character_art=art(unit.character_art,'game_objects');if(unit)character.subtypes=structuredClone(unit.subtypes??[]);}}
  const artifactImage=card.kind==='artifact'?(card.image??(!object.icon?artifactAppearance?.picture:undefined)):undefined;
  if(artifactImage){
   const id=prefix+'CustomRelicIcon';
   add('sprites',{id,path:await saveImage(artifactImage,id)});object.icon='@'+id;object.icon_small='@'+id;
   if(!card.image&&artifactAppearance?.detailPicture){
    const smallId=id+'Small';add('sprites',{id:smallId,path:await saveImage(artifactAppearance.detailPicture,smallId)});object.icon_small='@'+smallId;
   }
  }
  if(card.image&&card.kind!=='artifact')object.card_art=await newArt(prefix+'CustomCard',card.image,'card_art');
  const detailIcon=d.artwork?.['detail:'+card.uid]?.image;if(detailIcon){const id=prefix+'DetailIcon';add('sprites',{id,path:await saveImage(detailIcon,id)});if(card.kind==='artifact')object.icon_small='@'+id;else{const effect=(object.effects??[]).map((ref:any)=>(document.effects??[]).find(e=>'@'+e.id===ref)).find((e:any)=>e?.name===(card.kind==='room'?'CardEffectAttachTrainRoomAttachment':'CardEffectAttachEquipment'));const upgrade=(document.upgrades??[]).find(u=>'@'+u.id===effect?.param_upgrade);if(!upgrade)throw Error('No se encuentra el icono de esta sala o equipo.');upgrade.icon='@'+id;}}
  if(character){characterRoots.set(card.uid,character);character.names=localized(card.name);character.attack_damage=card.attack;character.health=card.health;character.size=card.size;
   if(card.characterImage)character.character_art=await newArt(prefix+'CustomCharacter',card.characterImage,'character_art');
   const art=(document.game_objects??[]).find(a=>a.id===String(character!.character_art).replace(/^@/,''));if(art){const ext=art.extensions.character_art;const transform=ext.transform??={};if(card.scale!==1){const s=transform.scale??{x:1,y:1,z:1};transform.scale={...s,x:s.x*card.scale,y:s.y*card.scale};}if(card.positionY!==0){const o=transform.offset??{x:0,y:0,z:0};transform.offset={...o,y:(o.y??0)+card.positionY};}artworks.set(card.uid,character.character_art);}
   for(const a of card.abilities??[]){const current=(character.starting_status_effects??=[]).find((s:any)=>unitStatusKey(s.status)===a.status);if(current)current.count=rules.unitAbilities.find((s:any)=>unitStatusKey(s.status)===a.status)?.fixed?1:current.count+a.count;else character.starting_status_effects.push(abilityData(a));}
   if(character.starting_status_effects)character.starting_status_effects=character.starting_status_effects.filter((s:any)=>s.count!==0);
   if(card.banner)character.subtypes=[...(character.subtypes??[]).filter((s:any)=>!String(s).includes('Champion')),'SubtypesData_BannerUnit'];
   for(const [i,choice]of card.effects.entries()){const t=trigger(choice,prefix+'Trigger'+i);(character.triggers??=[]).push('@'+t.id);}
  }else if(card.kind==='equipment'&&(card.effects.length||card.abilities?.length)){
   const upgrade=equipmentUpgrade(document,object);
   if(!upgrade)throw Error('Este equipo necesita una mejora para añadirle efectos.');
   for(const ability of card.abilities??[])(upgrade.status_effect_upgrades??=[]).push(abilityData(ability));
   for(const [i,choice]of card.effects.entries()){
    const action=trigger(choice,prefix+'Trigger'+i);
    (upgrade.trigger_upgrades??=[]).push('@'+action.id);
   }
  }else if(card.kind==='spell'){
   const recipientTeam=spellRecipientTeam(document,object,card.effects,rules);
   for(const [i,choice]of card.effects.entries()){
    const effect=recipeEffect(choice,prefix+'Effect'+i,false,recipientTeam);
    if(reserve(choice)){
     const text=recipeText(choice);
     const activation=add('card_triggers',{id:prefix+'CardTrigger'+i,trigger:choice.when,effects:['@'+effect.id],descriptions:{english:text.en,spanish:text.es}});
     (object.triggers??=[]).push('@'+activation.id);
    }else (object.effects??=[]).push('@'+effect.id);
   }
   const guidedDropTarget=card.effects.some(c=>!reserve(c)&&effectTargetMode(c.target,false)==='drop_target_character'&&
    rules.recipes.find((r:any)=>r.id===c.recipe)?.target!=='none');
   if(guidedDropTarget)object.targetless=false;
   else if(!card.templateId)object.targetless=true;
  }
 }
 for(const c of document.cards??[]){c.class='@'+classId;if(!c.pools)c.pools=[];}
 if(inspected){
  if(d.champions.some(spec=>spec.card===inspected))setChampionStats(roots.get(inspected.uid)!,characterRoots.get(inspected.uid)!);
  const prefix='C'+cards.indexOf(inspected)+'_';
  const definitions=Object.fromEntries(Object.entries(document).map(([section,items])=>[section,items.filter(item=>item.id.startsWith(prefix))]).filter(([,items])=>items.length));
  sanitizeLocalizedText(definitions);
  await fs.rm(root,{recursive:true,force:true});
  return {root,project:'src/'+identity+'.Plugin.csproj',classId,validation:[],cardJson:JSON.stringify(definitions,null,2)};
 }
 const bannerCards=d.cards.filter(c=>c.kind==='unit'&&c.banner&&c.reward!==false);const rarityFloor=bannerCards.some(c=>c.rarity==='common')?'common':bannerCards.some(c=>c.rarity==='uncommon')?'uncommon':'rare';for(const r of base.rewards)for(const e of r.extensions??[])if(e.draft)e.draft.rarity_floor=rarityFloor;
 base.upgrades=[];
 for(let i=0;i<2;i++){const spec=d.champions[i],card=roots.get(spec.card.uid)!,char=characterRoots.get(spec.card.uid)!;setChampionStats(card,char);const champ=base.classes[0].champions[i];champ.card_data='@'+card.id;champ.starter_card='@'+roots.get(d.starters[i].uid)!.id;
  const nativeRoots=new Map<string,Definition>();
  for(const [pi,p]of spec.paths.entries()){const sources=[...new Set(p.levels.map(l=>l.native?.templateId).filter((id):id is string=>!!id))];for(const source of sources){const example=await readExample(source),copy=applyExampleParameters(example,{...spec.card,removedTemplateEffects:undefined,copiedEffectEdits:undefined,parameters:{...spec.card.parameters,...Object.assign({},...p.levels.filter(l=>l.native?.templateId===source).map(l=>l.native!.parameters))}});for(const l of p.levels.filter(l=>l.native?.templateId===source)){const changed=removeTemplateEffects(copy,{section:'upgrades',id:l.native!.upgradeId},l.native!.removedTemplateEffects);if(changed.length)reviseEffectDescriptions(example.document,copy,changed,rules);applyCopiedEffectEdits(copy,example.document,{section:'upgrades',id:l.native!.upgradeId},{...spec.card,copiedEffectEdits:l.native!.copiedEffectEdits,removedTemplateEffects:l.native!.removedTemplateEffects},rules,exampleParameters(example));}const definitions=new Map<string,Definition>();for(const [section,arr]of Object.entries(copy))for(const o of arr)definitions.set(section+'|'+o.id,o);
   const sections:Record<string,string>={param_effects:'effects',trigger_effects:'effects',ability_upgrade:'cards',room_ability_upgrade:'cards',ability:'cards',param_card:'cards',param_character:'characters',param_upgrade:'upgrades',initial_upgrades:'upgrades',remove_upgrades:'upgrades',effects:'effects',traits:'traits',trait_upgrades:'traits',trigger_upgrades:'character_triggers',card_trigger_upgrades:'card_triggers',room_modifier_upgrades:'room_modifiers',room_modifiers:'room_modifiers',card_art:'game_objects',character_art:'game_objects',sprite:'sprites',param_card_filter:'upgrade_masks',filters:'upgrade_masks',applied_vfx:'vfxs',impact_vfx:'vfxs',projectile_vfx:'vfxs'};
   const resolve=(ref:string,field:string,section:string)=>{const id=ref.replace(/^@/,'');const preferred=field==='triggers'?(section==='cards'?'card_triggers':'character_triggers'):sections[field];if(preferred&&definitions.has(preferred+'|'+id))return preferred+'|'+id;const candidates=[...definitions.keys()].filter(k=>k.endsWith('|'+id));if(candidates.length===1)return candidates[0];if(candidates.length>1)throw Error('Referencia de senda ambigua: '+field+' '+id);};
   const needed=new Set<string>();const visit=(key:string)=>{if(needed.has(key))return;needed.add(key);const section=key.split('|')[0];const walk=(v:any,field='')=>{if(Array.isArray(v))v.forEach(x=>walk(x,field));else if(v&&typeof v==='object'){if(!v.mod_reference)Object.entries(v).forEach(([k,x])=>walk(x,k));}else if(typeof v==='string'&&(v.startsWith('@')||field==='remove_upgrades')){const next=resolve(v,field,section);if(next)visit(next);}};walk(definitions.get(key));};p.levels.filter(l=>l.native?.templateId===source).forEach(l=>visit('upgrades|'+l.native!.upgradeId));
   const ids=new Map<string,string>();for(const key of needed)ids.set(key,`P${i}_${pi}_`+key.replace(/[^A-Za-z0-9_]/g,'_'));p.levels.forEach((l,li)=>{if(l.native?.templateId===source)ids.set('upgrades|'+l.native.upgradeId,`Champion${i}Path${pi}Level${li}`);});
   for(const key of needed){const section=key.split('|')[0],o=definitions.get(key)!;const rewrite=(v:any,field=''):any=>Array.isArray(v)?v.map(x=>rewrite(x,field)):v&&typeof v==='object'?(v.mod_reference?v:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,rewrite(x,k)]))):typeof v==='string'&&(v.startsWith('@')||field==='remove_upgrades')?((ref=>ref&&ids.has(ref)?'@'+ids.get(ref):v)(resolve(v,field,section))):v;const renamed=rewrite(o);renamed.id=ids.get(key);if(section==='sprites'){const asset=example.assets[o.path];if(!asset)throw Error('Missing path artwork');renamed.path=await saveImage(asset,renamed.id);}if(section==='cards'){renamed.class='@'+classId;renamed.pools=[];renamed.hide_in_logbook=true;}add(section,renamed);if(section==='upgrades')nativeRoots.set(renamed.id,renamed);}

  }}
  champ.upgrade_tree=spec.paths.map((p,pi)=>p.levels.map((l,li)=>{const id=`Champion${i}Path${pi}Level${li}`;const triggers=l.effects.map((e,n)=>'@'+trigger(e,id+'Trigger'+n).id);const native=l.native?nativeRoots.get(id):undefined;const upgrade=native??{id};Object.assign(upgrade,{titles:localized(p.name+(li?' '+['I','II','III'][li]:'')),bonus_damage:l.attack,bonus_hp:l.health,bonus_size:l.size});if(l.abilities?.length)upgrade.status_effect_upgrades=[...(upgrade.status_effect_upgrades??[]),...l.abilities.map(abilityData)];if(triggers.length)upgrade.trigger_upgrades=[...(upgrade.trigger_upgrades??[]),...triggers];if(!native)base.upgrades.push(upgrade);return '@'+id;}));
  const characterArt=(document.game_objects??[]).find(a=>a.id===String(char.character_art).replace(/^@/,''));const charSprite=(document.sprites??[]).find(s=>s.id===String(characterArt?.extensions.character_art.sprite).replace(/^@/,''));if(charSprite||typeof char.character_art==='object'){const example=await readExample(spec.card.templateId??rules.defaultUnit);const source=charSprite?await fs.readFile(path.join(root,charSprite.path)):example.picture?await imageBytes(d,example.picture):await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#193b40"/><text x="128" y="170" text-anchor="middle" font-size="140" fill="white">?</text></svg>')).png().toBuffer();for(const [ref,width,height]of [[champ.icon,320,256],[champ.locked_icon,320,256],[champ.portrait,240,270]] as [string,number,number][]){const icon=document.sprites.find(s=>s.id===ref.slice(1));if(icon)await sharp(source).resize(width,height,{fit:'contain',background:'#152b32'}).png().toFile(path.join(root,icon.path));}const display=base.classes[0].class_select_character_displays[i];if(!charSprite){if(example.picture)base.classes[0].class_select_character_displays[i]=await newArt('Champion'+i+'Selection',example.picture,'character_art');else{const id='Champion'+i+'Selection';const file='textures/'+id+'.png';await fs.writeFile(path.join(root,file),source);add('sprites',{id:id+'Sprite',path:file});add('game_objects',{id,type:'character_art',extensions:{character_art:{sprite:'@'+id+'Sprite'}}});base.classes[0].class_select_character_displays[i]='@'+id;}}const obj=document.game_objects.find(a=>a.id===display.slice(1));if(obj&&charSprite)obj.extensions.character_art={sprite:'@'+charSprite.id,transform:{scale:{x:.7,y:.7,z:1},offset:{x:0,y:1,z:0}}};}
 }
 base.classes[0].descriptions=localized(d.description||d.name);base.classes[0].subclass_descriptions=localized(d.description||d.name);
 // Authentic game frames are used when the local extraction is present.
 for(const [key,ref]of Object.entries(base.class_card_styles[0])){if(key==='id'||typeof ref!=='string')continue;const sprite=document.sprites.find(s=>s.id===ref.slice(1));if(sprite){const type=key.includes('unit')?'unit':key.includes('spell')?'spell':'equipment';const frame=rules.officialFrames[type+'-cardframe-'+rules.defaultFrameTheme];const source=frame?path.join(catalogRoot,frame.asset):path.join(catalogRoot,'ui',type==='unit'?'unit.png':type==='spell'?'spell.png':'room.png');await fs.copyFile(source,path.join(root,sprite.path));}}
 const escaped=(d.name.trim().slice(0,2).toUpperCase()).replace(/[<>&"']/g,'');const fallbackIcons=d.icon?undefined:originalClanIcons(d,(await exampleList()).items,rules.officialClanIcons);
 const iconAsset=d.icon??fallbackIcons?.large;const icon=iconAsset?await imageBytes(d,iconAsset):await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" rx="50" fill="#174f52"/><text x="128" y="165" text-anchor="middle" font-size="110" font-family="sans-serif" fill="#ffe4ad">${escaped}</text></svg>`)).png().toBuffer();
 for(const ref of [...Object.values(base.classes[0].icons),base.classes[0].card_draft_icon]){const s=document.sprites.find(s=>s.id===String(ref).slice(1));if(s){const m=await sharp(path.join(root,s.path)).metadata();await sharp(icon).resize(m.width!,m.height!,{fit:'contain',background:'#00000000'}).png().toFile(path.join(root,s.path));}}
 await fs.writeFile(path.join(root,'icon.png'),await sharp(icon).resize(256,256).png().toBuffer());
 for(const stone of d.stones??[]){
  const id='Stone_'+stone.uid,settings=rules.stones;
  const target=settings.targets.find((item:any)=>item.id===stone.kind);
  const group=settings.groups.find((item:any)=>item.id===stone.group);
  const recipe=settings.recipes.find((item:any)=>item.id===stone.recipe);
  const names=localized(stone.name.trim()),descriptions=Object.fromEntries(Object.entries(recipe.description).map(([language,text])=>
   [language==='en'?'english':'spanish',String(text).replace('{amount}',String(stone.amount))]));
  const source=stone.image?await imageBytes(d,stone.image):icon;
  for(const [suffix,size]of [['Icon',settings.iconPixels],['Small',settings.hudPixels]] as [string,number][]){
   const spriteId=id+suffix,file='textures/'+spriteId+'.png';
   await sharp(source).resize(size,size,{fit:'contain',background:'#00000000'}).png().toFile(path.join(root,file));
   add('sprites',{id:spriteId,path:file});
  }
  const upgrade=add('upgrades',{id:id+'Upgrade',titles:names,descriptions,icon:'@'+id+'Small',
   ...Object.fromEntries(recipe.fields.map((field:string)=>[field,stone.amount])),
   ...(recipe.filters?{filters:recipe.filters}:{})});
  if(recipe.trigger){
   const armor=add('effects',{id:id+'TriggerEffect',name:'CardEffectAddStatusEffect',target_mode:'self',target_team:'monsters',
    param_status_effects:[{status:statusRef(recipe.status),count:stone.amount}]});
   const trigger=add('character_triggers',{id:id+'Trigger',trigger:recipe.trigger,effects:['@'+armor.id]});
   upgrade.trigger_upgrades=['@'+trigger.id];
  }
  add('relic_effects',{id:id+'Effect',name:'RelicEffectCardUpgrade',param_card_type:target.cardType,param_upgrade:'@'+id+'Upgrade'});
  const pool=group.prefix+target.pool+(stone.rarity==='rare'?'Rare':'Common');
  add('relics',{id,type:'enhancer',names,descriptions,icon:'@'+id+'Icon',icon_small:'@'+id+'Small',relic_effects:['@'+id+'Effect'],
   extensions:[{enhancer:{class:'@'+classId,rarity:stone.rarity,num_cards_to_show_in_upgrade_screen:0,pools:stone.draftReward?[pool,...settings.draftRewardPools]:[pool]}}]});
 }
 await applyClanArtwork(d,rules,base,document,root,asset=>imageBytes(d,asset));
 sanitizeLocalizedText(base);
 sanitizeLocalizedText(document);
 await fs.writeFile(path.join(root,'json/clan.json'),'\uFEFF'+JSON.stringify(base,null,2).replaceAll('\n','\r\n')+'\r\n');await fs.writeFile(path.join(root,'json/cards.json'),'\uFEFF'+JSON.stringify(document,null,2).replaceAll('\n','\r\n')+'\r\n');
 const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));manifest.description=d.description||d.name;manifest.namespace='Local';manifest.dependencies=['BepInEx-BepInExPack-5.4.2100','MT2-Trainworks_Reloaded-'+rules.dependencies.trainworks,'Conductor-Conductor-'+rules.dependencies.conductor];await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
 const plugin=path.join(root,'src/Plugin.cs');let cs=await fs.readFile(plugin,'utf8');cs=cs.replace('[BepInPlugin(',`[BepInDependency("TrainworksReloaded.Plugin", "${rules.dependencies.trainworks}")]\n[BepInDependency("Conductor", "${rules.dependencies.conductor}")]\n[BepInPlugin(`);await fs.writeFile(plugin,cs);const project=path.join(root,'src',identity+'.Plugin.csproj');await fs.writeFile(project,(await fs.readFile(project,'utf8')).replace(/Version="0\.7\.32"/g,`Version="${rules.dependencies.trainworks}"`));
 const credits=path.join(root,'credits');await fs.cp(path.join(catalogRoot,'credits'),credits,{recursive:true});await fs.writeFile(path.join(root,'README.md'),`# ${d.name}\n\n${d.description}\n\nRequires BepInExPack, Trainworks Reloaded ${rules.dependencies.trainworks} and Conductor ${rules.dependencies.conductor}. Install them in your Monster Train 2 mod manager profile. Close the game, extract the mod folder into BepInEx/plugins in that profile, and launch the game with mods enabled.\n\nInstala BepInExPack, Trainworks Reloaded ${rules.dependencies.trainworks} y Conductor ${rules.dependencies.conductor} en tu perfil de Monster Train 2. Cierra el juego, extrae la carpeta del mod en BepInEx/plugins de ese perfil y abre el juego con mods activados.\n\nGenerado por MT2 Clan Creator; revisa ambos campeones y las recompensas dentro del juego.\n`);
 const clan=await scanClan(root);const validation=await validateClan(clan);const errors=validation.filter((i:any)=>i.severity==='error');if(errors.length)throw Error('Revisa el contenido del clan: '+errors.map((e:any)=>e.message).slice(0,4).join('; '));return {root,project:'src/'+identity+'.Plugin.csproj',classId,validation};
 }catch(error){if(inside(generated,root)&&root!==generated)await fs.rm(root,{recursive:true,force:true});throw error;}
}
function setChampionStats(card:Definition,character:Definition){
 card.rarity='champion';
 card.cost=0;
 character.subtypes=[...(character.subtypes??[]).filter((x:any)=>!String(x).includes('BannerUnit')),'SubtypesData_Champion_83f21cbe-9d9b-4566-a2c3-ca559ab8ff34'];
}
function sanitizeLocalizedText(value:unknown):boolean{
 if(Array.isArray(value)){
  for(const item of value)sanitizeLocalizedText(item);
  return false;
 }
 if(!value||typeof value!=='object')return false;
 const object=value as Record<string,unknown>;
 const languages=langKeys.filter(language=>typeof object[language]==='string');
 if(languages.length){
  delete object.key;
  for(const language of languages)if(object[language]==='')delete object[language];
 }
 for(const [key,entry]of Object.entries(object))if(sanitizeLocalizedText(entry))delete object[key];
 return languages.length>0&&!Object.keys(object).length;
}

// 2026-11-15-0855||codex-clan-editor||clan-creator/src/server/creator/export.ts||Generar clan independiente con ejemplos y arte incluidos, campeones, sendas, pools, desbloqueos y validación
// 2026-11-15-0907||codex-clan-editor||clan-creator/src\server\creator\export.ts||Corregir objetivos de efectos, descripciones automáticas y nivel de desbloqueo de reliquias
// 2026-11-15-0912||codex-clan-editor||clan-creator/src\server\creator\export.ts||Generar salas y artefactos propios desde selecciones guiadas con arte y descripciones automáticas
// 2026-11-15-0913||codex-clan-editor||clan-creator/src\server\creator\export.ts||Conservar textos dinámicos multilingües del ejemplo cuando el usuario no ha reescrito su descripción
// 2026-11-15-0921||codex-clan-editor||clan-creator/src\server\creator\export.ts||Incluir siempre en el texto los efectos añadidos a un hechizo, también al partir de un ejemplo
// 2026-11-15-0922||codex-clan-editor||clan-creator/src\server\creator\export.ts||Asignar también las cartas auxiliares copiadas al nuevo clan y conservarlas fuera de sus recompensas
// 2026-11-15-0927||codex-clan-editor||clan-creator/src\server\creator\export.ts||Evitar localizaciones vacías que oculten descripciones o impidan el fallback del juego
// 2026-11-15-0930||codex-clan-editor||clan-creator/src\server\creator\export.ts||Mantener recompensas normales y ajustar la rareza mínima de estandartes para no excluir las unidades elegidas
// 2026-11-15-1018||codex-clan-editor||clan-creator/src/server/creator/export.ts||Exportar cartas oficiales con prefabs originales, iconos derivados y marcos auténticos
// 2026-11-15-1029||codex-clan-editor||clan-creator/src/server/creator/export.ts||Usar arte oficial también al crear desde cero y generar selección estática registrada para campeones nativos
// 2026-11-15-1220||codex-clan-editor||clan-creator/src/server/creator/export.ts||Exportar nuevos tipos, excluir auxiliares de recompensas y permitir campeones sin PNG local
// 2026-11-15-1225||codex-clan-editor||clan-creator/src/server/creator/export.ts||Permitir reemplazar iconos de artefactos nativos y respetar si participan en recompensas
// 2026-11-15-1431||codex-clan-editor||clan-creator/src\server\creator\export.ts||Generar capacidades iniciales reales y mejoras de senda con estados nativos, además de triggers personalizados
// 2026-11-15-1435||codex-clan-editor||clan-creator/src\server\creator\export.ts||Evitar acumular capacidades fijas ya presentes en el ejemplo
// 2026-11-15-1455||codex-clan-editor||clan-creator/src\server\creator\export.ts||Omitir capacidades iniciales desactivadas en el clan generado
// 2026-11-15-1826||codex-clan-editor||clan-creator/src\server\creator\export.ts||Exportar mejoras permanentes con CardEffectAddCardUpgradeToUnits y UnitUpgradeLifetime.Permanent=2; salud temporal=0
// 2026-11-15-1938||codex-clan-editor||clan-creator/src/server/creator/export.ts||Evitar aplicar nivel I como mejora inicial y como senda simultaneamente
// 2026-11-15-1938||codex-clan-editor||clan-creator/src/server/creator/export.ts||Materializar sendas completas con efectos propios y retirada correcta de niveles anteriores
// 2026-11-15-1938||codex-clan-editor||clan-creator/src/server/creator/export.ts||Conservar todos los efectos nativos al editar estadisticas o anadir efectos de una senda
// 2026-11-15-1942||codex-clan-editor||clan-creator/src/server/creator/export.ts||Copiar solo dependencias utilizadas por sendas y ocultar cartas auxiliares para evitar campeones fantasma
// 2026-11-15-2011||codex-clan-editor||clan-creator/src/server/creator/export.ts||Exportar capacidades y efectos Conductor con mod_reference tambien en campeones y sendas
// 2026-11-15-2012||codex-clan-editor||clan-creator/src/server/creator/export.ts||Resolver dependencias por seccion para preservar habilidades con ID igual al de su mejora de campeon
// 2026-11-15-2048||codex-clan-editor||clan-creator/src/server/creator/export.ts||Conservar efectos restantes al eliminar acciones de cartas o sendas y respetar textos actualizados
// 2026-11-15-2107||codex-clan-editor||clan-creator/src/server/creator/export.ts||Aplicar nuevos efectos a la unidad receptora del hechizo y omitir destinatario en su descripcion
// 2026-11-15-2330||codex-clan-editor||clan-creator/src/server/creator/export.ts||Preservar arte original al copiar mecanicas y evitar colisiones de referencias en todas las copias oficiales
// 2026-11-15-2333||codex-clan-editor||clan-creator/src/server/creator/export.ts||Conservar categoria de unidad al copiar solo mecanicas sin convertirla accidentalmente en campeon o steward
// 2026-11-16-2027||codex-clan-editor||clan-creator/src/server/creator/export.ts||Permitir autor vacío usando namespace técnico Local sin crédito inventado
// 2026-11-16-2032||codex-clan-editor||clan-creator/src/server/creator/export.ts||Dejar de generar CREADO-CON.md conservando credits y README del clan
// 2026-11-16-2040||codex-clan-editor||clan-creator/src/server/creator/export.ts||Usar namespace Local interno sin dependencia del autor legado
// 2026-11-16-2322||codex-clan-editor||clan-creator/src/server/creator/export.ts||Identificar carta y campo exactos en cada aviso de revisión
// 2026-11-17-0021||codex-clan-editor||clan-creator/src\server\creator\export.ts||Usar las mismas comprobaciones en revisión y asistente
// 2026-11-17-1953||codex-clan-editor||clan-creator/src\server\creator\export.ts||Exportar los recursos de clan elegidos después de generar valores por defecto sin instalar fuentes de IA
// 2026-11-17-2000||codex-clan-editor||clan-creator/src\server\creator\export.ts||Exportar iconos independientes de sala equipo y HUD de reliquias sin sustituir sus ilustraciones
// 2026-11-19-0915||codex-clan-editor||clan-creator/src/server/creator/export.ts||Incluir los requisitos y los pasos para jugar en el archivo compartido
// 2026-11-19-2129||codex-clan-editor||clan-creator/src/server/creator/export.ts||Compartir con el editor la separación entre efectos del campeón y su senda
// 2026-11-19-2142||codex-clan-editor||clan-creator/src/server/creator/export.ts||Generar la posición nativa de avance o retroceso
// 2026-11-20-0901||codex-clan-editor||clan-creator/src/server/creator/export.ts||Bloquear revisión y generación de hechizos copiados que se quedan vacíos
// 2026-11-21-0950||codex-clan-editor||clan-creator/src/server/creator/export.ts||Reutilizar exportador para ver solo el JSON de una carta sin completar el clan
// 2026-11-21-0954||codex-clan-editor||clan-creator/src/server/creator/export.ts||Permitir inspeccionar una carta aunque falten nombres en el resto del clan
// 2026-11-21-1100||codex-clan-editor||clan-creator/src/server/creator/export.ts||Generar con el arte original las salas y artefactos simplificados que reciben una pasiva
// 2026-11-21-1100||codex-clan-editor||clan-creator/src/server/creator/export.ts||Actualizar el texto exportado a partir de los efectos realmente presentes
// 2026-11-21-1217||codex-clan-editor||clan-creator/src/server/creator/export.ts||Usar la navegación configurada al validar la exportación
// 2026-11-21-1255||codex-clan-editor||clan-creator/src/server/creator/export.ts||Generar Reserve para los efectos nuevos o sustituidos conservando el objetivo
// 2026-11-21-1309||codex-clan-editor||clan-creator/src/server/creator/export.ts||Exportar ambos equipos como objetivo nativo de sala
// 2026-11-21-1312||codex-clan-editor||clan-creator/src/server/creator/export.ts||Exportar hechizos de todo el tren sin exigir un destinatario individual
// 2026-11-21-1316||codex-clan-editor||clan-creator/src/server/creator/export.ts||Generar cambios de efectos nativos de senda y conservar las referencias de acciones
// 2026-11-21-1330||codex-clan-editor||clan-creator/src/server/creator/export.ts||Exportar artefactos con su icono oficial y mejoras de mercader con imágenes, clase y pool nativos
// 2026-11-21-1331||codex-clan-editor||clan-creator/src/server/creator/export.ts||Conservar la variante pequeña del icono oficial de un artefacto copiado
// 2026-11-21-1334||codex-clan-editor||clan-creator/src/server/creator/export.ts||Exportar el trigger Accursed de Conductor y las recompensas opcionales de las piedras
// 2026-11-21-1335||codex-clan-editor||clan-creator/src/server/creator/export.ts||Separar el icono auténtico de artefacto de la ilustración personalizada de carta
// 2026-11-21-1336||codex-clan-editor||clan-creator/src/server/creator/export.ts||Conservar iconos originales al copiar mecánicas y exportar el icono mostrado de borradores oficiales antiguos
// 2026-11-21-1342||codex-clan-editor||clan-creator/src/server/creator/export.ts||Generar efectos nuevos como activaciones del portador del equipo y conservar Accursed como referencia externa
// 2026-11-21-1344||codex-clan-editor||clan-creator/src/server/creator/export.ts||Exportar capacidades de equipo nuevas en la mejora del portador
// 2026-11-21-1510||codex-clan-editor||clan-creator/src/server/creator/export.ts||Separar las claves de localización de cada copia exportada del término de la carta oficial
// 2026-11-21-1513||codex-clan-editor||clan-creator/src/server/creator/export.ts||Exportar la pasiva elegida para recuperar una sala vacía
// 2026-11-21-1514||codex-clan-editor||clan-creator/src/server/creator/export.ts||Actualizar la descripción jugable de salas recuperadas y evitar idiomas incompletos al añadir acciones
// 2026-11-21-1515||codex-clan-editor||clan-creator/src/server/creator/export.ts||Tipar idiomas generados del texto nuevo de hechizos
// 2026-11-21-1554||codex-clan-editor||clan-creator/src/server/creator/export.ts||Separar de las claves oficiales todos los textos localizados exportados aunque estén anidados
// 2026-11-21-1557||codex-clan-editor||clan-creator/src/server/creator/export.ts||Incluir cantidades de apariciones individuales al exportar las sendas
// 2026-11-21-1814||codex-clan-editor||clan-creator/src/server/creator/export.ts||Exportar el nuevo efecto de un artefacto manteniendo su imagen
// 2026-11-21-1825||codex-clan-editor||clan-creator/src/server/creator/export.ts||Exportar el pool de infusiones del juego y conservar la palabra clave nativa
// 2026-11-21-1901||codex-clan-editor||clan-creator/src/server/creator/export.ts||Añadir una pasiva de artefacto a la copia sin reconstruir su definición ni alterar el arte
// 2026-11-21-1902||codex-clan-editor||clan-creator/src/server/creator/export.ts||Incluir las propiedades añadidas en el mismo bloque de carta y evitar duplicar las nativas
// 2026-11-21-1909||codex-clan-editor||clan-creator/src/server/creator/export.ts||Retirar el aviso de activación original cuando se sustituye la última regla de un artefacto
// 2026-11-21-1945||codex-clan-editor||clan-creator/src/server/creator/export.ts||Generar modificadores nativos de capacidad y ember al crear o completar una sala
