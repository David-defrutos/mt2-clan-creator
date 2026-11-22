import {CommunityClanNotice} from './community-clan-notice';
import {OpenClanDialog} from './open-clan';
import {BulkRemoval,registeredInstalls,type BulkRemovalMode,type RemovalItem} from './bulk-removal';
import {resumeName} from '../../server/creator/navigation-state';
import {ExpansionSettings,type ExpansionChoices} from './expansions';
import {ErrorNotice} from './error-notice';
import {installStatusKey} from './install-status';
import {BackupTools} from './backup-tools';
import {ClanRemoval} from './clan-removal';
import React,{useState,useEffect,useRef} from 'react';
import {local,request,type Language} from './presentation';
type OfficialClan = {
 id:string;
 name:{en:string;es:string};
 cards:number;
 requiredDlc?:string|null;
};
interface OfficialClanPickerProps {
 rules:any;
 language:Language;
 expansions:ExpansionChoices|undefined;
 busy:boolean;
 onOfficial:(id:string)=>void;
}

function OfficialClanPicker({rules,language,expansions,busy,onOfficial}:OfficialClanPickerProps){
 const [selected,setSelected]=useState('');
 const t=(key:string)=>local(rules.labels[key],language);
 const clans=(rules.officialClanTemplates as OfficialClan[]).filter(clan=>
  !clan.requiredDlc||expansions?.owned.includes(clan.requiredDlc));
 const official=clans.find(clan=>clan.id===selected);
 return <details name="clan-example-source" className="surface official-clan-start">
  <summary><h2>{t('officialClanTitle')}</h2></summary>
  <p>{t('officialClanHelp')}</p>
  <label className="field">
   <span>{t('officialClanSelect')}</span>
   <select value={official?.id??''} disabled={busy} onChange={e=>setSelected(e.target.value)}>
    <option value="">{t('officialClanSelect')}</option>
    {clans.map(clan=><option key={clan.id} value={clan.id}>{local(clan.name,language)}</option>)}
   </select>
  </label>
  {official&&<p>{t('officialClanContents').replace('{cards}',String(official.cards))}{official.requiredDlc&&<> {t('officialClanDlc')}</>}</p>}
  <button className="secondary" disabled={busy||!official} onClick={()=>{if(official)onOfficial(official.id);}}>{t('officialClanLoad')}</button>
 </details>;
}

function CommunityClanPicker({rules,language,busy,onLoad}:Pick<OfficialClanPickerProps,'rules'|'language'|'busy'> & {onLoad:(id:string)=>void}){
 const [selected,setSelected]=useState('');
 const clans=(rules.communityClanTemplates??[]) as {id:string;name:string;version:string;cards:number;champions:number;paths:number;starters:number;bannerUnits:number;simplified:number}[];
 if(!clans.length)return null;
 const t=(key:string)=>local(rules.communityClanText[key],language);
 const clan=clans.find(clan=>clan.id===selected);
 const coverage=clan&&t('coverage').replace('{cards}',String(clan.cards)).replace('{champions}',String(clan.champions))
  .replace('{paths}',String(clan.paths)).replace('{starters}',String(clan.starters)).replace('{bannerUnits}',String(clan.bannerUnits));
 return <details name="clan-example-source" className="surface official-clan-start">
  <summary><h2>{t('title')}</h2></summary>
  <label className="field">
   <span>{t('select')}</span>
   <select value={selected} disabled={busy} onChange={event=>setSelected(event.target.value)}>
    <option value="">{t('select')}</option>
    {clans.map(clan=><option key={clan.id} value={clan.id}>{clan.name} · {clan.version}</option>)}
   </select>
  </label>
  {clan&&<><p>{coverage}{clan.simplified>0&&<> · {t('simplifiedCount').replace('{count}',String(clan.simplified))}</>}</p><div className="note"><CommunityClanNotice rules={rules} language={language}/></div></>}
  <button className="secondary" disabled={busy||!clan} onClick={()=>{if(clan)onLoad(clan.id);}}>{t('load')}</button>
  <p>{t('authorInvitation').replace('{contact}',rules.welcome.contactName)}</p>
 </details>;
}

export function FirstClanDialog({onClose,onNew,onCommunity,...picker}:OfficialClanPickerProps & {onClose:()=>void;onNew:()=>void;onCommunity?:(id:string)=>void}){
 const {rules,language,busy,onOfficial}=picker;
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dialog=ref.current;
  dialog?.showModal();
  return ()=>dialog?.close();
 },[]);
 return <dialog ref={ref} className="replacement-dialog first-clan-dialog" aria-labelledby="first-clan-title" onCancel={event=>{event.preventDefault();onClose();}}>
  <h2 id="first-clan-title">{local(rules.labels.new,language)}</h2>
  <p>{local(rules.usabilityText.startQuestion,language)}</p>
  <button className="primary" disabled={busy} onClick={()=>{onClose();onNew();}}>{local(rules.labels.empty,language)}</button>
  <OfficialClanPicker {...picker} onOfficial={id=>{onClose();onOfficial(id);}}/>
  {onCommunity&&<CommunityClanPicker rules={rules} language={language} busy={busy} onLoad={id=>{onClose();onCommunity(id);}}/>}
  <div className="dialog-actions"><button className="secondary" onClick={onClose}>{local(rules.labels.cancel,language)}</button></div>
 </dialog>;
}

export function Welcome({expansions,onExpansions,rules,catalog,language,projects,busy,onNew,onRestored,onOfficial,onCommunity,onOpen,onDuplicate,onProjectsChanged}:any){
 const releaseRepository=rules.appUpdate?.repository;
 const [bulk,setBulk]=useState<{mode:BulkRemovalMode;items:RemovalItem[]}>();
 const [firstClan,setFirstClan]=useState(false);
 const [openClan,setOpenClan]=useState(false);
 const [removing,setRemoving]=useState<any>(),[deleted,setDeleted]=useState<any[]>([]),[message,setMessage]=useState(''),[error,setError]=useState<any>();useEffect(()=>{request('/deleted-projects').then(setDeleted).catch(()=>{});},[projects]);const installed=registeredInstalls([...projects,...deleted]);const removalText=(key:string)=>local(rules.clanRemoval[key],language);const copy=rules.welcome,t=(key:string)=>local(rules.labels[key],language),text=(value:any)=>local(value,language as Language);
 return <main className="welcome">{projects.length>0&&<section className="surface resume-latest"><span className="eyebrow">{text(rules.round4Text.resumeLatest)}</span><h1>{projects[0].name||t('new')}</h1><p>{resumeName(projects[0],rules,language)}</p>{projects[0].pendingCard&&<button className="primary large" disabled={busy} onClick={()=>onOpen(projects[0].id,true)}>{text(rules.simpleArtText.resumeCard)} · {projects[0].pendingCard.name}</button>}<button className={projects[0].pendingCard?'secondary':'primary large'} disabled={busy} onClick={()=>onOpen(projects[0].id)}>{text(projects[0].pendingCard?rules.workshopGuide.enterClan:rules.round4Text.continueClan)} →</button></section>}<section className="hero"><div><h1>{t('app')}<em>Monster Train 2</em></h1><p>{text(copy.description)}</p><button className={projects.length?'secondary':'primary large'} onClick={()=>setFirstClan(true)} disabled={busy} aria-haspopup="dialog">{t('new')} <span>→</span></button><button className="secondary" onClick={()=>setOpenClan(true)} disabled={busy} aria-haspopup="dialog">{text(rules.openClan.title)}</button></div><div className="hero-art" aria-hidden="true">{catalog.filter((e:any)=>e.kind==='unit'&&e.picture).slice(0,3).map((e:any,i:number)=><div className={'sample sample-'+i} key={e.id}><img src={'/catalog/'+e.picture}/><span>{e.names[language==='es'?'spanish':'english']??e.names.english}</span></div>)}</div></section>
 {openClan&&<OpenClanDialog rules={rules} language={language} projects={projects} onClose={()=>setOpenClan(false)} onOpen={onOpen} onDuplicate={onDuplicate} onRestored={onRestored}/>}
 {expansions&&<ExpansionSettings rules={rules} language={language} value={expansions} onChange={onExpansions}/>}{firstClan&&<FirstClanDialog rules={rules} language={language} expansions={expansions} busy={busy} onClose={()=>setFirstClan(false)} onNew={onNew} onOfficial={onOfficial} onCommunity={onCommunity}/>}<section className="how">{copy.steps.map((step:any,i:number)=><div key={i}><b>{String(i+1).padStart(2,'0')}</b><h2>{text(step.title)}</h2><p>{text(step.description)}</p></div>)}</section>
 <section className="welcome-support"><h2>{text(copy.supportTitle)}</h2><p>{text(copy.contactLabel)}: <strong>{copy.contactName}</strong></p><a href={copy.discordUrl} target="_blank" rel="noreferrer">{text(copy.discordLabel)} ↗</a></section>
 <section className="saved-projects"><h2>{t('drafts')}</h2>{(projects.length>0||installed.length>0)&&<div className="dialog-actions">
 <button className="secondary danger" disabled={busy||!installed.length} onClick={()=>setBulk({mode:'uninstall',items:installed})}>{text(rules.bulkRemoval.uninstall)}</button>
 <button className="secondary danger" disabled={busy||!projects.length} onClick={()=>setBulk({mode:'trash',items:projects})}>{text(rules.bulkRemoval.trash)}</button>
 </div>}{!projects.length?<p>{t('noDrafts')}</p>:<div className="project-list">{projects.map((p:any)=><div className="project-entry" key={p.id}><button onClick={()=>onOpen(p.id)} disabled={busy}><span className="project-icon">✦</span><span><strong>{p.name||t('new')}</strong>{p.view&&<small>{text(rules.guidedText.resume)}: {resumeName(p,rules,language)}</small>}<small>{t('savedTime')}: {new Date(p.updatedAt).toLocaleString(language)}</small>{p.restoredAt&&<small className="restored-copy-label">{text(rules.beginnerText.restoredCopy)} · {new Date(p.restoredAt).toLocaleDateString(language)}</small>}{p.status&&<small className={'project-install-state '+p.status}>{text(rules.beginnerText[installStatusKey(p.status,true)])}</small>}</span><span>→</span></button><button className="quiet danger" disabled={busy} aria-label={removalText('button')+' · '+(p.name||t('new'))} onClick={()=>setRemoving(p)}>{removalText('button')}</button></div>)}</div>}</section>{message&&<p className="success" role="status">{message}</p>}{error&&<ErrorNotice error={error} rules={rules} language={language}/>}{deleted.length>0&&<details className="surface deleted-drafts"><summary>{removalText('deletedTitle')} ({deleted.length})</summary><p>{removalText('deletedHelp')}</p>{deleted.map(p=><div className="deleted-project" key={p.id}><strong>{p.name||t('new')}</strong><button className="secondary" disabled={busy} onClick={async()=>{try{setError(undefined);await request('/projects/'+p.id+'/restore-draft',{});setMessage(removalText('restored'));await onProjectsChanged();}catch(e){setError(e);}}}>{removalText('restore')}</button><button className="quiet danger" disabled={busy} onClick={()=>setRemoving(p)}>{removalText('gameTitle')}</button></div>)}</details>}{removing&&<ClanRemoval project={removing} rules={rules} language={language} onClose={()=>setRemoving(undefined)} onChanged={onProjectsChanged}/>}
 {bulk&&<BulkRemoval mode={bulk.mode} items={bulk.items} rules={rules} language={language} onClose={()=>setBulk(undefined)} onChanged={onProjectsChanged}/>}
 <BackupTools rules={rules} language={language} projects={projects} onRestored={onRestored} onAllRestored={onProjectsChanged}/><footer className="welcome-credits"><h2>{text(copy.creditsTitle)}</h2><p>{text(copy.credits)}</p><p>{text(copy.thanks)}</p><ul>{copy.contributors.map((person:{name:string;github:string})=><li key={person.github}>
 <a href={'https://github.com/'+person.github} target="_blank" rel="noreferrer">{person.name}</a>
 </li>)}</ul><div>{releaseRepository&&<><a href={'https://github.com/'+releaseRepository+'/releases'} target="_blank" rel="noreferrer">{text(rules.appUpdate.releases)} ↗</a><a href={'https://github.com/'+releaseRepository} target="_blank" rel="noreferrer">{text(rules.appUpdate.source)} ↗</a></>}{copy.tools.map((tool:any)=><a key={tool.name} href={tool.url} target="_blank" rel="noreferrer">{tool.name} ↗</a>)}</div></footer></main>;
}
// 2026-11-15-1400||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Añadir portada sobria con contacto, enlace Discord y atribución a Trainworks y Conductor
// 2026-11-15-1421||codex-clan-editor||clan-creator/src\web\creator\welcome.tsx||Instalar herramientas desde la portada sin crear un clan primero
// 2026-11-15-1925||codex-clan-editor||clan-creator/src\web\creator\welcome.tsx||Mostrar una sola línea de contacto sin nombre y usuario duplicados
// 2026-11-15-2009||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Ofrecer carga de clan oficial completo desde la portada con seleccion sencilla
// 2026-11-15-2301||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Anadir botones por clan y lista de borradores borrados con restauracion y desinstalacion accesibles
// 2026-11-16-2148||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Ofrecer primer clan listo para personalizar y respaldo restauración desde portada
// 2026-11-16-2157||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Priorizar primer clan guiado en portada y mantener creación vacía visible sin bloque repetido
// 2026-11-16-2325||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Distinguir copias restauradas y estado registrado de instalación en la lista de clanes
// 2026-11-16-2340||codex-clan-editor||clan-creator/src\web\creator\welcome.tsx||Mostrar errores de restauración borrada con ayuda localizada y detalle técnico plegado
// 2026-11-17-0022||codex-clan-editor||clan-creator/src\web\creator\welcome.tsx||Mostrar continuar con última carta o nivel y preferencias de expansiones en portada
// 2026-11-17-0024||codex-clan-editor||clan-creator/src\web\creator\welcome.tsx||Impedir cargar selección DLC oculta tras cambiar filtro de expansiones
// 2026-11-17-1849||codex-clan-editor||clan-creator/src\web\creator\welcome.tsx||Priorizar continuación del último borrador antes de crear un clan nuevo
// 2026-11-17-1851||codex-clan-editor||clan-creator/src\web\creator\welcome.tsx||Actualizar lista de borradores después de restaurar copias múltiples
// 2026-11-19-0751||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Priorizar continuar cuando hay borradores y explicar el clan preparado
// 2026-11-19-0758||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Ofrecer retomar la carta o entrar en el clan desde portada
// 2026-11-19-0759||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Añadir recuperación desde otra versión al inicio
// 2026-11-19-2223||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Mostrar Desinstalar todos y Borrar todos los borradores junto a los clanes guardados
// 2026-11-19-2226||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Retirar de la portada el acceso a recuperación desde una instalación anterior
// 2026-11-21-1006||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Ofrecer clan preparado o copia oficial desde Crear mi primer clan y reutilizar el selector de portada
// 2026-11-21-1011||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Ofrecer solo un clan nuevo desde cero o una copia oficial desde el primer recorrido
// 2026-11-21-1013||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Mostrar Crear mi clan en portada y preguntar como empezar dentro del asistente
// 2026-11-21-1046||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Ofrecer clanes de comunidad en Crear mi clan con cobertura y aviso
// 2026-11-21-1052||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Mostrar en el selector el número de unidades de estandarte
// 2026-11-21-1052||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Completar el recuento de plantilla con las unidades del estandarte
// 2026-11-21-1101||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Presentar los tres clanes comunitarios en la misma pantalla que los oficiales
// 2026-11-21-1105||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Colocar la versión y sus enlaces en la pantalla principal
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Añadir el diálogo de apertura de clanes a la portada
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Conectar la duplicación de clanes desde la portada
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Guardar si el usuario está abriendo un clan guardado
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Dar acceso directo a abrir un clan junto a crear uno
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Abrir el selector de borradores o archivo editable
// 2026-11-21-1118||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Mostrar los dos tipos de ejemplos a la vez sin tener que desplazarse
// 2026-11-21-1223||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Dejar los enlaces generales a GitHub y descargas con los créditos de la portada
// 2026-11-21-1227||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Mostrar los perfiles públicos y el Discord confirmado de Brandon en los agradecimientos
// 2026-11-21-1229||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Mostrar solo los nombres de GitHub en los agradecimientos, en orden alfabético
// 2026-11-21-1240||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Retirar la guía duplicada de preparación del juego de la portada
// 2026-11-21-1243||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Mostrar el aviso antes de abrir una copia editable
// 2026-11-21-1602||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Mostrar la invitación con el contacto de Discord en el selector de clanes de la comunidad
// 2026-11-22-0949||codex-clan-editor||clan-creator/src/web/creator/welcome.tsx||Mostrar clanes DLC solo cuando la expansión correspondiente está marcada, issue 1
