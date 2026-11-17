import {updateProjectState} from './project-state.js';
import {inside} from '../paths.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {draftImageAssets,type Draft} from './model.js';
import {creatorRules} from './catalog.js';
import {loadDraft,newDraft,saveDraft,projectFolder,validateDraftShape} from './projects.js';
const digest=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
function uploads(draft:Draft){return draftImageAssets(draft).filter(s=>s.startsWith('upload/'));}
const validUpload=(name:string)=>/^upload\/[a-f0-9-]{36}\.png$/.test(name);
export async function exportDraftBackup(id:string){
 const rules=await creatorRules(),settings=rules.backups,draft=await loadDraft(id);await validateDraftShape(draft);
 const assets=[] as {name:string;base64:string;sha256:string}[];let total=0;
 for(const name of uploads(draft)){
  if(!validUpload(name))throw Error('Invalid backup image path.');
  const file=path.join(projectFolder(id),name),stat=await fs.lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>settings.maxBytes||!inside(await fs.realpath(projectFolder(id)),await fs.realpath(file)))throw Error('Invalid backup image.');
  const bytes=await fs.readFile(file);total+=bytes.length;if(total>settings.maxBytes||assets.length>=settings.maxAssets)throw Error('The draft backup is too large.');
  assets.push({name,base64:bytes.toString('base64'),sha256:digest(bytes)});
 }
 if((await loadDraft(id)).revision!==draft.revision)throw Error('The draft changed. Save and try again.');
 const result={format:settings.format,version:settings.version,draft,assets,draftSha256:digest(JSON.stringify(draft))};
 if(Buffer.byteLength(JSON.stringify(result))>settings.maxBytes)throw Error('The draft backup is too large.');return result;
}
export async function validateDraftBackup(input:any){
 const rules=await creatorRules(),settings=rules.backups;
 if(!input||input.format!==settings.format||input.version!==settings.version||!input.draft||!Array.isArray(input.assets)||input.assets.length>settings.maxAssets||Buffer.byteLength(JSON.stringify(input))>settings.maxBytes)throw Error('This is not a supported draft backup.');
 if(digest(JSON.stringify(input.draft))!==input.draftSha256)throw Error('The draft backup is damaged.');
 const draft:Draft=structuredClone(input.draft);await validateDraftShape(draft);
 const expected=new Set(uploads(draft)),seen=new Set<string>(),files=[] as {name:string;bytes:Buffer}[];
 for(const asset of input.assets){
  if(!asset||typeof asset.name!=='string'||!validUpload(asset.name)||!expected.has(asset.name)||seen.has(asset.name)||typeof asset.base64!=='string'||asset.base64.length%4!==0)throw Error('Invalid image in draft backup.');
  const bytes=Buffer.from(asset.base64,'base64');if(bytes.length>settings.maxBytes||bytes.toString('base64')!==asset.base64||digest(bytes)!==asset.sha256)throw Error('Damaged image in draft backup.');
  const metadata=await sharp(bytes,{limitInputPixels:40000000}).metadata();if(metadata.format!=='png')throw Error('Backup images must be PNG files.');
  seen.add(asset.name);files.push({name:asset.name,bytes});
 }
 if(seen.size!==expected.size)throw Error('Some images are missing from the backup.');
 return {draft,files};
}
export async function importValidatedBackup({draft,files}:{draft:Draft;files:{name:string;bytes:Buffer}[]}){
 const fresh=await newDraft();try{
  const folder=projectFolder(fresh.id);for(const file of files){await fs.mkdir(path.join(folder,'upload'),{recursive:true});await fs.writeFile(path.join(folder,file.name),file.bytes,{flag:'wx'});}
  const restored=await saveDraft({...draft,id:fresh.id,revision:fresh.revision,updatedAt:fresh.updatedAt});await updateProjectState(restored.id,{restoredAt:new Date().toISOString()});return restored;
 }catch(error){await fs.rm(projectFolder(fresh.id),{recursive:true,force:true});throw error;}
}
export async function importDraftBackup(input:any){return importValidatedBackup(await validateDraftBackup(input));}

// 2026-11-16-2144||codex-clan-editor||clan-creator/src/server/creator/draft-backup.ts||Respaldar borrador e imágenes en archivo portátil con hashes y restauración independiente validada sin sobrescribir proyectos
// 2026-11-16-2150||codex-clan-editor||clan-creator/src/server/creator/draft-backup.ts||Impedir lectura de imágenes de respaldo mediante enlaces o archivos fuera del proyecto y limitar tamaño antes de leer
// 2026-11-16-2202||codex-clan-editor||clan-creator/src/server/creator/draft-backup.ts||Validar base64 sin expresión recursiva y admitir PNG normalizados grandes dentro del límite total de respaldo
// 2026-11-16-2322||codex-clan-editor||clan-creator/src/server/creator/draft-backup.ts||Registrar que el borrador es una copia restaurada sin cambiar su nombre ni copiar rutas de instalación
// 2026-11-17-1847||codex-clan-editor||clan-creator/src\server\creator\draft-backup.ts||Separar validación y restauración para comprobar todos los clanes antes de importar un lote
// 2026-11-17-1950||codex-clan-editor||clan-creator/src\server\creator\draft-backup.ts||Incluir estilo recursos y láminas originales referenciadas en copias portátiles
