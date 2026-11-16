import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),workspace=path.dirname(root),[plugins,cache]=process.argv.slice(2);
if(!plugins||!cache)throw Error('Indica la carpeta plugins de origen y la caché NuGet.');
const out=path.join(root,'vendor/modding'),files=[],packages=[];
const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short'}).format(new Date()).replace(' ','-').replace(':','');
async function put(relative,bytes,source){const target=path.join(out,relative);const before=await fs.stat(target).catch(()=>null);if(before)await fs.readFile(target);if((await fs.stat(target).catch(()=>null))?.mtimeMs!==before?.mtimeMs)throw Error('Cambio concurrente '+target);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);const actual=await fs.readFile(target);if(!actual.equals(Buffer.from(bytes)))throw Error('Copia fallida');const sha256=createHash('sha256').update(actual).digest('hex');files.push({path:relative,sha256,bytes:actual.length,source});await fs.appendFile(path.join(workspace,'docs/registro/codex-clan-editor.md'),`${stamp}||codex-clan-editor||clan-creator/vendor/modding/${relative}||Incluir dependencia auditada; SHA256 ${sha256}\n`);}
for(const [id,folder,version]of [['trainworks','MT2-Trainworks_Reloaded','0.8.0'],['conductor','Conductor-Conductor','0.6.0']]){
 const source=path.resolve(plugins,folder),manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));if(manifest.version_number!==version)throw Error('Versión inesperada '+id);
 const prefix=`packages/${folder}`;async function visit(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('No se admiten enlaces');if(e.isDirectory())await visit(file);else if(!e.name.endsWith('.pdb')){const rel=path.relative(source,file).replaceAll('\\','/');await put(prefix+'/'+rel,await fs.readFile(file),manifest.website_url);}}}await visit(source);
 await put(prefix+'/LICENSE',await fs.readFile(path.join(workspace,'repos/MT2/originales',id==='trainworks'?'Trainworks-Reloaded':'Conductor','LICENSE')),manifest.website_url+'/blob/main/LICENSE');packages.push({id,folder,version,path:prefix,license:'MIT',website:manifest.website_url});
}
const urls={NVorbis:'https://raw.githubusercontent.com/NVorbis/NVorbis/v0.10.5/LICENSE',CsvHelper:'https://raw.githubusercontent.com/JoshClose/CsvHelper/master/LICENSE.txt',SimpleInjector:'https://raw.githubusercontent.com/simpleinjector/SimpleInjector/v5.5.0/LICENSE',BepInEx:'https://raw.githubusercontent.com/BepInEx/BepInEx/v5.4.20/LICENSE'};
for(const [name,url]of Object.entries(urls)){const response=await fetch(url);if(!response.ok)throw Error('No se pudo leer licencia '+url);await put('licenses/'+name+'.txt',Buffer.from(await response.text()),url);}
// Read only license/notice entries from local NuGet packages; never include game assemblies.
const notices=execFileSync('python',['-c',`import pathlib,zipfile,json,sys
base=pathlib.Path(sys.argv[1]); wanted=[]
for name in ['microsoft.bcl.asyncinterfaces','microsoft.extensions.configuration','microsoft.extensions.configuration.abstractions','microsoft.extensions.configuration.fileextensions','microsoft.extensions.configuration.json','microsoft.extensions.fileproviders.abstractions','microsoft.extensions.fileproviders.physical','microsoft.extensions.filesystemglobbing','microsoft.extensions.primitives','newtonsoft.json','system.buffers','system.io.pipelines','system.memory','system.numerics.vectors','system.text.encodings.web','system.text.json']:
 versions={'system.buffers':'4.5.1','system.memory':'4.5.5','system.numerics.vectors':'4.4.0','newtonsoft.json':'13.0.3'}; version=versions.get(name,'9.0.2'); p=base/name/version/(name+'.'+version+'.nupkg')
 with zipfile.ZipFile(p) as z:
  entries=[n for n in z.namelist() if 'license' in n.lower() or 'notice' in n.lower()]
  if not entries: raise Exception('Sin licencia '+name)
  for n in entries:wanted.append({'path':name+'/'+pathlib.PurePosixPath(n).name,'text':z.read(n).decode('utf-8-sig')})
print(json.dumps(wanted))`,cache],{encoding:'utf8',windowsHide:true});
for(const n of JSON.parse(notices))await put('licenses/'+n.path,Buffer.from(n.text),'NuGet package license');
await put('references/BepInEx.dll',await fs.readFile(path.join(cache,'bepinex.baselib/5.4.20/lib/netstandard2.0/BepInEx.dll')),'BepInEx.BaseLib 5.4.20 (MIT), compile reference only');
const tw=packages[0].path,co=packages[1].path;
const references={BepInEx:'references/BepInEx.dll','TrainworksReloaded.Base':tw+'/TrainworksReloaded.Base.dll','TrainworksReloaded.Core':tw+'/TrainworksReloaded.Core.dll','TrainworksReloaded.Plugin':tw+'/TrainworksReloaded.Plugin.dll',Conductor:co+'/Conductor.dll','Microsoft.Extensions.Configuration.Abstractions':tw+'/Microsoft.Extensions.Configuration.Abstractions.dll'};
const index={schemaVersion:1,packages,references,files};await put('index.json',Buffer.from(JSON.stringify(index,null,2)),'Creator dependency inventory');console.log(JSON.stringify({packages:packages.map(p=>p.id+' '+p.version),files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)}));
// 2026-11-15-1418||codex-clan-editor||clan-creator/scripts/prepare-modding.mjs||Preparar paquetes completos con hashes, licencias transitivas y referencia BepInEx MIT; excluir DLL del juego
