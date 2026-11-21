import {ShareClan} from './share-clan';
import {CompilerUpdates} from './compiler-updates';
import {PlaytestChecklist} from './playtest-checklist';
import {ErrorNotice} from './error-notice';
import {InstallStatus} from './install-status';
import {BackupTools} from './backup-tools';
import {JsonViewer} from './json-viewer';
import {clanFolderName} from '../../server/creator/clan-folder';
import React,{useEffect,useRef,useState} from 'react';
import type {LocalProfile} from '../../server/creator/local-destination';
import type {Draft} from '../../server/creator/model';
import {GameSetupGuide,ProfileCheck} from './profile-tools';
import {MechanicHelp} from './mechanic-help';
import {local,request,type Language} from './presentation';
export function localInstallPath(folder:string,clanName:string){if(!folder.trim())return '';const separator=folder.includes('\\')?'\\':'/';const base=folder.trim().replace(/[\\/]+$/,'');return base+(/[\\/]plugins$/i.test(base)?'':/[\\/]BepInEx$/i.test(base)?separator+'plugins':separator+'BepInEx'+separator+'plugins')+separator+clanFolderName(clanName);}
export async function installLocalClan(projectId:string,folder:string,persist:()=>Promise<any>,stage:(value:string)=>void,call=request){stage('preparing');const draft=await persist();const plan=await call('/projects/'+projectId+'/local-plan',{revision:draft.revision,folder});if(!plan.token)throw Error('No se pudo preparar el clan.');stage('copying');return call('/projects/'+projectId+'/local-install',{token:plan.token});}
export function compilationProblem(runtime:any,rules:any){if(!runtime)return 'compileChecking';if(!runtime.sdk||Number(runtime.sdk.split('.')[0])<rules.runtime.minimumSdkMajor)return 'compileSdkMissing';if(runtime.gameRequired?.length)return 'compileGameMissing';if(!runtime.ready)return 'compileCreatorMissing';return '';}
export function ReviewPlay({rules,language,draft,issues,onIssue,persist,onRestored,onInstalled,onContinueEditing,onEditCard}:{rules:any;language:Language;draft:Draft;issues:any[];onIssue:(issue:any)=>void;persist:()=>Promise<any>;onRestored?:(draft:Draft)=>void;onInstalled?:()=>void;onContinueEditing?:()=>void;onEditCard?:(uid:string)=>void}){
 const g=(key:string)=>local(rules.guidedText[key],language);const t=(key:string)=>local(rules.localInstall.text[key],language),[confirmed,setConfirmed]=useState(false),[folder,setFolder]=useState(''),[profiles,setProfiles]=useState<LocalProfile[]>([]),[manual,setManual]=useState(false),[suggested,setSuggested]=useState(false),[remembered,setRemembered]=useState(false),[installation,setInstallation]=useState<any>(),[stage,setStage]=useState(''),[error,setError]=useState<any>(),[result,setResult]=useState<any>(),[runtime,setRuntime]=useState<any>(),[compilationError,setCompilationError]=useState(false),[jsonPreview,setJsonPreview]=useState<any>(),[jsonBusy,setJsonBusy]=useState(false),[jsonError,setJsonError]=useState<any>();const j=(key:string)=>local(rules.jsonViewer[key],language);const compileProblem=compilationError?'compileCheckFailed':compilationProblem(runtime,rules);const busy=!!stage,ready=!issues.length;
 const focusProfile=useRef<HTMLSelectElement>(null),focusFolder=useRef<HTMLInputElement>(null),focusSetup=useRef<HTMLInputElement>(null);
 const [failedStep,setFailedStep]=useState('');
 const [gameFolder,setGameFolder]=useState(''),[gameFolderBusy,setGameFolderBusy]=useState(false),[gameFolderError,setGameFolderError]=useState(false);
 const guide=(key:string)=>local(rules.finishGuide[key],language);
 const focus=(target:HTMLElement|null)=>{target?.focus();target?.scrollIntoView({block:'center'});};
 const b=(key:string)=>local(rules.firstPlayText[key],language);
 const profile=profiles.find(p=>p.folder===folder);
 const playProfile=(target:string)=>profiles.find(p=>target.toLowerCase().startsWith((p.folder+(p.folder.includes('\\')?'\\':'/')).toLowerCase()))?.name;
 const next=issues.length?'fixIssues':!folder.trim()?'chooseProfile':!confirmed?'confirmSetup':compileProblem;
 function changeFolder(value:string){setError(undefined);setFailedStep('');setFolder(value);setSuggested(false);setRemembered(false);setResult(undefined);}
 useEffect(()=>{let active=true;Promise.all([request('/projects/'+draft.id+'/local-state'),request('/local-destination')]).then(([state,v])=>{if(active){setInstallation(state);setFolder(state.folder||v.folder);setProfiles(v.profiles??[]);setManual(!!state.folder&&!(v.profiles??[]).some((p:LocalProfile)=>p.folder===state.folder));setRemembered(!!state.folder);setSuggested(!state.folder&&!!v.folder);}}).catch(()=>{});return()=>{active=false;};},[draft.id]);
 useEffect(()=>{let active=true;request('/projects/'+draft.id+'/local-state').then(state=>{if(active)setInstallation(state);}).catch(()=>{});return()=>{active=false;};},[draft.id,draft.revision]);
 async function remember(){try{setInstallation(await request('/projects/'+draft.id+'/local-state',{folder:folder.trim()},'PUT'));setRemembered(true);}catch(e){setError(e);}}
 async function checkCompilation(){
  setRuntime(undefined);setCompilationError(false);setGameFolderError(false);
  try{setRuntime(await request('/runtime'));}catch{setCompilationError(true);}
 }
 async function checkGameFolder(){
  const gamePath=gameFolder.trim();
  if(!gamePath||gameFolderBusy)return;
  setGameFolderBusy(true);setGameFolderError(false);
  try{setRuntime(await request('/runtime',{folder:gamePath}));}
  catch{setGameFolderError(true);}
  finally{setGameFolderBusy(false);}
 }
 useEffect(()=>{checkCompilation();},[]);
 async function viewJson(){setJsonBusy(true);setJsonError('');try{const saved=await persist();setJsonPreview(await request('/projects/'+draft.id+'/json-preview',{revision:saved.revision}));}catch(e){setJsonError(e);}finally{setJsonBusy(false);}}
 const help=(key:string)=><MechanicHelp name={t(key+'Title')} text={t(key+'Tech')} label={t('help')}/>;
 async function install(){if(next||busy||jsonBusy)return;setError('');setFailedStep('');setResult(undefined);let current='preparing';
 try{setResult(await installLocalClan(draft.id,folder.trim(),persist,value=>{current=value;setStage(value);}));checkCompilation();request('/projects/'+draft.id+'/local-state').then(setInstallation).catch(()=>{});onInstalled?.();}catch(e){setError(e);setFailedStep((e as {installStage?:string})?.installStage??current);}finally{setStage('');}}
 return <div className="guided-review">{draft.pendingCard&&<p className="note">{local(rules.simpleArtText.pendingInstall,language)}</p>}{issues.length>0&&<section className="surface guided-step" id="install-next">
  <h2>{b('fixIssues')}</h2>
  <ul className="issues">{issues.map((issue,i)=><li key={i}><button onClick={()=>onIssue(issue)}>{language==='es'?issue.message:issue.messageEn} →</button></li>)}</ul>
 </section>}
 <section className="surface guided-step"><h2>{t('gameTitle')} {help('game')}</h2><p>{t('gameHelp')}</p><ul>{rules.moddingPackages.map((m:any)=><li key={m.name}><a href={m.url} target="_blank" rel="noreferrer">{m.name} ↗</a></li>)}</ul><details className="setup-instructions"><summary>{t('gameGuide')}</summary><GameSetupGuide rules={rules} language={language} includePackages={false}/></details>{profiles.length>0&&<label className="field"><span>{b('profileLabel')}</span><select ref={focusProfile} disabled={busy} value={manual?'manual':profile?.folder??''} onChange={e=>{const value=e.target.value;setManual(value==='manual');changeFolder(value==='manual'?'':value);setConfirmed(false);}}><option value="">{b('chooseProfile')}</option>{profiles.map(p=><option key={p.folder} value={p.folder}>{p.name}</option>)}<option value="manual">{b('manual')}</option></select></label>}
 {(manual||profiles.length===0)&&<><p>{b('manualHelp')}</p><label className="field"><span>{t('folderLabel')}</span><input ref={focusFolder} value={folder} disabled={busy} onBlur={remember} placeholder={t('folderEmpty')} onChange={e=>{changeFolder(e.target.value);setConfirmed(false);}}/></label></>}
 {folder.trim()&&<ProfileCheck key={folder.trim()} folder={folder.trim()} rules={rules} language={language} disabled={busy}/>}
 <label className="manual-confirm"><input ref={focusSetup} type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/><span>{t('gameConfirmed')}</span></label></section>
 <section className="surface guided-step"><h2>{t('installTitle')} {help('install')}</h2><p>{t('installHelp')}</p><InstallStatus state={installation} rules={rules} language={language}/>{remembered&&<p className="note">{local(rules.beginnerText.rememberedFolder,language)}</p>}{suggested&&<p className="note">{t('folderSuggested')}</p>}{folder.trim()&&<div className="destination-preview"><p>{t('destination')}</p><code>{localInstallPath(folder,draft.name)}</code></div>}<div role="status" id={next&&next===compileProblem?'install-next':undefined} className={compileProblem?'note':'success'}><p>{t(compileProblem||(runtime?.referencesPending?.length?'compileDownloadPending':'compileReady')).replace('{version}',String(rules.runtime.minimumSdkMajor))}</p>{compileProblem==='compileSdkMissing'&&<p><a href={rules.runtime.sdkDownload} target="_blank" rel="noreferrer">{local(rules.labels.sdkDownload,language)} ↗</a></p>}{compileProblem==='compileGameMissing'&&<>
 <label className="field"><span>{t('gameFolderLabel')}</span><input value={gameFolder} onChange={event=>{setGameFolder(event.target.value);setGameFolderError(false);}} disabled={gameFolderBusy}/></label>
 <button className="secondary" disabled={gameFolderBusy||!gameFolder.trim()} onClick={checkGameFolder}>{t(gameFolderBusy?'gameFolderChecking':'gameFolderCheck')}</button>
 {gameFolderError&&<p role="alert">{t('gameFolderInvalid')}</p>}
 </>}
 {compileProblem&&compileProblem!=='compileChecking'&&<button className="secondary" disabled={busy||gameFolderBusy} onClick={checkCompilation}>{t('compileRetry')}</button>}</div>{next&&next!==compileProblem&&next!=='fixIssues'&&!busy&&<p id="install-next" className="note">{b(next)}{' '}
 {next==='chooseProfile'&&<button className="quiet" onClick={()=>focus(focusFolder.current??focusProfile.current)}>{guide('chooseProfile')}</button>}
 {next==='confirmSetup'&&<button className="quiet" onClick={()=>focus(focusSetup.current)}>{guide('confirmSetup')}</button>}</p>}<button aria-describedby={next&&!busy?'install-next':undefined} className="primary large" disabled={busy||jsonBusy||!ready||!confirmed||!folder.trim()||!!compileProblem} onClick={install}>{busy?t(stage):t('installButton')}</button>{busy&&<p role="status">{t(stage)}</p>}{error&&<><p className="note">{guide('stepFailed').replace('{step}',guide(failedStep))}</p>{error.writeAccess&&failedStep==='copying'&&<p>{guide('copyAccess')}</p>}<ErrorNotice error={error} rules={rules} language={language} onRetry={next?undefined:install}/></>}{result&&<div className="install-success" role="status"><h3>✓ {t('installed')}</h3>{result.installationRecorded===false&&<p>{local(rules.beginnerText.installNotRecorded,language)}</p>}<h4>{g('playNext')}</h4><ol><li>{playProfile(result.target)?b('playProfile').replace('{profile}',playProfile(result.target)!):g('playManager')+' '+g('playModded')}</li><li>{g('playChoose').replace('{name}',draft.name)}</li></ol><details><summary>{g('notVisible')}</summary><ul>{['helpProfile','helpMods','helpRestart','helpChanges'].map(k=><li key={k}>{g(k)}</li>)}</ul></details><button className="secondary" onClick={onContinueEditing}>{g('keepEditing')}</button><p className="path-preview">{result.target}</p></div>}{!result&&installation?.lastInstall&&installation.status!=='removed'&&<details className="post-install-help"><summary>{g('playNext')}</summary><ol><li>{playProfile(installation.lastInstall.target)?b('playProfile').replace('{profile}',playProfile(installation.lastInstall.target)!):g('playManager')+' '+g('playModded')}</li><li>{g('playChoose').replace('{name}',draft.name)}</li></ol><details><summary>{g('notVisible')}</summary><ul>{['helpProfile','helpMods','helpRestart','helpChanges'].map(k=><li key={k}>{g(k)}</li>)}</ul></details><button className="secondary" onClick={onContinueEditing}>{g('keepEditing')}</button></details>}<CompilerUpdates rules={rules} language={language} disabled={busy} onChange={checkCompilation}/><details className="compilation-help"><summary>{t('compileHelp')}</summary><p>{t('compileTech')}</p><a href={rules.runtime.sdkDownload} target="_blank" rel="noreferrer">{local(rules.labels.sdkDownload,language)} ↗</a></details><details className="json-details"><summary>{j('details')}</summary>{!ready&&<p>{j('notReady')}</p>}<button className="secondary" disabled={!ready||busy||jsonBusy} onClick={viewJson}>{j(jsonBusy?'loading':'button')}</button>{jsonError&&<ErrorNotice error={jsonError} rules={rules} language={language} onRetry={viewJson}/>}</details>{jsonPreview&&<JsonViewer preview={jsonPreview} rules={rules} language={language} onClose={()=>setJsonPreview(undefined)}/>}</section>{(result||installation?.lastInstall)&&<PlaytestChecklist key={installation?.lastInstall?.at??result?.target??draft.revision} draft={draft} rules={rules} language={language} persist={persist} onEdit={onEditCard}/>}<ShareClan id={draft.id} name={draft.name} rules={rules} language={language} canPlay={ready&&!compileProblem} persist={persist} disabled={busy||jsonBusy}/><BackupTools rules={rules} language={language} draft={draft} hideDownload persist={persist} onRestored={onRestored??(()=>{})}/></div>;
}
// 2026-11-15-2211||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Crear pantalla final guiada con revision requisitos manuales destino visible y boton unico de instalar sin ZIP
// 2026-11-15-2212||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Mostrar cada enlace de requisito una sola vez en el recorrido final
// 2026-11-15-2239||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Mostrar nombre de clan en destino usando la misma conversion que el instalador
// 2026-11-15-2239||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Comprobar SDK al abrir pantalla y bloquear instalacion con aviso y enlace hasta cumplir requisitos
// 2026-11-15-2341||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Anadir acceso opcional a JSON generado desde revision sin exigir SDK y manteniendo instalacion separada
// 2026-11-16-2148||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Añadir copia de seguridad y restauración independientes al finalizar el clan
// 2026-11-16-2325||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Recordar destino explicar instalación pendiente y abrir avisos de revisión concretos con errores accionables
// 2026-11-16-2330||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Confirmar instalación correcta aunque falle refresco de estado y sincronizar cabecera
// 2026-11-16-2331||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Mantener confirmación de instalación y explicar si no se pudo recordar su estado
// 2026-11-17-0023||codex-clan-editor||clan-creator/src\web\creator\local-play.tsx||Guiar prueba en el juego tras instalar con ayuda para clan ausente y retorno a edición
// 2026-11-17-2239||codex-clan-editor||clan-creator/src\web\creator\local-play.tsx||Añadir checklist manual de primera partida y avisar de carta provisional excluida de instalación
// 2026-11-17-2249||codex-clan-editor||clan-creator/src\web\creator\local-play.tsx||Actualizar checklist al terminar una reinstalación de la versión actual
// 2026-11-19-0749||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Mostrar tareas de revisión, selector de perfil y acción pendiente junto a Instalar
// 2026-11-19-0751||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Elegir perfil antes de confirmar requisitos y mostrar el bloqueo de compilación una sola vez
// 2026-11-19-0914||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Ofrecer atajos a los bloqueos y separar compartir de instalar y probar
// 2026-11-19-0915||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Retirar aviso anterior al cambiar perfil y evitar duplicar la descarga editable
// 2026-11-19-0915||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Mantener los requisitos al reintentar una instalación
// 2026-11-20-0901||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Mostrar una forma de indicar la carpeta del juego si la detección no la encuentra
// 2026-11-21-0948||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Avisar de la primera descarga antes de instalar
// 2026-11-21-0951||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Consultar versiones en segundo plano al llegar a Revision e instalacion
// 2026-11-21-1020||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Reducir la pantalla final a preparar el juego e instalar con incidencias automaticas junto a la accion
// 2026-11-21-1945||codex-clan-editor||clan-creator/src/web/creator/local-play.tsx||Mostrar un diagnóstico opcional en el perfil elegido sin abrir el explorador
