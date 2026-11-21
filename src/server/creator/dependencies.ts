import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {dataRoot} from '../paths.js';
import {creatorRules} from './catalog.js';
import {compilerReferences} from './compiler-references.js';
const run=promisify(execFile);
const filename=path.join(dataRoot,'creator-runtime.json');
interface Runtime {folders:string[];references:Record<string,string>}
async function readRuntime():Promise<Runtime>{return fs.readFile(filename,'utf8').then(JSON.parse).catch(()=>({folders:[],references:{}}));}
const unityLibraries=['UnityEngine.dll','UnityEngine.CoreModule.dll'];
async function unityReferences(folder:string){
 for(const candidate of [path.join(folder,'MonsterTrain2_Data','Managed'),folder]){
  const files=unityLibraries.map(name=>path.join(candidate,name));
  if((await Promise.all(files.map(file=>fs.stat(file).catch(()=>null)))).every(stat=>stat?.isFile())){
   return Object.fromEntries(files.map(file=>[path.basename(file,'.dll'),file]));
  }
 }
}
export async function steamLibraryFolders(gameDirectories:string[]){
 const directories=new Set<string>();
 for(const directory of gameDirectories){
  const match=directory.match(/^(.*[\\/]steamapps)[\\/]common[\\/](.*)$/i);
  if(!match)continue;
  const [,steamapps,remainder]=match;
  const source=await fs.readFile(path.join(steamapps,'libraryfolders.vdf'),'utf8').catch(()=>undefined);
  for(const entry of source?.matchAll(/^\s*"(?:path|\d+)"\s*"((?:\\.|[^"\\])*)"/gm)??[]){
   const library=entry[1].replace(/\\(["\\])/g,'$1');
   if(path.isAbsolute(library))directories.add(path.join(library,'steamapps','common',remainder));
  }
 }
 return [...directories];
}
let pending:Promise<void>=Promise.resolve();
export function detectRuntime(folder?:string,download=false){const next=pending.then(()=>scanRuntime(folder,download));pending=next.then(()=>{},()=>{});return next;}
async function scanRuntime(folder:string|undefined,download:boolean){const existing=await readRuntime();const rules=await creatorRules();const app=process.env.APPDATA??path.join(os.homedir(),'.config');const home=os.homedir();
 const defaults=rules.runtime.searchDirectories.map((dir:string)=>dir.replaceAll('{APPDATA}',app).replaceAll('{HOME}',home));
 const manual=folder===undefined?undefined:await unityReferences(folder);
 if(folder!==undefined&&!manual)throw Error('No se encuentran los archivos de Monster Train 2 en esa carpeta.');
 if(process.platform==='win32'){
  const registry=await run('reg.exe',['query','HKCU\\Software\\Valve\\Steam','/v','SteamPath'],{timeout:3000,windowsHide:true}).catch(()=>undefined);
  const installed=registry?.stdout.match(/SteamPath\s+REG_\w+\s+([^\r\n]+)/i)?.[1].trim();
  if(installed&&path.isAbsolute(installed))defaults.unshift(path.join(installed,'steamapps','common','Monster Train 2','MonsterTrain2_Data','Managed'));
 }
 const steam=await steamLibraryFolders(defaults);
 const wanted=new Set(unityLibraries);
 const references:Record<string,string>={};for(const [name,file]of Object.entries(existing.references))if(wanted.has(name+'.dll')&&(await fs.stat(file).catch(()=>null))?.isFile())references[name]=file;
 const folders=[...new Set([...defaults,...steam])];
 async function visit(dir:string,depth:number){if(depth>rules.runtime.maximumSearchDepth)return;for(const e of await fs.readdir(dir,{withFileTypes:true}).catch(()=>[])){if(e.isSymbolicLink()||['node_modules','.git','cache','Cache','obj','bin'].includes(e.name))continue;const file=path.join(dir,e.name);if(e.isDirectory())await visit(file,depth+1);else if(wanted.has(e.name))references[path.basename(e.name,'.dll')]=file;}}
 for(const dir of folders)await visit(dir,0);
 for(const remembered of existing.folders){
  const found=await unityReferences(remembered);
  if(found){Object.assign(references,found);break;}
  await visit(remembered,0);
 }
 Object.assign(references,manual);
 const missing=unityLibraries.map(name=>path.basename(name,'.dll')).filter(name=>!references[name]);
 let sdk='';try{sdk=(await run('dotnet',['--version'],{timeout:10000,windowsHide:true})).stdout.trim();}catch{}
 const sdkReady=Boolean(sdk)&&Number(sdk.split('.')[0])>=rules.runtime.minimumSdkMajor;
 const sources=await compilerReferences({download:download&&sdkReady&&!missing.length});
 Object.assign(references,sources.references);
 const versions=sources.versions;
 const atLeast=(a:string,b:string)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if(x[i]>y[i])return true;if(x[i]<y[i])return false;}return true;};const outdated=Object.entries(rules.dependencies).filter(([key,v])=>versions[key]&&!atLeast(versions[key],v as string)).map(([key,v])=>`${key}: ${versions[key]} → ${v}`);
 await fs.mkdir(dataRoot,{recursive:true});const current={folders:folder?[...new Set([folder,...existing.folders])]:existing.folders,references};const temp=filename+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(current,null,2),{flag:'wx'});await fs.rename(temp,filename);}finally{await fs.rm(temp,{force:true});}
 if(sdk&&Number(sdk.split('.')[0])<rules.runtime.minimumSdkMajor)outdated.push('SDK .NET: '+sdk+' → '+rules.runtime.minimumSdkMajor);for(const key of Object.keys(rules.dependencies))if(!versions[key]&&!missing.some(n=>n.startsWith(key==='trainworks'?'Trainworks':'Conductor')))outdated.push('No se pudo comprobar la versión de '+key);
 const ready=!missing.length&&sdkReady&&!outdated.length;
 if(download&&ready&&!sources.missing.length){
  const runtime=path.join(dataRoot,'build-local.json');
  const temp=runtime+'.'+randomUUID()+'.tmp';
  try{await fs.writeFile(temp,JSON.stringify({trainworksVersion:versions.trainworks,references},null,2),{flag:'wx'});await fs.rename(temp,runtime);}
  finally{await fs.rm(temp,{force:true});}
 }
 return {gameRequired:missing,referencesPending:sources.missing,ready,sdk,missing,outdated,versions,required:rules.dependencies};
}
// 2026-11-15-0856||codex-clan-editor||clan-creator/src/server/creator/dependencies.ts||Detección automática del juego, perfil, SDK y librerías sin pedir rutas a DLL ni editar archivos técnicos
// 2026-11-15-0916||codex-clan-editor||clan-creator/src\server\creator\dependencies.ts||Serializar detección y usar temporales únicos, rutas configurables y versiones verificadas
// 2026-11-15-1418||codex-clan-editor||clan-creator/src\server\creator\dependencies.ts||Compilar con Trainworks, Conductor y BepInEx de referencia incluidos; buscar en el equipo solo archivos Unity del juego
// 2026-11-15-1434||codex-clan-editor||clan-creator/src\server\creator\dependencies.ts||Corregir símbolos y acentos alterados por lectura con codificación Windows
// 2026-11-20-0901||codex-clan-editor||clan-creator/src/server/creator/dependencies.ts||Detectar bibliotecas adicionales de Steam y recordar una carpeta válida indicada por el usuario
// 2026-11-20-0902||codex-clan-editor||clan-creator/src/server/creator/dependencies.ts||Conservar compatibilidad con carpetas superiores ya guardadas por versiones anteriores
// 2026-11-21-0948||codex-clan-editor||clan-creator/src/server/creator/dependencies.ts||Comprobar SDK y juego sin red y descargar referencias al iniciar la compilacion
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/server/creator/dependencies.ts||Detectar la instalación de Steam del usuario en Windows en vez de una ruta fija
