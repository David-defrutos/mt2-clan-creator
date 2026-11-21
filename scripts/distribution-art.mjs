import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function officialCharacterImagePaths(index,art){
 const images=new Set(index.items.map(entry=>entry.characterPicture).filter(Boolean));
 for(const entry of index.items){
  const ids=new Set();
  for(const object of entry.document?.game_objects??[]){
   const character=object.extensions?.character_art;
   if(!character)continue;
   for(const sprite of [character.sprite,...(character.animations??[]).flatMap(animation=>animation.frames??[])]){
    if(typeof sprite==='string')ids.add(sprite.replace(/^@/,''));
   }
  }
  for(const sprite of entry.document?.sprites??[]){
   const file=entry.assets?.[sprite.path];
   if(ids.has(sprite.id)&&file)images.add(file);
  }
 }
 for(const collection of ['characters','characterArt']){
  for(const value of Object.values(art[collection]??{}))if(value.asset)images.add(value.asset);
 }
 for(const value of Object.values(art.portraits??{})){
  if(value.asset&&/^characterprefabs(?:-|_)/i.test(value.bundle??''))images.add(value.asset);
 }
 return images;
}
export async function sanitizeDistributionArt(root){const catalog=path.join(root,'catalog'),official=path.join(catalog,'official'),indexFile=path.join(official,'index.json'),artFile=path.join(official,'art-manifest.json'),index=JSON.parse(await fs.readFile(indexFile,'utf8')),art=JSON.parse(await fs.readFile(artFile,'utf8')),excluded=officialCharacterImagePaths(index,art);for(const entry of index.items){const example=JSON.parse(await fs.readFile(path.join(official,'examples',entry.id+'.json'),'utf8'));for(const asset of officialCharacterImagePaths({items:[example]},{}))excluded.add(asset);}let changed=0,removed=0;
 for(const entry of index.items){const file=path.join(official,'examples',entry.id+'.json');const example=JSON.parse(await fs.readFile(file,'utf8'));let dirty=false;for(const object of [entry,example]){for(const key of ['picture','characterPicture'])if(excluded.has(object[key])){object[key]='';dirty=true;}for(const [key,value]of Object.entries(object.assets??{}))if(excluded.has(value)){delete object.assets[key];dirty=true;}}
  if(dirty){const bytes=Buffer.from(JSON.stringify(example,null,2));await fs.writeFile(file,bytes);entry.sha256=createHash('sha256').update(bytes).digest('hex');changed++;}}
 for(const collection of ['frames','portraits','characters','characterArt'])for(const [key,value]of Object.entries(art[collection]??{}))if(excluded.has(value.asset))delete art[collection][key];
 for(const asset of excluded){if(!/^official\/assets\/[a-f0-9]{64}\.png$/.test(asset))throw Error('Invalid official character artwork path.');const file=path.join(catalog,asset);try{await fs.unlink(file);removed++;}catch(e){if(e.code!=='ENOENT')throw e;}}
 // Extraction diagnostics and machine paths are useful only in the local catalog.
 delete art.gameData;
 delete art.errors;
 const auditFile=path.join(official,'audit.json');
 const audit=await fs.readFile(auditFile,'utf8').then(JSON.parse).catch(error=>{
  if(error.code!=='ENOENT')throw error;
 });
 if(audit){delete audit.source;await fs.writeFile(auditFile,JSON.stringify(audit,null,2));}
 await fs.writeFile(indexFile,JSON.stringify(index,null,2));await fs.writeFile(artFile,JSON.stringify(art,null,2));return {excluded:[...excluded],removed,examplesWithoutOfficialCharacters:changed};}
// 2026-11-17-0025||codex-clan-editor||clan-creator/scripts/distribution-art.mjs||Excluir imágenes y marcos DLC únicamente de copias de distribución conservando datos efectos y originales locales
// 2026-11-17-1918||codex-clan-editor||clan-creator/scripts\distribution-art.mjs||Conservar ilustraciones y marcos DLC públicos excluyendo solamente imágenes de personajes de combate
// 2026-11-21-1114||codex-clan-editor||clan-creator/scripts/distribution-art.mjs||Excluir rutas y diagnósticos de extracción del catálogo distribuido
// 2026-11-21-1218||codex-clan-editor||clan-creator/scripts/distribution-art.mjs||Excluir únicamente el arte de combate oficial, tanto del juego base como de los DLC
