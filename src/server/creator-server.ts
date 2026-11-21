import {appBuildId,checkAppUpdate,installedAppVersion} from './creator/app-updates.js';
import type {Draft} from './creator/model.js';
import {deriveArtwork} from './creator/art-variants.js';
import {savePlaytest,saveCardTest} from './creator/playtest.js';
import {collectionViews} from './creator/collection-view.js';
import {listRecoveryPoints,recordRecoveryPoint,recoverDraft} from './creator/recovery.js';
import {exportCollectionBackup,previewCollectionBackup,importCollectionBackup} from './creator/collection-backup.js';
import {editingView} from './creator/navigation-state.js';
import {errorGuidance} from './creator/user-errors.js';
import {installationState,rememberDestination,recordInstallation,recordUninstallation,gameContentHash,updateProjectState} from './creator/project-state.js';
import {createQuickDraft} from './creator/quick-start.js';
import {exportDraftBackup,importDraftBackup,duplicateDraft} from './creator/draft-backup.js';
import {generatedJsonPreview} from './creator/json-preview.js';
import {checkProfile} from './creator/check-profile.js';
import {suggestedLocalDestination} from './creator/local-destination.js';
import {createCommunityDraft} from './creator/community-clans.js';
import {createOfficialDraft} from './creator/official-clans.js';
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {dataRoot,inside,projectRoot,keyForPath} from './paths.js';
import {creatorRules,exampleList,readExample,cloneExampleCard,exampleParameters,catalogRoot} from './creator/catalog.js';
import {listDrafts,newDraft,loadDraft,saveDraft,uploadImage,projectFolder,validateDraftShape,trashDraft,restoreDraft,deletedDrafts} from './creator/projects.js';
import {reviewDraft,generateClan} from './creator/export.js';
import {detectRuntime} from './creator/dependencies.js';
import {compilerUpdateStatus,selectCompilerRelease} from './creator/compiler-references.js';
import {planClanInstall,installClan,resolveClanDestination,planClanUninstall,uninstallClan,type ClanUninstallPlan,type ClanInstallPlan} from './creator/install-clan.js';
const runningBuild=appBuildId();
const recentBuilds=new Map<string,{hash:string;root:string;dll:string;at:number}>();
const clanPlans=new Map<string,ClanInstallPlan & {contentHash:string;draft:Draft}>();const uninstallPlans=new Map<string,ClanUninstallPlan>();
import {buildOffline} from './offline-build.js';
import {packageFiles} from './creator/zip.js';
import {clanFolderName} from './creator/clan-folder.js';
const run=promisify(execFile),preparing=new Set<string>();
function send(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req:IncomingMessage,limit=18e6){if(!req.headers['content-type']?.startsWith('application/json'))throw Error('El formulario no se pudo leer. Recarga la pÃ¡gina.');let count=0;const chunks:Buffer[]=[];for await(const chunk of req){count+=chunk.length;if(count>limit)throw Error('La imagen es demasiado grande.');chunks.push(chunk);}const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error('El formulario no es vÃ¡lido.');return value;}
async function fileResponse(res:ServerResponse,file:string,type:string){const b=await fs.readFile(file);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(b);}
async function chooseFolder(){if(process.platform==='win32'){const script="Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description='Selecciona la carpeta de Monster Train 2 o de tu perfil de mods'; if($d.ShowDialog() -eq 'OK'){[Console]::Write($d.SelectedPath)}";return (await run('powershell.exe',['-NoProfile','-STA','-Command',script],{windowsHide:false,timeout:120000})).stdout.trim();}if(process.platform==='darwin')return (await run('osascript',['-e','POSIX path of (choose folder with prompt "Monster Train 2 / mods")'],{timeout:120000})).stdout.trim();return (await run('zenity',['--file-selection','--directory','--title=Monster Train 2 / mods'],{timeout:120000})).stdout.trim();}
export function createCreatorServer({isGameRunning}:{isGameRunning?:()=>Promise<boolean>}={}){return createServer((req,res)=>{route(req,res,isGameRunning).catch(async error=>{if(!res.headersSent){const rules=await creatorRules().catch(()=>({}));send(res,error.code==='ENOENT'?404:400,{error:String(error.message??error),code:errorGuidance(error,rules).code,installStage:error.installStage,writeAccess:['EACCES','EPERM','EROFS'].includes(error.code)});}else res.end();});});}
async function route(req:IncomingMessage,res:ServerResponse,isGameRunning?:()=>Promise<boolean>){const host=req.headers.host??'';if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)){send(res,403,{error:'Solo se permite el acceso local.'});return;}if(req.headers.origin&&!['http://'+host,'http://127.0.0.1:5174','http://localhost:5174'].includes(req.headers.origin)){send(res,403,{error:'La solicitud no procede del creador.'});return;}
 const u=new URL(req.url??'/','http://'+host),p=u.pathname;
 if(req.method==='GET'&&p==='/api/creator'){send(res,200,{instance:keyForPath(projectRoot),rules:await creatorRules(),catalog:await exampleList(),appVersion:await installedAppVersion(),appBuild:runningBuild});return;}
 if(req.method==='GET'&&p==='/api/app-update'){const rules=await creatorRules();send(res,200,await checkAppUpdate(await installedAppVersion(),rules.appUpdate.repository));return;}
 if(req.method==='GET'&&p==='/api/local-destination'){send(res,200,await suggestedLocalDestination());return;}
 if(req.method==='POST'&&p==='/api/profile-check'){
  const {folder}=await body(req,32768);
  const {packages,ready}=await checkProfile(folder,{fingerprint:false});
  send(res,200,{packages,ready});
  return;
 }
 if(req.method==='GET'&&p==='/api/deleted-projects'){send(res,200,await deletedDrafts());return;}
 if(req.method==='GET'&&p==='/api/projects'){send(res,200,await listDrafts());return;}
 if(req.method==='GET'&&p==='/api/collection-backup'){send(res,200,await exportCollectionBackup());return;}
 if(req.method==='POST'&&p==='/api/collection-backup/preview'){const rules=await creatorRules();send(res,200,await previewCollectionBackup(await body(req,rules.collectionBackups.maxBytes)));return;}
 if(req.method==='POST'&&p==='/api/collection-backup/restore'){const rules=await creatorRules(),input=await body(req,rules.collectionBackups.maxBytes+65536);send(res,201,await importCollectionBackup(input.backup,input.selected));return;}
 if(req.method==='POST'&&p==='/api/projects/quick-start'){const input=await body(req);send(res,201,await createQuickDraft(input.language==='es'?'es':'en'));return;}
 if(req.method==='POST'&&p==='/api/projects/restore-backup'){const rules=await creatorRules();send(res,201,await importDraftBackup(await body(req,rules.backups.maxBytes)));return;}
 if(req.method==='POST'&&p==='/api/projects/from-community'){const request=await body(req);send(res,201,await createCommunityDraft(request.clanId,request.language==='es'?'es':'en'));return;}
 if(req.method==='POST'&&p==='/api/projects/from-official'){const request=await body(req);send(res,201,await createOfficialDraft(request.clanId,request.language==='en'?'en':'es'));return;}
 if(req.method==='POST'&&p==='/api/projects'){await body(req);send(res,201,await newDraft());return;}
 const detail=p.match(/^\/api\/examples\/([A-Za-z0-9_-]+)$/);if(req.method==='GET'&&detail){const e=await readExample(detail[1]);const language=u.searchParams.get('language')==='en'?'en':'es';send(res,200,{example:e,card:cloneExampleCard(e,randomUUID(),language),parameters:exampleParameters(e)});return;}
 const project=p.match(/^\/api\/projects\/([a-f0-9-]{36})(?:\/(art-variants|image|review|export|local-plan|local-install|trash-draft|restore-draft|uninstall-plan|uninstall|json-preview|card-json|backup|duplicate|local-state|history|checkpoint|recover))?$/);
 if(project){const id=project[1],action=project[2];if(req.method==='GET'&&!action){send(res,200,await loadDraft(id));return;}if(req.method==='PUT'&&!action){const value=await body(req);if(value.id!==id)throw Error('El clan del formulario no coincide.');send(res,200,await saveDraft(value));return;}
 if(req.method==='GET'&&action==='local-state'){send(res,200,await installationState(await loadDraft(id)));return;}
 if(req.method==='PUT'&&action==='local-state'){const input=await body(req);if(Object.hasOwn(input,'cardTest'))await saveCardTest(id,input.cardTest);if(Object.hasOwn(input,'playtest'))await savePlaytest(id,input.playtest);if(Object.hasOwn(input,'folder'))await rememberDestination(id,input.folder);if(Object.hasOwn(input,'collections'))await updateProjectState(id,{collections:collectionViews(input.collections,await creatorRules())});if(Object.hasOwn(input,'view')){const draft=await loadDraft(id),rules=await creatorRules();const view=editingView(draft,input.view,rules.steps),card=[...draft.starters,...draft.cards].find(c=>c.uid===view.editing);await updateProjectState(id,{view:{...view,editingName:card?.name}});}send(res,200,await installationState(await loadDraft(id)));return;}
 if(req.method==='GET'&&action==='history'){send(res,200,await listRecoveryPoints(id));return;}
 if(req.method==='POST'&&action==='checkpoint'){const input=await body(req),d=await loadDraft(id);if(input.revision!==d.revision)throw Error('El clan ha cambiado. Vuelve a abrir la recuperación.');send(res,201,await recordRecoveryPoint(d,true));return;}
 if(req.method==='POST'&&action==='recover'){const input=await body(req);if(preparing.has(id))throw Error('Espera a que termine la preparación del clan.');send(res,200,await recoverDraft(id,input.key,input.revision));return;}
 if(req.method==='POST'&&action==='duplicate'){const input=await body(req);send(res,201,await duplicateDraft(id,input.language));return;}
 if(req.method==='GET'&&action==='backup'){send(res,200,await exportDraftBackup(id));return;}
 if(req.method==='POST'&&action==='trash-draft'){const input=await body(req);if(preparing.has(id))throw Error('Espera a que termine la preparacion del clan.');send(res,200,await trashDraft(id,input.revision));return;}
 if(req.method==='POST'&&action==='restore-draft'){await body(req);send(res,200,await restoreDraft(id));return;}
 if(req.method==='POST'&&action==='uninstall-plan'){const input=await body(req);if(preparing.has(id))throw Error('Espera a que termine la preparacion del clan.');const plan=await planClanUninstall(input.folder,id);for(const [key,value]of uninstallPlans)if(Date.now()-value.createdAt>600000)uninstallPlans.delete(key);if(uninstallPlans.size>=20)throw Error('Hay demasiadas revisiones abiertas.');const token=randomUUID();uninstallPlans.set(token,plan);send(res,200,{token,target:plan.target,profile:plan.profile});return;}
 if(req.method==='POST'&&action==='uninstall'){const input=await body(req),plan=uninstallPlans.get(input.token);if(!plan||plan.projectId!==id)throw Error('Busca y revisa este clan antes de desinstalar.');if(preparing.has(id))throw Error('Espera a que termine la preparacion del clan.');uninstallPlans.delete(input.token);const removed=await uninstallClan(plan,{isRunning:isGameRunning});try{await recordUninstallation(id,removed.target);}catch{}send(res,200,removed);return;}
 if(req.method==='POST'&&action==='art-variants'){send(res,200,await deriveArtwork(id,await body(req)));return;}
 if(req.method==='POST'&&action==='image'){const input=await body(req);send(res,200,await uploadImage(id,input.base64,input.framing));return;}
 if(req.method==='GET'&&action==='review'){const d=await loadDraft(id);send(res,200,{revision:d.revision,issues:await reviewDraft(d)});return;}
 if(req.method==='POST'&&action==='card-json'){
  const input=await body(req),draft=await loadDraft(id);
  if(typeof input.uid!=='string'||input.revision!==draft.revision)throw Error('Guarda los últimos cambios antes de ver el JSON.');
  const result=await generateClan(draft,input.uid);
  send(res,200,{content:result.cardJson,readOnly:true});
  return;
 }
 if(req.method==='POST'&&action==='json-preview'){const input=await body(req),d=await loadDraft(id);if(input.revision!==d.revision)throw Error('Guarda los ultimos cambios antes de ver el JSON.');if(preparing.has(id))throw Error('Ya hay una preparacion en curso.');preparing.add(id);try{const preview=await generatedJsonPreview(d);if((await loadDraft(id)).revision!==d.revision)throw Error('El clan ha cambiado. Vuelve a abrir su JSON.');send(res,200,preview);return;}finally{preparing.delete(id);}}
 if(req.method==='POST'&&action==='local-plan'){
  const request=await body(req),d=await loadDraft(id);
  if(request.revision!==d.revision)throw Error('Guarda los últimos cambios antes de preparar el clan.');
  if(preparing.has(id))throw Error('Ya se está preparando este clan.');
  preparing.add(id);let installStage='preparing';
  try{
   const folder=request.folder;
   if(typeof folder!=='string'||!folder.trim())throw Error('Indica la carpeta de mods de tu perfil.');
   await resolveClanDestination(folder.trim());
   const hash=gameContentHash(d);
   let build=recentBuilds.get(id);
   if(!build||build.hash!==hash||Date.now()-build.at>600000||!await fs.stat(build.dll).catch(()=>null)){
    const runtime=await detectRuntime(undefined,true);
    if(!runtime.ready)throw Error('Comprueba los componentes para compilar antes de instalar.');
    const generated=await generateClan(d);
    installStage='compiling';
    const built=await buildOffline(generated.root,generated.project);
    if(!built.ok||!built.dll)throw Error('No se pudo compilar el clan. '+(built.log??'').slice(-2000));
    build={hash,root:generated.root,dll:built.dll,at:Date.now()};
    recentBuilds.delete(id);
    recentBuilds.set(id,build);
    while(recentBuilds.size>20)recentBuilds.delete(recentBuilds.keys().next().value!);
   }
   if((await loadDraft(id)).revision!==d.revision)throw Error('El clan cambió mientras se compilaba. Vuelve a prepararlo.');
   installStage='copying';
   const plan=await planClanInstall({folder:folder.trim(),projectId:id,revision:d.revision,clanName:d.name,source:build.root,dll:build.dll});
   for(const [token,old]of clanPlans)if(Date.now()-old.createdAt>600000)clanPlans.delete(token);
   if(clanPlans.size>=20)throw Error('Hay demasiadas revisiones abiertas. Espera unos minutos.');
   const token=randomUUID();
   clanPlans.set(token,{...plan,draft:d,contentHash:hash});
   send(res,200,{token,profile:plan.profile,target:plan.target,revision:d.revision,files:plan.files.length,replace:plan.previous!==null});
   return;
  }catch(error){throw Object.assign(error as Error,{installStage});}
  finally{preparing.delete(id);}
 }
 if(req.method==='POST'&&action==='local-install'){const request=await body(req),plan=clanPlans.get(request.token);if(!plan||plan.projectId!==id)throw Error('Selecciona y revisa el perfil antes de instalar.');clanPlans.delete(request.token);const installed=await installClan(plan,{isRunning:isGameRunning,isCurrent:async()=>(await loadDraft(id)).revision===plan.revision});let installationRecorded=true;try{await recordInstallation(plan.draft,plan.contentHash,installed,plan.destination.plugins);}catch{installationRecorded=false;}send(res,200,{...installed,installationRecorded});return;}
 if(req.method==='POST'&&action==='export'){const request=await body(req);const d=await loadDraft(id);await validateDraftShape(d);if(request.revision!==d.revision)throw Error('Guarda los Ãºltimos cambios antes de preparar el clan.');if(preparing.has(id))throw Error('Ya se estÃ¡ preparando este clan. Espera a que termine.');preparing.add(id);
 try{const runtime=request.playable?await detectRuntime(undefined,true):null;if(request.playable&&!runtime!.ready)throw Error('Faltan componentes para compilar. Pulsa Comprobar lo necesario para jugar.');const generated=await generateClan(d);const exportId=randomUUID();const folder=path.join(dataRoot,'creator-downloads',exportId);await fs.mkdir(folder,{recursive:true});let dll:string|undefined;
 if(request.playable){const result=await buildOffline(generated.root,generated.project);if(!result.ok)throw Error('No se pudo compilar el clan. '+(result.log??'').slice(-2000));dll=result.dll;}
 if((await loadDraft(id)).revision!==d.revision)throw Error('El clan cambiÃ³ mientras se preparaba. Vuelve a revisar y preparar tu versiÃ³n actual.');const prefix=request.playable?clanFolderName(d.name).replace(/\.{2,}/g,'-'):'MiClan_'+d.id.slice(0,8);const zip=await packageFiles(generated.root,prefix,!request.playable,dll);const file=path.join(folder,'clan.zip');await fs.writeFile(file,zip,{flag:'wx'});const receipt={name:prefix,id:exportId,projectId:id,revision:d.revision,playable:Boolean(request.playable),sha256:createHash('sha256').update(zip).digest('hex'),createdAt:new Date().toISOString(),bytes:zip.length,validation:generated.validation};await fs.writeFile(path.join(folder,'receipt.json'),JSON.stringify(receipt,null,2));send(res,200,{...receipt,url:'/api/download/'+exportId});return;
 }finally{preparing.delete(id);}}
 }
 if(p==='/api/compiler-updates'&&req.method==='GET'){send(res,200,await compilerUpdateStatus());return;}
 if(p==='/api/compiler-updates'&&req.method==='POST'){
  const {id,version}=await body(req);
  if(typeof id!=='string'||(version!==undefined&&typeof version!=='string'))throw Error('Invalid compilation reference selection');
  await selectCompilerRelease(id,version);
  recentBuilds.clear();
  send(res,200,await compilerUpdateStatus());
  return;
 }
 if(req.method==='GET'&&p==='/api/runtime'){send(res,200,await detectRuntime());return;}
 if(req.method==='POST'&&p==='/api/runtime'){
  const input=await body(req);
  const folder=typeof input.folder==='string'?input.folder.trim():'';
  if(!folder||folder.length>2048||folder.includes('\0')||!path.isAbsolute(folder))throw Error('Indica la ruta completa de la carpeta de Monster Train 2.');
  send(res,200,await detectRuntime(path.resolve(folder)));
  return;
 }
 if(req.method==='POST'&&p==='/api/runtime/browse'){await body(req);const folder=await chooseFolder();send(res,200,await detectRuntime(folder||undefined));return;}
 const download=p.match(/^\/api\/download\/([a-f0-9-]{36})$/);if(req.method==='GET'&&download){const f=path.join(dataRoot,'creator-downloads',download[1],'clan.zip');const receipt=JSON.parse(await fs.readFile(path.join(path.dirname(f),'receipt.json'),'utf8'));const fileName=encodeURIComponent((receipt.name??'MiClan')+'.zip').replaceAll("'",'%27');res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+fileName);await fileResponse(res,f,'application/zip');return;}
 const font=p.match(/^\/catalog\/official\/fonts\/(Acme-Regular|PTSansNarrowRegular|PTSansNarrowBold)\.ttf$/);if(req.method==='GET'&&font){await fileResponse(res,path.join(catalogRoot,'official/fonts',font[1]+'.ttf'),'font/ttf');return;}
 const art=p.match(/^\/catalog\/((?:official\/)?assets\/[a-f0-9]{64}\.png|ui\/(?:unit|spell|room)\.png)$/);if(req.method==='GET'&&art){await fileResponse(res,path.join(catalogRoot,art[1]),'image/png');return;}
 const upload=p.match(/^\/api\/images\/([a-f0-9-]{36})\/([a-f0-9-]{36}\.png)$/);if(req.method==='GET'&&upload){await fileResponse(res,path.join(projectFolder(upload[1]),'upload',upload[2]),'image/png');return;}
 if(p.startsWith('/api/')){send(res,404,{error:'Esta acciÃ³n no existe.'});return;}
 if(req.method!=='GET'){send(res,405,{error:'AcciÃ³n no disponible.'});return;}
 const dist=path.join(projectRoot,'dist'),file=path.resolve(dist,'.'+decodeURIComponent(p==='/'?'/index.html':p));if(!inside(dist,file)){send(res,403,{error:'Ruta no vÃ¡lida.'});return;}const ext=path.extname(file);const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};await fileResponse(res,file,mime[ext]??'application/octet-stream');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.CLAN_CREATOR_PORT??(await creatorRules()).application.port);createCreatorServer().listen(port,'127.0.0.1',()=>console.log(`Crea tu clan: http://127.0.0.1:${port}`));}
// 2026-11-15-0857||codex-clan-editor||clan-creator/src/server/creator-server.ts||Servidor exclusivo del creador: borradores, ejemplos, imÃ¡genes, requisitos, generaciÃ³n y descargas sin pantallas tÃ©cnicas
// 2026-11-15-0916||codex-clan-editor||clan-creator/src\server\creator-server.ts||No entregar como actual un archivo preparado mientras otra ventana cambia el clan
// 2026-11-15-0917||codex-clan-editor||clan-creator/src\server\creator-server.ts||Identificar cada copia del programa para no abrir proyectos de otra instalaciÃ³n
// 2026-11-15-1018||codex-clan-editor||clan-creator/src/server/creator-server.ts||Servir Ãºnicamente PNG oficiales por hash con rutas restringidas
// 2026-11-15-1140||codex-clan-editor||clan-creator/src/server/creator-server.ts||Servir las tres fuentes originales de cartas mediante una lista de rutas permitidas
// 2026-11-15-1420||codex-clan-editor||clan-creator/src\server\creator-server.ts||Añadir selección de perfil y aplicación de revisión con token de un solo uso sin aceptar rutas arbitrarias del navegador
// 2026-11-15-1826||codex-clan-editor||clan-creator/src\server\creator-server.ts||Compilar y preparar instalación local mediante explorador y token de un uso, sin generar ZIP
// 2026-11-15-1834||codex-clan-editor||clan-creator/src\server\creator-server.ts||Validar herramientas del gestor antes de compilar y bloquear solicitudes simultáneas desde el explorador
// 2026-11-15-2003||codex-clan-editor||clan-creator/src/server/creator-server.ts||Sustituir instalacion de herramientas por comprobacion de perfil de solo lectura y retirar endpoint instalador
// 2026-11-15-2009||codex-clan-editor||clan-creator/src/server/creator-server.ts||Crear copias oficiales guardadas sin sobrescribir proyectos del usuario
// 2026-11-15-2126||codex-clan-editor||clan-creator/src/server/creator-server.ts||Retirar endpoint de comprobacion del perfil y no exigir deteccion de dependencias para instalar clan
// 2026-11-15-2211||codex-clan-editor||clan-creator/src/server/creator-server.ts||Aceptar destino escrito en instalacion sin dialogo PowerShell y ofrecer carpeta Thunderstore existente
// 2026-11-15-2239||codex-clan-editor||clan-creator/src/server/creator-server.ts||Pasar nombre actual del borrador a destino de instalacion
// 2026-11-15-2300||codex-clan-editor||clan-creator/src/server/creator-server.ts||Exponer papelera restauracion y desinstalacion revisada con tokens propios sin borrar otros mods
// 2026-11-15-2341||codex-clan-editor||clan-creator/src/server/creator-server.ts||Exponer vista de JSON generado con revision comprobada sin endpoint de escritura de archivos
// 2026-11-16-2144||codex-clan-editor||clan-creator/src/server/creator-server.ts||Exponer recorrido inicial y copia restauración portátil con límites de tamaño sin instalar ni sobrescribir clanes
// 2026-11-16-2323||codex-clan-editor||clan-creator/src/server/creator-server.ts||Exponer estado local y destino recordado registrar instalación real y devolver códigos de error traducibles
// 2026-11-16-2327||codex-clan-editor||clan-creator/src/server/creator-server.ts||Aceptar encuadre de imagen validado sin rutas arbitrarias ni modificación del original
// 2026-11-16-2331||codex-clan-editor||clan-creator/src/server/creator-server.ts||No informar de fallo de instalación o desinstalación cuando solo falla su registro local posterior
// 2026-11-17-0021||codex-clan-editor||clan-creator/src\server\creator-server.ts||Persistir contexto de edición validado por proyecto sin escribir rutas ni revisar instalaciones
// 2026-11-17-1848||codex-clan-editor||clan-creator/src\server\creator-server.ts||Exponer recuperación protegida copias múltiples y filtros persistentes sin tocar instalaciones
// 2026-11-17-2236||codex-clan-editor||clan-creator/src\server\creator-server.ts||Exponer vista previa de derivados y comprobaciones manuales de la versión instalada
// 2026-11-19-0800||codex-clan-editor||clan-creator/src/server/creator-server.ts||Comparar con la revisión exacta utilizada para compilar
// 2026-11-19-0913||codex-clan-editor||clan-creator/src/server/creator-server.ts||Aceptar notas de prueba por carta en estado local
// 2026-11-19-0914||codex-clan-editor||clan-creator/src/server/creator-server.ts||Reusar compilaciones breves del mismo contenido y distinguir el paso donde falla la instalación
// 2026-11-19-0915||codex-clan-editor||clan-creator/src/server/creator-server.ts||Descargar y extraer el paquete jugable con el nombre reconocible del clan
// 2026-11-19-0915||codex-clan-editor||clan-creator/src/server/creator-server.ts||Admitir nombres con puntos consecutivos en el paquete jugable
// 2026-11-19-2218||codex-clan-editor||clan-creator/src/server/creator-server.ts||Permitir comprobar ambos estados del juego en el perfil temporal con detección real por defecto
// 2026-11-19-2223||codex-clan-editor||clan-creator/src/server/creator-server.ts||Guardar la desinstalación sin confundir perfiles y comprobar que el juego está cerrado
// 2026-11-20-0901||codex-clan-editor||clan-creator/src/server/creator-server.ts||Permitir comprobar la carpeta del juego desde Revisar e instalar
// 2026-11-21-0948||codex-clan-editor||clan-creator/src/server/creator-server.ts||Preparar referencias para instalacion y exportacion jugable
// 2026-11-21-0950||codex-clan-editor||clan-creator/src/server/creator-server.ts||Servir JSON de solo lectura por carta y revision
// 2026-11-21-0951||codex-clan-editor||clan-creator/src\server\creator-server.ts||Exponer versiones de compilacion y aplicar solo las seleccionadas por el usuario
// 2026-11-21-0951||codex-clan-editor||clan-creator/src/server/creator-server.ts||Invalidar compilaciones reutilizadas cuando cambia la version seleccionada
// 2026-11-21-0955||codex-clan-editor||clan-creator/src\server\creator-server.ts||Registrar la ruta del visor JSON individual
// 2026-11-21-1045||codex-clan-editor||clan-creator/src/server/creator-server.ts||Conectar la creación de clanes de ejemplo de la comunidad
// 2026-11-21-1045||codex-clan-editor||clan-creator/src/server/creator-server.ts||Añadir la ruta para cargar y guardar las copias de la comunidad
// 2026-11-21-1105||codex-clan-editor||clan-creator/src/server/creator-server.ts||Cargar servicios de versión y actualizaciones
// 2026-11-21-1105||codex-clan-editor||clan-creator/src/server/creator-server.ts||Incluir la versión instalada en la configuración inicial
// 2026-11-21-1105||codex-clan-editor||clan-creator/src/server/creator-server.ts||Comprobar lanzamientos de la aplicación solo al pedirlo
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/server/creator-server.ts||Conectar la acción de duplicar un clan guardado
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/server/creator-server.ts||Habilitar la ruta de copia de borrador
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/server/creator-server.ts||Crear y abrir una copia independiente desde el asistente
// 2026-11-21-1115||codex-clan-editor||clan-creator/src/server/creator-server.ts||Identificar la compilación servida en la API de arranque
// 2026-11-21-1115||codex-clan-editor||clan-creator/src/server/creator-server.ts||Conservar el identificador al arrancar el proceso
// 2026-11-21-1115||codex-clan-editor||clan-creator/src/server/creator-server.ts||Exponer la huella del proceso que sirve la interfaz
// 2026-11-21-1945||codex-clan-editor||clan-creator/src/server/creator-server.ts||Exponer un diagnóstico voluntario y compacto del perfil seleccionado
