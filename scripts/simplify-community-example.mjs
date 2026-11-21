// Project only editable shells. Every retained mechanic is audited with all its dependencies.
const structuralEffects={
 CardEffectSpawnMonster:['param_character','characters'],
 CardEffectAttachEquipment:['param_upgrade','upgrades'],
 CardEffectAttachTrainRoomAttachment:['param_upgrade','upgrades'],
};
const descriptiveFields=new Set(['descriptions','relic_activated_texts','chatter','lore_style','lore_tooltips','additional_tooltips']);
const components={
 cards:['effects','traits','triggers','initial_upgrades'],
 relics:['relic_effects'],
 characters:['starting_status_effects','triggers','room_modifiers','ability','grafted_equipment'],
 upgrades:['status_effect_upgrades','trigger_upgrades','card_trigger_upgrades','trait_upgrades','room_modifier_upgrades','ability_upgrade','room_ability_upgrade','remove_upgrades'],
};

export async function simplifyCommunityExample(roots,{inspect,local,staticArt,restoreSpellEffectTargets}){
 const overrides=new Map(),relaxed=new Set(),removed=new Set();
 const find=(section,ref)=>typeof ref==='string'&&ref.startsWith('@')?local(section,ref):undefined;
 const pass=async (node,field,value,projected=false)=>{
  const probe={...node,data:{id:node.data.id,[field]:value}};
  const result=await inspect([probe],{overrides:projected?overrides:new Map(),relaxed:new Set(projected?[...relaxed,probe]:[probe])});
  return result.reasons.length===0;
 };
 async function projectTrigger(node){
  if(overrides.has(node))return;
  const data=structuredClone(node.data);
  let changed=false;
  for(const field of ['effects','trigger_effects']){
   if(!Array.isArray(data[field]))continue;
   const supported=[];
   for(const item of data[field])if(await pass(node,field,item))supported.push(item);
   if(supported.length!==data[field].length)changed=true;
   data[field]=supported;
  }
  if(!changed||!(data.effects?.length||data.trigger_effects?.length))return;
  delete data.descriptions;
  const copy={...node,data};
  // Conditions and trigger timing remain intact and the trigger itself must pass the audit.
  if((await inspect([copy])).reasons.length)return;
  overrides.set(node,copy);
  removed.add(node.section+'/'+data.id+'/effects');
 }
 async function preserveSpellTargets(node,supported){
  const refs=node.data.effects;
  if(node.data.card_type!=='spell'||supported.length===refs.length)return supported;
  const definitions=refs.map(ref=>find('effects',ref)).filter(Boolean);
  const referenceSet=new Set(supported);
  const removedIndices=new Set(refs.flatMap((ref,index)=>referenceSet.has(ref)?[]:[index]));
  const source=definitions.map(entry=>(overrides.get(entry)??entry).data);
  const effects=structuredClone(source);
  restoreSpellEffectTargets({effects},node.data,removedIndices);
  for(const [index,effect] of effects.entries()){
   if(effect.target_mode===source[index].target_mode)continue;
   const entry=definitions[index],projected={...entry,data:effect};
   const verification=await inspect([projected],{overrides,relaxed});
   if(!verification.reasons.length)overrides.set(entry,projected);
   else {
    // If the recovered selector itself is unsupported, remove the dependent chain.
    const rejected=refs.indexOf('@'+effect.id);
    for(const ref of refs.slice(rejected)){
     if(find('effects',ref)?.data.target_mode!=='last_targeted_characters')break;
     referenceSet.delete(ref);
    }
   }
  }
  return supported.filter(ref=>referenceSet.has(ref));
 }
 async function project(node){
  if(overrides.has(node))return overrides.get(node);
  const copy={...node,data:{id:node.data.id}};
  overrides.set(node,copy);relaxed.add(copy);
  if(node.section==='sprites'){
   copy.data=structuredClone(node.data);
   return copy;
  }
  if(node.section==='game_objects'){
   const type=node.data.type,art=node.data.extensions?.[type];
   if(!['card_art','character_art'].includes(type)||!art?.sprite)return copy;
   const sprite=find('sprites',art.sprite);
   if(sprite)await project(sprite);
   copy.data={id:node.data.id,type,extensions:{[type]:{
    sprite:art.sprite,...(art.transform?{transform:structuredClone(art.transform)}:{}),
   }}};
   if(art.animations?.length)removed.add(node.section+'/'+node.data.id+'/animation');
   return copy;
  }
  if(node.section==='upgrades'&&node.data.filters&&!await pass(node,'filters',node.data.filters)){
   for(const field of ['titles','bonus_damage','bonus_hp','bonus_size'])if(field in node.data)copy.data[field]=node.data[field];
   removed.add(node.section+'/'+node.data.id+'/filters');
   return copy;
  }
  for(const [field,value]of Object.entries(node.data)){
   if(field==='id'||field==='class'||field==='pools'||descriptiveFields.has(field))continue;
   if(['character_art','card_art','icon','icon_small'].includes(field)){
    const art=find(field.startsWith('icon')?'sprites':'game_objects',value);
    if(art&&(staticArt.has(art.data.id)||(await inspect([art])).reasons.length))await project(art);
   }
   if(field==='extensions'&&node.section==='relics'){
    const collectable=value.find(x=>x.collectable)?.collectable;
    if(collectable)copy.data.extensions=[{collectable:Object.fromEntries(Object.entries(collectable)
     .filter(([key])=>['rarity','unlock_level'].includes(key)))}];
    continue;
   }
   if(components[node.section]?.includes(field)){
    const supported=[];
    for(const item of Array.isArray(value)?value:[value]){
     const triggerSection=field==='card_trigger_upgrades'||field==='triggers'&&node.section==='cards'?'card_triggers':
      field==='trigger_upgrades'||field==='triggers'&&node.section==='characters'?'character_triggers':null;
     const trigger=triggerSection&&find(triggerSection,item);
     if(trigger)await projectTrigger(trigger);
     if(field==='effects'){
      const effect=find('effects',item),edge=structuralEffects[effect?.data.name];
      const child=edge&&find(edge[1],effect.data[edge[0]]);
      if(child){
       const result=await inspect([child]);
       if(result.reasons.length&&(!child.data.filters||await pass(child,'filters',child.data.filters)))await project(child);
      }
     }
     // A remove must correspond to a retained mechanic in this copy. Components belonging to
     // another path or the original mod must never be reintroduced by a removal reference.
     if(field!=='remove_upgrades'&&await pass(node,field,item,field==='effects'||!!trigger))supported.push(item);
     else removed.add(node.section+'/'+node.data.id+'/'+field);
    }
    const retained=field==='effects'&&node.section==='cards'?await preserveSpellTargets(node,supported):supported;
    if(retained.length)copy.data[field]=Array.isArray(value)?retained:retained[0];
   }else if(await pass(node,field,value,['character_art','card_art','icon','icon_small'].includes(field)))copy.data[field]=value;
   else removed.add(node.section+'/'+node.data.id+'/'+field);
  }
  return copy;
 }
 for(const root of roots)if((await inspect([root])).reasons.length)await project(root);
 const mapped=roots.map(root=>overrides.get(root)??root);
 const result=await inspect(mapped,{overrides,relaxed});
 return {...result,roots:mapped,removed:[...removed]};
}
// 2026-11-21-1058||codex-clan-editor||clan-creator/scripts/simplify-community-example.mjs||Recortar solo componentes completos que requieren el mod y conservar arte, estadísticas y mecánicas independientes
// 2026-11-21-1100||codex-clan-editor||clan-creator/scripts/simplify-community-example.mjs||Recuperar sprites originales de cartas y usar los sprites estáticos de Roderic y Vesper
// 2026-11-21-1103||codex-clan-editor||clan-creator/scripts/simplify-community-example.mjs||Conservar efectos independientes dentro de triggers y evitar ampliar filtros no compatibles
// 2026-11-21-1246||codex-clan-editor||clan-creator/scripts/simplify-community-example.mjs||Restaurar un objetivo comprobado antes de retirar el efecto que lo seleccionaba
