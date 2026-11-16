import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {dataRoot} from '../paths.js';
import {creatorRules} from './catalog.js';
import {bundledReferences} from './bundled.js';
const run=promisify(execFile);
const filename=path.join(dataRoot,'creator-runtime.json');
interface Runtime {folders:string[];references:Record<string,string>}
async function readRuntime():Promise<Runtime>{return fs.readFile(filename,'utf8').then(JSON.parse).catch(()=>({folders:[],references:{}}));}
let pending:Promise<void>=Promise.resolve();
export function detectRuntime(folder?:string){const next=pending.then(()=>scanRuntime(folder));pending=next.then(()=>{},()=>{});return next;}
async function scanRuntime(folder?:string){const existing=await readRuntime();const rules=await creatorRules();const app=process.env.APPDATA??path.join(os.homedir(),'.config');const home=os.homedir();
 const defaults=rules.runtime.searchDirectories.map((dir:string)=>dir.replaceAll('{APPDATA}',app).replaceAll('{HOME}',home));
 const wanted=new Set(['UnityEngine.dll','UnityEngine.CoreModule.dll']);
 const included=await bundledReferences();
 const references:Record<string,string>={};for(const [name,file]of Object.entries(existing.references))if(wanted.has(name+'.dll')&&(await fs.stat(file).catch(()=>null))?.isFile())references[name]=file;
 const folders=[...new Set([...(folder?[path.resolve(folder)]:[]),...existing.folders,...defaults])];
 async function visit(dir:string,depth:number){if(depth>rules.runtime.maximumSearchDepth)return;for(const e of await fs.readdir(dir,{withFileTypes:true}).catch(()=>[])){if(e.isSymbolicLink()||['node_modules','.git','cache','Cache','obj','bin'].includes(e.name))continue;const file=path.join(dir,e.name);if(e.isDirectory())await visit(file,depth+1);else if(wanted.has(e.name))references[path.basename(e.name,'.dll')]=file;}}
 for(const dir of folders)await visit(dir,0);
 Object.assign(references,included.references);
 const required=['BepInEx','TrainworksReloaded.Base','TrainworksReloaded.Core','TrainworksReloaded.Plugin','Conductor','UnityEngine','UnityEngine.CoreModule','Microsoft.Extensions.Configuration.Abstractions'];const missing=required.filter(n=>!references[n]);let sdk='';try{sdk=(await run('dotnet',['--version'],{timeout:10000,windowsHide:true})).stdout.trim();}catch{}
 const versions:Record<string,string>=Object.fromEntries(included.bundle.packages.map(p=>[p.id,p.version]));
 const atLeast=(a:string,b:string)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if(x[i]>y[i])return true;if(x[i]<y[i])return false;}return true;};const outdated=Object.entries(rules.dependencies).filter(([key,v])=>versions[key]&&!atLeast(versions[key],v as string)).map(([key,v])=>`${key}: ${versions[key]} → ${v}`);
 await fs.mkdir(dataRoot,{recursive:true});const current={folders:folder?[...new Set([...existing.folders,path.resolve(folder)])]:existing.folders,references};const temp=filename+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(current,null,2),{flag:'wx'});await fs.rename(temp,filename);}finally{await fs.rm(temp,{force:true});}
 if(sdk&&Number(sdk.split('.')[0])<rules.runtime.minimumSdkMajor)outdated.push('SDK .NET: '+sdk+' → '+rules.runtime.minimumSdkMajor);for(const key of Object.keys(rules.dependencies))if(!versions[key]&&!missing.some(n=>n.startsWith(key==='trainworks'?'Trainworks':'Conductor')))outdated.push('No se pudo comprobar la versión de '+key);
 if(!missing.length){const runtime=path.join(dataRoot,'build-local.json');await fs.writeFile(runtime,JSON.stringify({trainworksVersion:versions.trainworks??rules.dependencies.trainworks,references},null,2));}
 return {bundled:true,bundledVersions:versions,gameRequired:missing.filter(n=>n.startsWith('UnityEngine')),ready:!missing.length&&Boolean(sdk)&&!outdated.length,sdk,missing,outdated,versions,required:rules.dependencies};
}
// 2026-11-15-0856||codex-clan-editor||clan-creator/src/server/creator/dependencies.ts||Detección automática del juego, perfil, SDK y librerías sin pedir rutas a DLL ni editar archivos técnicos
// 2026-11-15-0916||codex-clan-editor||clan-creator/src\server\creator\dependencies.ts||Serializar detección y usar temporales únicos, rutas configurables y versiones verificadas
// 2026-11-15-1418||codex-clan-editor||clan-creator/src\server\creator\dependencies.ts||Compilar con Trainworks, Conductor y BepInEx de referencia incluidos; buscar en el equipo solo archivos Unity del juego
// 2026-11-15-1434||codex-clan-editor||clan-creator/src\server\creator\dependencies.ts||Corregir símbolos y acentos alterados por lectura con codificación Windows
