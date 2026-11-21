import {installationChanges} from './play-changes.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {inside,dataRoot} from '../paths.js';
import {projectFolder,loadDraft,deletedProjectDirectory} from './projects.js';
import {playableContent,stableText} from './workflow-state.js';
import type {Draft} from './model.js';
export const gameContentHash=(d:Draft)=>createHash('sha256').update(stableText(playableContent(d))).digest('hex');
const queues=new Map<string,Promise<any>>();
export async function readProjectState(id:string){return readStateFile(path.join(projectFolder(id),'local-state.json'));}
async function readStateFile(file:string){try{const stat=await fs.lstat(file);if(stat.isSymbolicLink()||!stat.isFile())throw Error('Invalid local state file.');return JSON.parse(await fs.readFile(file,'utf8'));}catch(e:any){if(e.code==='ENOENT')return {};throw e;}}
export async function updateProjectState(id:string,patch:any,allowDeleted=false){const previous=queues.get(id)??Promise.resolve();const operation=previous.catch(()=>{}).then(async()=>{let folder=projectFolder(id);try{await loadDraft(id);}catch(error:any){
 if(!allowDeleted||error.code!=='ENOENT')throw error;
 folder=path.join(deletedProjectDirectory,id);
 const stat=await fs.lstat(folder);
 const trash=await fs.realpath(deletedProjectDirectory);
 if(!stat.isDirectory()||stat.isSymbolicLink()||!inside(await fs.realpath(dataRoot),trash)||!inside(trash,await fs.realpath(folder)))throw Error('Invalid deleted draft.');
 const draft=JSON.parse(await fs.readFile(path.join(folder,'draft.json'),'utf8'));
 if(draft.id!==id)throw Error('Invalid deleted draft.');
 }
 const file=path.join(folder,'local-state.json'),current=await readStateFile(file),temporary=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temporary,JSON.stringify({...current,...(typeof patch==='function'?patch(current):patch)},null,2),{flag:'wx'});await fs.rename(temporary,file);}finally{await fs.rm(temporary,{force:true});}});queues.set(id,operation);try{await operation;}finally{if(queues.get(id)===operation)queues.delete(id);}}
export async function installationState(draft:Draft){const state=await readProjectState(draft.id),last=state.lastInstall;return {contentHash:gameContentHash(draft),playtest:state.playtest,cardNotes:state.cardNotes,collections:state.collections,view:state.view,folder:state.folder??'',restoredAt:state.restoredAt,lastInstall:last?{at:last.at,target:last.target,changes:last.snapshot&&last.contentHash!==gameContentHash(draft)?installationChanges(last.snapshot,playableContent(draft)):undefined}:undefined,status:state.uninstalledAt?'removed':!last?'never':last.contentHash===gameContentHash(draft)?'current':'pending'};}
export async function recordUninstallation(id:string,target:string){
 const samePath=(a:string,b:string)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
 await updateProjectState(id,(state:any)=>{
  if(state.lastInstall?.target&&!samePath(state.lastInstall.target,target))return {};
  return {uninstalledAt:new Date().toISOString()};
 },true);
}
export async function rememberDestination(id:string,folder:unknown){if(typeof folder!=='string'||folder.length>2048||folder.includes('\0')||(folder&&!path.isAbsolute(folder)))throw Error('Indica la carpeta de mods de tu perfil.');await updateProjectState(id,{folder});}
export async function recordInstallation(draft:Draft,hash:string,result:any,folder:string){await updateProjectState(draft.id,{folder,lastInstall:{snapshot:playableContent(draft),contentHash:hash,at:new Date().toISOString(),target:result.target},uninstalledAt:null});}
// 2026-11-16-2322||codex-clan-editor||clan-creator/src/server/creator/project-state.ts||Guardar destino y última instalación en metadatos locales separados del borrador portátil y detectar cambios jugables
// 2026-11-17-0021||codex-clan-editor||clan-creator/src\server\creator\project-state.ts||Devolver contexto local para retomar última carta y nivel
// 2026-11-17-1848||codex-clan-editor||clan-creator/src\server\creator\project-state.ts||Exponer preferencias locales de colección junto al contexto de edición
// 2026-11-17-2236||codex-clan-editor||clan-creator/src\server\creator\project-state.ts||Entregar estado de comprobación en partida junto a versión del contenido actual
// 2026-11-19-0759||codex-clan-editor||clan-creator/src/server/creator/project-state.ts||Guardar referencia jugable al instalar y comparar con el borrador
// 2026-11-19-0913||codex-clan-editor||clan-creator/src/server/creator/project-state.ts||Guardar notas por carta mediante la cola de escritura local
// 2026-11-19-2223||codex-clan-editor||clan-creator/src/server/creator/project-state.ts||Registrar la desinstalación del destino exacto tanto para borradores activos como eliminados
