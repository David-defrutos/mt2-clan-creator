import {validateDistributionPrivacy} from './distribution-privacy.mjs';
import {sanitizeDistributionArt} from './distribution-art.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {zipBuffers} from '../dist-server/creator/zip.js';
const root=path.resolve(import.meta.dirname,'..'),stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short'}).format(new Date()).replace(' ','-').replace(':',''),out=path.join(root,'data','releases');await fs.mkdir(out,{recursive:true});const stage=await fs.mkdtemp(path.join(out,'ClanCreator-'));
const official=await fs.readFile(path.join(root,'catalog/official/index.json'),'utf8').then(JSON.parse).catch(()=>({items:[]})),art=await fs.readFile(path.join(root,'catalog/official/art-manifest.json'),'utf8').then(JSON.parse).catch(()=>({frames:{}}));const approvedImages=new Set([...official.items.flatMap(e=>[e.picture,e.detailPicture]).filter(Boolean),...Object.values(art.frames).map(e=>e.asset)]),approvedExamples=new Set(official.items.map(e=>e.id+'.json'));
for(const name of ['dist','dist-server','config','catalog','scripts/launch.mjs','LICENSE','start-clan-creator.cmd','README.txt','Abrir-creador.command','LEEME.txt']){await fs.mkdir(path.dirname(path.join(stage,name)),{recursive:true});await fs.cp(path.join(root,name),path.join(stage,name),{recursive:true,filter:source=>{const relative=path.relative(path.join(root,'catalog'),source).replaceAll('\\','/');if(relative.startsWith('official/assets/'))return approvedImages.has(relative);if(relative.startsWith('official/examples/'))return approvedExamples.has(path.basename(source));return true;}});}
await sanitizeDistributionArt(stage);
execFileSync(process.execPath,[path.join(root,'scripts','build-catalog-search.mjs')],{
 env:{...process.env,CLAN_CREATOR_HOME:stage,CLAN_CREATOR_CATALOG_ROOT:path.join(stage,'catalog')},
 stdio:'inherit',
});
const {name,version,license:appLicense,type}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
await fs.writeFile(path.join(stage,'package.json'),JSON.stringify({name,version,private:true,license:appLicense,type},null,2));
const lock=JSON.parse(await fs.readFile(path.join(root,'package-lock.json'),'utf8'));for(const [relative,metadata]of Object.entries(lock.packages)){if(!relative.startsWith('node_modules/')||metadata.dev)continue;const source=path.join(root,relative);if(!(await fs.stat(source).catch(()=>null))?.isDirectory())continue;await fs.mkdir(path.dirname(path.join(stage,relative)),{recursive:true});await fs.cp(source,path.join(stage,relative),{recursive:true});}
await fs.mkdir(path.join(stage,'runtime'));await fs.copyFile(process.execPath,path.join(stage,'runtime',process.platform==='win32'?'node.exe':'node'));const license=await fs.readFile(path.join(path.dirname(process.execPath),'LICENSE')).catch(()=>fs.readFile(path.join(root,'vendor','node-'+process.version+'-LICENSE')).catch(()=>null));if(!license)throw Error('Falta la licencia del runtime Node: prepara una distribución oficial completa de Node junto al ejecutable.');await fs.writeFile(path.join(stage,'runtime/LICENSE'),license);if(process.platform!=='win32'){await fs.chmod(path.join(stage,'runtime/node'),0o755);await fs.chmod(path.join(stage,'Abrir-creador.command'),0o755);}
const compilerManifest=JSON.parse(await fs.readFile(path.join(root,'config/compiler-references.json'),'utf8'));
const compilerDlls=new Set(compilerManifest.packages.flatMap(pkg=>Object.keys(pkg.assemblies).map(name=>(name+'.dll').toLowerCase())));
const files=[];async function visit(folder){for(const e of await fs.readdir(folder,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('No se distribuyen enlaces simbólicos.');const p=path.join(folder,e.name);if(e.isDirectory())await visit(p);else{const name=path.relative(stage,p).replaceAll('\\','/');if(/(^|\/)(\.git|\.env|creator-runtime\.json|build-local\.json)(\/|$)/.test(name)||name.startsWith('data/')||compilerDlls.has(path.basename(name).toLowerCase())||name.startsWith('vendor/modding/'))throw Error('Dato local no permitido: '+name);const bytes=await fs.readFile(p);validateDistributionPrivacy(name,bytes);files.push({name:'ClanCreator/'+name,bytes});}}}await visit(stage);
const zip=zipBuffers(files,{compress:true,maxUncompressedBytes:512*1024*1024});const target=path.join(out,`ClanCreator-${version}-${process.platform}-${process.arch}-${stamp}.zip`);await fs.writeFile(target,zip);const report={version,platform:process.platform,arch:process.arch,nodeVersion:process.version,directory:stage,archive:target,sha256:createHash('sha256').update(zip).digest('hex'),bytes:zip.length,fileCount:files.length};await fs.writeFile(path.join(stage,'BUILD-RECEIPT.json'),JSON.stringify(report,null,2));await fs.writeFile(target+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
// 2026-11-15-0917||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Distribución autónoma por plataforma con runtime, dependencias, catálogo y arte; sin datos privados ni DLL del juego
// 2026-11-15-0920||codex-clan-editor||clan-creator/scripts\package-creator.mjs||Incluir la licencia oficial conservada del runtime cuando la instalación no la aporta
// 2026-11-15-1027||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Empaquetar solamente imágenes y ejemplos oficiales aprobados para contener el tamaño de distribución
// 2026-11-15-1033||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Fechar paquetes con la hora local de Madrid y formato del proyecto
// 2026-11-15-1227||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Reducir el paquete ampliado comprimiendo runtime, fuentes y código sin reprocesar los PNG
// 2026-11-15-1418||codex-clan-editor||clan-creator/scripts\package-creator.mjs||Incluir herramientas y licencias en futuros paquetes; comprobar inventario antes de empaquetar, sin ejecutar empaquetado
// 2026-11-15-1434||codex-clan-editor||clan-creator/scripts\package-creator.mjs||Corregir símbolos y acentos alterados por lectura con codificación Windows
// 2026-11-16-2149||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Incluir lanzador y guía ingleses en distribución conservando accesos anteriores
// 2026-11-17-0025||codex-clan-editor||clan-creator/scripts\package-creator.mjs||Retirar arte DLC de todos los futuros ZIP sin modificar catálogo local
// 2026-11-19-2258||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Incluir la licencia del creador en los ZIP futuros
// 2026-11-19-2258||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Identificar la licencia del código en los metadatos del ZIP
// 2026-11-21-0948||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Excluir binarios de modding del paquete y detectar inclusiones accidentales de DLL
// 2026-11-21-0952||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Impedir DLL de compilacion sin excluir DLL nativas necesarias para procesar imagenes
// 2026-11-21-1000||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Incluir un solo lanzador de Windows en el ZIP
// 2026-11-21-1105||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Usar la versión de package.json en los metadatos y el nombre de futuras distribuciones
// 2026-11-21-1114||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Activar la comprobación de privacidad en el empaquetado
// 2026-11-21-1114||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Rechazar archivos propios con rutas personales o credenciales en el ZIP
// 2026-11-21-2045||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Regenerar en el paquete los términos y hashes de búsqueda tras retirar el arte oficial de combate
// 2026-11-21-2351||codex-clan-editor||clan-creator/scripts/package-creator.mjs||Retirar las ilustraciones oficiales del ZIP publico y preservar el catalogo local
// 2026-11-22-1025||codex-clan-creator-art||clan-creator/scripts/package-creator.mjs||Incluir picture y detailPicture oficiales junto con marcos en la copia empaquetada
