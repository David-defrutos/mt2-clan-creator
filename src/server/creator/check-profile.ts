import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inside} from '../paths.js';
import {creatorRules} from './catalog.js';
export type PrerequisiteStatus='ready'|'missing'|'outdated'|'unknown'|'duplicate';
export async function checkProfile(folder:string){
 if(typeof folder!=='string'||!path.isAbsolute(folder))throw Error('Selecciona la carpeta del perfil de Monster Train 2.');
 let selected=path.resolve(folder);if(path.basename(selected).toLowerCase()==='plugins')selected=path.dirname(selected);if(path.basename(selected).toLowerCase()==='bepinex')selected=path.dirname(selected);
 const profile=await fs.realpath(selected);if(!(await fs.stat(profile)).isDirectory())throw Error('Selecciona una carpeta de perfil.');
 const plugins=path.join(profile,'BepInEx','plugins'),core=path.join(profile,'BepInEx','core','BepInEx.dll');
 const safeFile=async(file:string)=>{const stat=await fs.lstat(file).catch((e:any)=>{if(e.code==='ENOENT')return null;throw e;});if(!stat)return false;if(stat.isSymbolicLink()||!inside(profile,await fs.realpath(file)))throw Error('El perfil contiene un enlace fuera de su carpeta.');return stat.isFile();};
 const found:Record<string,string[]>={trainworks:[],conductor:[]};
 async function visit(dir:string,depth=0){if(depth>8)throw Error('El perfil tiene demasiados niveles de carpetas.');const stat=await fs.lstat(dir).catch((e:any)=>{if(e.code==='ENOENT')return null;throw e;});if(!stat)return;if(stat.isSymbolicLink()||!inside(profile,await fs.realpath(dir)))throw Error('Selecciona un perfil sin enlaces externos.');if(!stat.isDirectory())return;for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('Revisa los enlaces del perfil antes de comprobarlo.');if(entry.isDirectory()){if(!entry.name.startsWith('.clan-creator-'))await visit(file,depth+1);}else if(entry.isFile()){const name=entry.name.toLowerCase(),id=name==='trainworksreloaded.plugin.dll'?'trainworks':name==='conductor.dll'?'conductor':undefined;if(id)found[id].push(file);}}}
 await visit(plugins);const rules=await creatorRules();
 const packages:{id:string;name:string;version:string|null;required:string|null;status:PrerequisiteStatus}[]=[{id:'bepinex',name:'BepInExPack',version:null,required:null,status:await safeFile(core)?'ready':'missing'}];
 for(const [id,name]of [['trainworks','Trainworks Reloaded'],['conductor','Conductor']]){const required=rules.dependencies[id];let version:string|null=null,status:PrerequisiteStatus=found[id].length===0?'missing':found[id].length>1?'duplicate':'unknown';if(found[id].length===1){let dir=path.dirname(found[id][0]);while(inside(plugins,dir)||dir===plugins){const manifest=path.join(dir,'manifest.json');if(await safeFile(manifest)){try{const data=JSON.parse((await fs.readFile(manifest,'utf8')).replace(/^\uFEFF/,''));if(/^\d+\.\d+\.\d+$/.test(data.version_number))version=data.version_number;}catch{}break;}if(dir===plugins)break;dir=path.dirname(dir);}if(version)status=version.localeCompare(required,undefined,{numeric:true})>=0?'ready':'outdated';}packages.push({id,name,version,required,status});}
 const files=[...(await safeFile(core)?[core]:[]),...Object.values(found).flat()];const fingerprints=await Promise.all(files.sort().map(async f=>[f,createHash('sha256').update(await fs.readFile(f)).digest('hex')]));return {profile,plugins,packages,ready:packages.every(p=>p.status==='ready'),fingerprint:createHash('sha256').update(JSON.stringify({profile,packages,fingerprints})).digest('hex')};
}
// 2026-11-15-2002||codex-clan-editor||clan-creator/src/server/creator/check-profile.ts||Comprobar requisitos del perfil sin instalar, escribir ni depender del bundle de compilacion
// 2026-11-15-2003||codex-clan-editor||clan-creator/src/server/creator/check-profile.ts||Validar versiones minimas configuradas y huella de DLL sin modificar el perfil
