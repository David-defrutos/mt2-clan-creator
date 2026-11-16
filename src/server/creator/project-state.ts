import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {projectFolder,loadDraft} from './projects.js';
import {playableContent,stableText} from './workflow-state.js';
import type {Draft} from './model.js';
export const gameContentHash=(d:Draft)=>createHash('sha256').update(stableText(playableContent(d))).digest('hex');
const queues=new Map<string,Promise<any>>();
export async function readProjectState(id:string){const file=path.join(projectFolder(id),'local-state.json');try{const stat=await fs.lstat(file);if(stat.isSymbolicLink()||!stat.isFile())throw Error('Invalid local state file.');return JSON.parse(await fs.readFile(file,'utf8'));}catch(e:any){if(e.code==='ENOENT')return {};throw e;}}
export async function updateProjectState(id:string,patch:any){const previous=queues.get(id)??Promise.resolve();const operation=previous.catch(()=>{}).then(async()=>{await loadDraft(id);const file=path.join(projectFolder(id),'local-state.json'),current=await readProjectState(id),temporary=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temporary,JSON.stringify({...current,...patch},null,2),{flag:'wx'});await fs.rename(temporary,file);}finally{await fs.rm(temporary,{force:true});}});queues.set(id,operation);try{await operation;}finally{if(queues.get(id)===operation)queues.delete(id);}}
export async function installationState(draft:Draft){const state=await readProjectState(draft.id),last=state.lastInstall;return {folder:state.folder??'',restoredAt:state.restoredAt,lastInstall:last?{at:last.at,target:last.target}:undefined,status:state.uninstalledAt?'removed':!last?'never':last.contentHash===gameContentHash(draft)?'current':'pending'};}
export async function rememberDestination(id:string,folder:unknown){if(typeof folder!=='string'||folder.length>2048||folder.includes('\0')||(folder&&!path.isAbsolute(folder)))throw Error('Indica la carpeta de mods de tu perfil.');await updateProjectState(id,{folder});}
export async function recordInstallation(draft:Draft,hash:string,result:any,folder:string){await updateProjectState(draft.id,{folder,lastInstall:{contentHash:hash,at:new Date().toISOString(),target:result.target},uninstalledAt:null});}
// 2026-11-16-2322||codex-clan-editor||clan-creator/src/server/creator/project-state.ts||Guardar destino y última instalación en metadatos locales separados del borrador portátil y detectar cambios jugables
