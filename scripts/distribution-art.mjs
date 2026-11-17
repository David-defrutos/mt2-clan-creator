import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function dlcCharacterImagePaths(index,art){
 const dlcEntries=index.items.filter(e=>e.requiredDlc),images=new Set(dlcEntries.map(e=>e.characterPicture).filter(Boolean));
 for(const entry of dlcEntries){const characterSprites=new Set((entry.document?.game_objects??[]).filter(o=>o.extensions?.character_art).map(o=>o.extensions.character_art.sprite).filter(s=>typeof s==='string').map(s=>s.replace(/^@/,'')));for(const sprite of entry.document?.sprites??[])if(characterSprites.has(sprite.id)){const asset=entry.assets?.[sprite.path];if(asset)images.add(asset);}}
 for(const collection of ['characters','characterArt','portraits'])for(const value of Object.values(art[collection]??{}))if(value.asset&&/characterprefabs-(?:railforged|punished)/i.test(value.bundle??''))images.add(value.asset);
 return images;
}
export async function sanitizeDistributionArt(root){const catalog=path.join(root,'catalog'),official=path.join(catalog,'official'),indexFile=path.join(official,'index.json'),artFile=path.join(official,'art-manifest.json'),index=JSON.parse(await fs.readFile(indexFile,'utf8')),art=JSON.parse(await fs.readFile(artFile,'utf8')),excluded=dlcCharacterImagePaths(index,art);for(const entry of index.items){const example=JSON.parse(await fs.readFile(path.join(official,'examples',entry.id+'.json'),'utf8'));if(entry.requiredDlc)for(const asset of dlcCharacterImagePaths({items:[{...example,requiredDlc:entry.requiredDlc}]},{}))excluded.add(asset);}let changed=0,removed=0;
 for(const entry of index.items){const file=path.join(official,'examples',entry.id+'.json');const example=JSON.parse(await fs.readFile(file,'utf8'));let dirty=false;for(const object of [entry,example]){for(const key of ['picture','characterPicture'])if(excluded.has(object[key])){object[key]='';dirty=true;}for(const [key,value]of Object.entries(object.assets??{}))if(excluded.has(value)){delete object.assets[key];dirty=true;}}
  if(dirty){const bytes=Buffer.from(JSON.stringify(example,null,2));await fs.writeFile(file,bytes);entry.sha256=createHash('sha256').update(bytes).digest('hex');changed++;}}
 for(const collection of ['frames','portraits','characters','characterArt'])for(const [key,value]of Object.entries(art[collection]??{}))if(excluded.has(value.asset))delete art[collection][key];
 for(const asset of excluded){if(!/^official\/assets\/[a-f0-9]{64}\.png$/.test(asset))throw Error('Invalid DLC character artwork path.');const file=path.join(catalog,asset);try{await fs.unlink(file);removed++;}catch(e){if(e.code!=='ENOENT')throw e;}}
 await fs.writeFile(indexFile,JSON.stringify(index,null,2));await fs.writeFile(artFile,JSON.stringify(art,null,2));return {excluded:[...excluded],removed,examplesWithoutDlcCharacters:changed};}
// 2026-11-17-0025||codex-clan-editor||clan-creator/scripts/distribution-art.mjs||Excluir imágenes y marcos DLC únicamente de copias de distribución conservando datos efectos y originales locales
// 2026-11-17-1918||codex-clan-editor||clan-creator/scripts\distribution-art.mjs||Conservar ilustraciones y marcos DLC públicos excluyendo solamente imágenes de personajes de combate
