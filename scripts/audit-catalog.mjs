import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as jsonc from 'jsonc-parser';
import {stringLiterals,mentions,referenceSection,resolveLocal} from './catalog-audit-core.mjs';
import {readBundle,bundleRoot} from '../dist-server/creator/bundled.js';
const home=path.resolve(import.meta.dirname,'..'), workspace=path.dirname(home);
const out=process.env.CLAN_MOD_CATALOG_OUTPUT?path.resolve(process.env.CLAN_MOD_CATALOG_OUTPUT):path.join(home,'catalog');
const settings=JSON.parse(await fs.readFile(path.join(home,'config/mod-catalog-import.json'),'utf8'));
const sources=settings.sources;
const hash=b=>createHash('sha256').update(b).digest('hex');
const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short'}).format(new Date()).replace(' ','-').replace(':','');
const log=path.join(workspace,'docs/registro/codex-clan-editor.md');
async function write(file,data){const before=(await fs.stat(file).catch(()=>null))?.mtimeMs;if(before!==undefined)await fs.readFile(file);if((await fs.stat(file).catch(()=>null))?.mtimeMs!==before)throw Error('Cambio concurrente: '+file);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);if((await fs.stat(file)).size!==Buffer.byteLength(data))throw Error('Escritura incompleta: '+file);await fs.appendFile(log,`${stamp}||codex-clan-editor||clan-creator/${path.relative(home,file).replaceAll('\\','/')}||Catálogo auditado autocontenido; SHA256 ${hash(data)}\n`);}
async function walk(folder,ext){let all=[];for(const e of await fs.readdir(folder,{withFileTypes:true})){if(['bin','obj','.git'].includes(e.name))continue;const p=path.join(folder,e.name);if(e.isDirectory())all.push(...await walk(p,ext));else if(p.endsWith(ext))all.push(p);}return all.sort();}
const gameDll=process.env.MT2_GAME_DLL??'C:/Juegos/Steam/steamapps/common/Monster Train 2/MonsterTrain2_Data/Managed/Assembly-CSharp.dll';
const types=execFileSync('ilspycmd',['-l','c',gameDll],{encoding:'utf8',maxBuffer:12e6});
const nativeTypes=new Set(types.split(/\r?\n/).map(x=>x.trim().split(/[ .+]/).at(-1)));
const bundle=await readBundle(),libraryTypes=new Map(),conductorIndex=new Map(),libraryProof={};
for(const [provider,dll]of [['Conductor',bundle.references.Conductor],['TrainworksReloaded.Base',bundle.references['TrainworksReloaded.Base']],['TrainworksReloaded.Core',bundle.references['TrainworksReloaded.Core']],['TrainworksReloaded.Plugin',bundle.references['TrainworksReloaded.Plugin']]]){const file=path.join(bundleRoot,dll);const listed=execFileSync('ilspycmd',['-l','c',file],{encoding:'utf8',maxBuffer:12e6});libraryTypes.set(provider,new Set(listed.split(/\r?\n/).map(x=>x.trim().split(/[ .+]/).at(-1))));libraryProof[provider]={file:dll,sha256:hash(await fs.readFile(file))};}
for(const file of await walk(path.join(bundleRoot,'packages/Conductor-Conductor/json'),'.json')){const bytes=await fs.readFile(file),doc=jsonc.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));for(const [section,arr]of Object.entries(doc))if(Array.isArray(arr))for(const data of arr)if(data?.id){const row={section,data,file};conductorIndex.set(data.id,[...(conductorIndex.get(data.id)??[]),row]);}}
const conductorTypes=libraryTypes.get('Conductor'),preferred=settings.referenceSections;
const classSections=new Set(['effects','relic_effects','traits','room_modifiers','status_effects','relic_effect_conditions']);
const fields=JSON.parse(await fs.readFile(path.join(home,'config/fields.json'),'utf8'));
const triggerOptions=Object.fromEntries(['card_triggers','character_triggers'].map(s=>[s,new Set(fields[s].find(f=>f.path==='trigger').options)]));
const reports=[],catalog=[];await fs.mkdir(path.join(out,'examples'),{recursive:true});
for(const source of sources){
 const root=path.join(workspace,source.root), assetRoot=source.id==='ww'?path.join(root,'content'):root;
 const manifest=JSON.parse((await fs.readFile(path.join(root,source.manifest),'utf8')).replace(/^\uFEFF/,''));
 let commit='';try{commit=execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
 const entries=[],index=new Map(),originals={};
 for(const file of await walk(path.join(root,source.json),'.json')){const b=await fs.readFile(file);originals[file]=hash(b);const errors=[];const doc=jsonc.parse(b.toString('utf8').replace(/^\uFEFF/,''),errors,{allowTrailingComma:true});if(errors.length)throw Error(`JSON inválido: ${file}`);for(const [section,items]of Object.entries(doc??{}))if(Array.isArray(items))for(const data of items)if(data?.id){const item={section,data,file};entries.push(item);const key=String(data.id);index.set(key,[...index.get(key)??[],item]);}}
 const customClasses=new Set(),code=[],codeProof=[],reviewed=[];
 for(const file of await walk(path.join(root,'src'),'.cs')){const text=await fs.readFile(file,'utf8');for(const m of text.matchAll(/\bclass\s+(\w+)/g))customClasses.add(m[1]);const relative=path.relative(root,file).replaceAll('\\','/'),review=settings.reviews.find(r=>r.source===source.id&&r.file===relative);const digest=hash(await fs.readFile(file));codeProof.push({file:relative,sha256:digest});if(review&&review.sha256!==digest)throw Error('Revisar cambio en código auditado: '+relative);if(review)reviewed.push(review);if(!['Plugin.cs','MyPluginInfo.cs','AssemblyInfo.cs'].includes(path.basename(file)))code.push({file:relative,text:stringLiterals(text),review});}
 const report={codeSources:codeProof,reviewedCode:reviewed,source:source.id,version:manifest.version_number,commit,totalCards:entries.filter(e=>e.section==='cards').length,totalRelics:entries.filter(e=>e.section==='relics').length,notCandidates:entries.filter(e=>e.section==='cards'&&(e.data.is_an_ability||!settings.cardTypes.includes(e.data.card_type))).map(e=>({id:e.data.id,reason:e.data.is_an_ability?'Carta auxiliar de habilidad: se revisa si una carta seleccionada la necesita.':'Tipo fuera del asistente inicial: '+e.data.card_type})),scanned:0,accepted:[],excluded:[],notes:['Cierre por sección y proveedor real; no es una prueba en partida.','Se excluyen clases propias y parches funcionales; sonidos y animaciones revisados no bloquean reglas nativas.','Spare y otros eventos externos solo se admiten si su registro existe en la biblioteca incluida.']};
 for(const candidate of entries.filter(e=>e.section==='relics'||e.section==='cards'&&!e.data.is_an_ability&&settings.cardTypes.includes(e.data.card_type))){
  report.scanned++;if(settings.excludeCandidatePatterns.some(p=>new RegExp(p).test(candidate.data.id))){report.excluded.push({id:candidate.data.id,name:candidate.data.names?.english??candidate.data.id,reasons:['Contenido de pruebas o selección auxiliar, no una carta autónoma para aprender.']});continue;}const used=new Set(),pending=[candidate],reasons=new Set(),providers=new Set(['game']),images=new Map(),externalResources=new Map();
  function nativeClass(v){const sym=typeof v==='string'?v:v?.id,mod=typeof v==='object'?v.mod_reference:null,name=String(sym??'').replace(/^@/,'');if(mod){if(!libraryTypes.get(mod)?.has(name))reasons.add('Proveedor externo o clase no verificada: '+mod+'/'+name);else providers.add(mod);return;}if(String(sym).startsWith('@')||!nativeTypes.has(name))reasons.add('Clase propia o no verificada: '+name);}
  function reference(v,key,owner){if(typeof v==='object'&&v&&!Array.isArray(v)&&v.mod_reference){const id=String(v.id??'').replace(/^@/,''),section=referenceSection(key,owner.section,preferred);if(v.mod_reference==='Conductor'&&resolveLocal(conductorIndex,id,section).length===1){const resource=resolveLocal(conductorIndex,id,section)[0];externalResources.set(resource.section+'|'+id,{provider:'Conductor',section:resource.section,id,names:resource.data.names??{},descriptions:resource.data.descriptions??{},file:path.relative(bundleRoot,resource.file).replaceAll('\\','/'),sha256:bundle.files.find(f=>f.path===path.relative(bundleRoot,resource.file).replaceAll('\\','/'))?.sha256});providers.add('Conductor');return;}if(libraryTypes.get(v.mod_reference)?.has(id)&&['name','class_name','trigger_effect'].includes(key)){providers.add(v.mod_reference);return;}reasons.add('Referencia externa no verificada: '+JSON.stringify(v)+'; campo '+key);return;}
   if(Array.isArray(v)){v.forEach(x=>reference(x,key,owner));return;}if(v&&typeof v==='object'){for(const [k,x]of Object.entries(v)){if(settings.ignoredReferenceFields.includes(k))continue;if((k==='name'&&classSections.has(owner.section))||k==='class_name'||k==='trigger_effect'){nativeClass(x);continue;}reference(x,k,owner);}return;}
   if(typeof v!=='string')return;
   if(key==='trigger'&&triggerOptions[owner.section]&&!triggerOptions[owner.section].has(v))reasons.add('Evento no verificado: '+v);
   if(key==='path'){if(!v.toLowerCase().endsWith('.png')){reasons.add('Recurso no PNG: '+v);return;}const absolute=path.resolve(assetRoot,v);if(!absolute.startsWith(path.resolve(assetRoot)+path.sep))reasons.add('Recurso fuera del clan');else images.set(v,absolute);return;}
   if(v.startsWith('@')||key==='status'&&index.has(v)){
    const id=v.replace(/^@/,''),section=referenceSection(key,owner.section,preferred),matches=resolveLocal(index,id,section);
    if(!matches.length){reasons.add('Referencia local no resuelta: '+key+' '+id);return;}
    if(matches.length>1){reasons.add('Referencia ambigua: '+key+' '+id);return;}
    for(const match of matches)pending.push(match);
   }
  }
  while(pending.length){const e=pending.pop();if(used.has(e))continue;used.add(e);if(['asset_bundles','character_trigger_types'].includes(e.section)){reasons.add('Requiere bundle o evento propio: '+e.data.id);continue;}
   for(const c of code){if(c.review?.classification==='required_visual_fix'&&c.review.ids.includes(e.data.id)){reasons.add('Corrección visual propia necesaria: '+c.file+' -> '+e.data.id);continue;}if(!mentions(c.text,String(e.data.id)))continue;if(c.review?.classification==='presentation'||c.review?.classification==='consumer'&&c.review.sections.includes(e.section))continue;reasons.add('Dependencia funcional o no resuelta en C#: '+c.file+' -> '+e.section+'/'+e.data.id);}
   if((settings.functionalAssignments[source.id]??[]).includes(e.data.id))reasons.add('Registro de estado propio en Plugin.cs: '+e.section+'/'+e.data.id);
   reference(e.data,'',e);
  }
  for(const [key,file]of images){try{const stat=await fs.stat(file);if(!stat.isFile())throw Error();}catch{reasons.add('Imagen ausente: '+key);}}
  if(reasons.size){report.excluded.push({id:candidate.data.id,name:candidate.data.names?.english??candidate.data.id,reasons:[...reasons].sort()});continue;}
  const id=source.id+'-'+candidate.data.id.replace(/[^A-Za-z0-9_-]/g,'_'), section=candidate.section;
  const document={};for(const e of used){const d=structuredClone(e.data);delete d.chatter;delete d.lore_tooltips;delete d.lore_style;if(e.section==='cards'||e.section==='relics'){delete d.class;delete d.pools;}
   (document[e.section]??=[]).push(d);
  }
  const assets={};for(const [image,file]of images){const b=await fs.readFile(file);const target='assets/'+hash(b)+'.png';assets[image]=target;if(!(await fs.stat(path.join(out,target)).catch(()=>null)))await write(path.join(out,target),b);}
  // Keep original paths in definitions and a complete immutable mapping to bundled files.
  const rootData=candidate.data;const spawn=(document.effects??[]).find(e=>e.name==='CardEffectSpawnMonster');const char=spawn?(document.characters??[]).find(c=>c.id===String(spawn.param_character).replace(/^@/,'')):null;
  const findImage=ref=>{const art=(document.game_objects??[]).find(a=>a.id===String(ref).replace(/^@/,''));const s=art?.extensions?.[art.type]?.sprite;const sprite=(document.sprites??[]).find(x=>x.id===String(typeof s==='object'?s.id:s).replace(/^@/,''));return assets[sprite?.path]??null;};
  let picture=findImage(rootData.card_art);if(section==='relics'){const icon=rootData.icon??rootData.icon_sprite??rootData.sprite;picture=assets[(document.sprites??[]).find(x=>x.id===String(icon).replace(/^@/,''))?.path]??findImage(icon);}
  if(!picture){report.excluded.push({id:rootData.id,name:rootData.names?.english??rootData.id,reasons:['No se resuelve imagen principal para una ficha completa.']});continue;}
  const collectible=(rootData.extensions??[]).find(e=>e.collectable)?.collectable??{};
  const item={id,source:source.name,sourceId:source.id,version:manifest.version_number,commit,root:{section,id:rootData.id},kind:section==='relics'?'artifact':rootData.card_type==='monster'?'unit':rootData.card_type,names:rootData.names??char?.names??{english:rootData.id},descriptions:rootData.descriptions??{},cost:rootData.cost??0,costType:rootData.cost_type??'normal',rarity:rootData.rarity??collectible.rarity??'common',health:char?.health??null,attack:char?.attack_damage??null,size:char?.size??1,picture,characterPicture:char?findImage(char.character_art):null,providers:[...providers],externalResources:[...externalResources.values()],assets,document,files:Object.fromEntries([...used].map(e=>[path.relative(root,e.file).replaceAll('\\','/'),originals[e.file]]))};
  await write(path.join(out,'examples',id+'.json'),JSON.stringify(item,null,2)+'\n');
  const {document:_,files:__,assets:___,...summary}=item;summary.sha256=hash(JSON.stringify(item,null,2)+'\n');catalog.push(summary);report.accepted.push(id);
 }
 for(const proof of codeProof)if(hash(await fs.readFile(path.join(root,proof.file)))!==proof.sha256)throw Error('Código cambió durante la auditoría: '+proof.file);
 for(const [file,h]of Object.entries(originals))if(hash(await fs.readFile(file))!==h)throw Error('Fuente cambió durante la auditoría: '+file);
 for(const filename of ['LICENSE','NOTICE.md']){const b=await fs.readFile(path.join(root,filename)).catch(()=>null);if(b)await write(path.join(out,'credits',source.id+'-'+filename),b);}
 reports.push(report);console.log(source.id,'aprobados',report.accepted.length,'excluidos',report.excluded.length);
}
for(const name of await fs.readdir(path.join(out,'examples'))){if(/^(freecompany|succclan|ww)-[A-Za-z0-9_-]+\.json$/.test(name)&&!catalog.some(c=>name===c.id+'.json')){await fs.unlink(path.join(out,'examples',name));await fs.appendFile(log,`${stamp}||codex-clan-editor||clan-creator/catalog/examples/${name}||Retirar snapshot generado que no pertenece al catálogo aprobado\n`);}}
await write(path.join(out,'index.json'),JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),items:catalog},null,2)+'\n');
await write(path.join(out,'audit.json'),JSON.stringify({generatedAt:new Date().toISOString(),method:'Typed transitive reference closure + verified game/Trainworks/Conductor DLL types and Conductor JSON resources + hash-bound code review + functional patch exclusion + complete bundled art',libraries:libraryProof,dependencyVersions:bundle.packages.map(p=>({id:p.id,version:p.version})),gameAssemblySha256:hash(await fs.readFile(gameDll)),sources:reports},null,2)+'\n');
await write(path.join(out,'credits','WW-PROVENANCE.md'),Buffer.from('<!-- Documento generado el '+stamp+' -->\n\n# W&W Inc.\n\nContenido y arte de David, incorporado por instrucción expresa del autor en este proyecto el 15-11-2026. No se redistribuyen DLL ni recursos del juego. Procedencia, versión y hashes en audit.json y examples/.\n'));
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
