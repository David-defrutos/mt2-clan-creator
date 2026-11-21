import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {configRoot,dataRoot} from '../paths.js';
import {releaseAssemblies} from './release-archive.js';

interface ReferencePackage {
 id:string;
 name:string;
 version:string;
 url:string;
 assemblies:Record<string,string>;
 entries?:Record<string,string>;
}
const sha256=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const maxArchiveBytes=64*1024*1024;
const defaultCache=path.join(dataRoot,'compiler-references');
const editablePackages=new Set(['trainworks','conductor']);
const metadataLifetime=60*60*1000;
interface ReleaseUpdate {id:string;version:string;url:string;digest:string}
interface ReleaseAsset {name:string;browser_download_url:string;digest?:string}
interface Release {tag_name:string;draft:boolean;assets:ReleaseAsset[]}

async function packages(){
 return (JSON.parse(await fs.readFile(path.join(configRoot,'compiler-references.json'),'utf8')) as {packages:ReferencePackage[]}).packages;
}

async function atomicWrite(file:string,data:string|Buffer){
 const temp=file+'.'+randomUUID()+'.tmp';
 try{
  await fs.writeFile(temp,data,{flag:'wx'});
  await fs.rename(temp,file);
 }finally{await fs.rm(temp,{force:true});}
}

const compareVersion=(left:string,right:string)=>{
 const a=left.split('.').map(Number),b=right.split('.').map(Number);
 return a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
};
const numericVersion=/^\d+\.\d+\.\d+$/;

async function assemblyIsValid(file:string,digest:string){
 const stat=await fs.lstat(file).catch(()=>null);
 return Boolean(stat?.isFile()&&stat.size<=8*1024*1024&&sha256(await fs.readFile(file))===digest);
}

async function selectedPackage(pkg:ReferencePackage,cacheRoot:string){
 if(!editablePackages.has(pkg.id))return pkg;
 const receipt=path.join(cacheRoot,pkg.id,'selected.json');
 const selected=await fs.readFile(receipt,'utf8').then(s=>JSON.parse(s) as ReferencePackage).catch(()=>null);
 if(!selected||selected.id!==pkg.id||!numericVersion.test(selected.version)||compareVersion(selected.version,pkg.version)<=0||
  selected.url!==releaseUrl(pkg,selected.version)||!Object.keys(pkg.assemblies).every(name=>/^[a-f0-9]{64}$/.test(selected.assemblies?.[name]??'')))return pkg;
 return {...pkg,version:selected.version,url:selected.url,assemblies:Object.fromEntries(Object.keys(pkg.assemblies).map(name=>[name,selected.assemblies[name]]))};
}

function releaseUrl(pkg:ReferencePackage,version:string){
 return pkg.url.replaceAll(pkg.version,version);
}

export function newestCompilerRelease(pkg:ReferencePackage,releases:Release[]):ReleaseUpdate|undefined{
 const candidates:ReleaseUpdate[]=[];
 for(const release of releases){
  const version=release.tag_name;
  if(release.draft||!numericVersion.test(version)||compareVersion(version,pkg.version)<=0)continue;
  const url=releaseUrl(pkg,version);
  const asset=release.assets.find(a=>a.browser_download_url===url&&a.name===url.split('/').pop());
  if(asset?.digest&&/^sha256:[a-f0-9]{64}$/.test(asset.digest))candidates.push({id:pkg.id,version,url,digest:asset.digest.slice(7)});
 }
 return candidates.sort((a,b)=>compareVersion(b.version,a.version))[0];
}

let discovered: {expires:number;updates:Promise<ReleaseUpdate[]>}|undefined;
function availableUpdates(){
 if(!discovered||Date.now()>discovered.expires){
  const updates=packages().then(config=>Promise.all(config.filter(pkg=>editablePackages.has(pkg.id)).map(async pkg=>{
   const repository=new URL(pkg.url).pathname.split('/').slice(1,3).join('/');
   try{
    const response=await fetch('https://api.github.com/repos/'+repository+'/releases?per_page=10',{
     headers:{accept:'application/vnd.github+json'},signal:AbortSignal.timeout(8000),
    });
    if(!response.ok)return undefined;
    return newestCompilerRelease(pkg,await response.json() as Release[]);
   }catch{return undefined;}
  }))).then(results=>results.filter((update):update is ReleaseUpdate=>update!==undefined));
  discovered={expires:Date.now()+metadataLifetime,updates};
 }
 return discovered.updates;
}

export async function compilerUpdateStatus(){
 const [config,updates]=await Promise.all([packages(),availableUpdates()]);
 return Promise.all(config.filter(pkg=>editablePackages.has(pkg.id)).map(async pkg=>{
  const current=await selectedPackage(pkg,defaultCache);
  const update=updates.find(entry=>entry.id===pkg.id&&compareVersion(entry.version,current.version)>0);
  return {id:pkg.id,name:pkg.name,current:current.version,recommended:pkg.version,available:update?.version};
 }));
}

export async function selectCompilerRelease(id:string,version?:string,{cacheRoot=defaultCache,findUpdates=availableUpdates,fetchArchive=downloadArchive}={}){
 const pkg=(await packages()).find(p=>p.id===id&&editablePackages.has(id));
 if(!pkg)throw Error('Unknown compilation reference');
 const receipt=path.join(cacheRoot,id,'selected.json');
 if(version===undefined){await fs.rm(receipt,{force:true});return;}
 const update=(await findUpdates()).find(p=>p.id===id&&p.version===version);
 if(!update)throw Error('The selected release is no longer available');
 try{
  const dir=path.join(cacheRoot,id,version);
  const inventory=path.join(dir,'verified-release.json');
  const saved=await fs.readFile(inventory,'utf8').then(s=>JSON.parse(s)).catch(()=>null);
  const names=Object.keys(pkg.assemblies);
  let assemblies:Record<string,string>=saved?.assemblies??{};
  const reusable=saved?.digest===update.digest&&(await Promise.all(names.map(name=>assemblyIsValid(path.join(dir,name+'.dll'),assemblies[name])))).every(Boolean);
  if(!reusable){
   const archive=await fetchArchive(update.url);
   if(sha256(archive)!==update.digest)throw Error('Unexpected release archive SHA-256');
   const extracted=releaseAssemblies(archive,names);
   assemblies=Object.fromEntries([...extracted].map(([file,bytes])=>[path.basename(file,'.dll'),sha256(bytes)]));
   await fs.mkdir(dir,{recursive:true});
   for(const [file,bytes] of extracted)await atomicWrite(path.join(dir,file),bytes);
   await atomicWrite(inventory,JSON.stringify({digest:update.digest,assemblies}));
  }
  await atomicWrite(receipt,JSON.stringify({...pkg,version,url:update.url,assemblies}));
 }catch(error){throw referenceError(pkg.name,version,update.url,error);}
}

function referenceError(name:string,version:string,url:string,error:unknown){
 return Object.assign(new Error(name+' '+version+' — '+url+'\n'+String(error)),{code:'COMPILER_REFERENCES'});
}

async function downloadArchive(url:string){
 const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
 if(!response.ok||!response.body||Number(response.headers.get('content-length'))>maxArchiveBytes){
  await response.body?.cancel();
  throw Error('Download failed (HTTP '+response.status+')');
 }
 const input=response.body.getReader(),chunks:Uint8Array[]=[];
 let size=0;
 try{
  for(;;){
   const {value,done}=await input.read();
   if(done)break;
   size+=value.length;
   if(size>maxArchiveBytes){await input.cancel();throw Error('Release archive is too large');}
   chunks.push(value);
  }
 }finally{input.releaseLock();}
 return Buffer.concat(chunks,size);
}

export async function compilerReferences({download=false,fetchArchive=downloadArchive,cacheRoot=defaultCache}={}){
 const versions:Record<string,string>={};
 const references:Record<string,string>={},missing:string[]=[];
 for(const configured of await packages()){
  const pkg=await selectedPackage(configured,cacheRoot);
  versions[pkg.id]=pkg.version;
  const assemblies=Object.entries(pkg.assemblies);
  const dir=path.join(cacheRoot,pkg.id,pkg.version);
  const files=assemblies.map(([name,digest])=>({name,digest,file:path.join(dir,name+'.dll')}));
  const valid=(await Promise.all(files.map(({file,digest})=>assemblyIsValid(file,digest)))).every(Boolean);
  if(!valid){
   if(!download){missing.push(pkg.name);continue;}
   try{
    const extracted=releaseAssemblies(await fetchArchive(pkg.url),assemblies.map(([name])=>name),pkg.entries);
    for(const {name,digest} of files){
     if(sha256(extracted.get(name+'.dll')!)!==digest)throw Error('Unexpected SHA-256 for '+name+'.dll');
    }
    await fs.mkdir(dir,{recursive:true});
    for(const {name,file} of files)await atomicWrite(file,extracted.get(name+'.dll')!);
   }catch(error){throw referenceError(pkg.name,pkg.version,pkg.url,error);}
  }
  for(const {name,file} of files)references[name]=file;
 }
 return {references,missing,versions};
}
// 2026-11-21-0947||codex-clan-editor||clan-creator/src/server/creator/compiler-references.ts||Descargar referencias al compilar y reutilizar solo DLL con hash conocido
// 2026-11-21-0951||codex-clan-editor||clan-creator/src\server\creator\compiler-references.ts||Consultar versiones en segundo plano y activar cambios solo con seleccion explicita
// 2026-11-21-0952||codex-clan-editor||clan-creator/src/server/creator/compiler-references.ts||Reutilizar versiones descargadas al reactivarlas y conservar caché para volver a una version anterior
// 2026-11-21-0953||codex-clan-editor||clan-creator/src/server/creator/compiler-references.ts||Extraer la referencia correcta de cada paquete
