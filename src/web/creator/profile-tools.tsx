import React,{useState} from 'react';
import type {checkProfile} from '../../server/creator/check-profile';
import {local,request,type Language} from './presentation';
export function ModManagerLinks({rules,language}:{rules:any;language:Language}){const t=(key:string)=>local(rules.labels[key],language);return <ul>{rules.modManagers.map((m:any)=><li key={m.name}><a href={m.url} target="_blank" rel="noreferrer">{m.name} ↗</a>{m.status==='development'&&<span> · {t('managerDevelopment')}</span>}</li>)}</ul>;}
export function GameSetupGuide({rules,language,includePackages=true}:{rules:any;language:Language;includePackages?:boolean}){const t=(key:string)=>local(rules.labels[key],language);return <><ModManagerLinks rules={rules} language={language}/><ol><li>{t('profileGuide1')}</li>{includePackages&&<li>{t('profileGuide2')}<ul>{rules.moddingPackages.map((m:any)=><li key={m.name}><a href={m.url} target="_blank" rel="noreferrer">{m.name} ↗</a></li>)}</ul></li>}<li>{t('profileManual')}</li></ol>{rules.modSetupExample&&<figure className="mod-setup-example"><img src={rules.modSetupExample.image} alt={local(rules.modSetupExample.alt,language)} width={460} height={413} loading="lazy"/><figcaption>{local(rules.modSetupExample.caption,language)}</figcaption></figure>}</>;}

type ProfileReport=Pick<Awaited<ReturnType<typeof checkProfile>>,'packages'|'ready'>;

export function ProfileCheck({folder,rules,language,disabled}:{folder:string;rules:any;language:Language;disabled:boolean}){
 const t=(key:string)=>local(rules.localInstall.profileCheck[key],language);
 const [report,setReport]=useState<ProfileReport>();
 const [busy,setBusy]=useState(false);
 const [failed,setFailed]=useState(false);
 async function inspect(){
  setReport(undefined);
  setFailed(false);
  setBusy(true);
  try{setReport(await request<ProfileReport>('/profile-check',{folder}));}
  catch{setFailed(true);}
  finally{setBusy(false);}
 }
 return <div className="setup-instructions">
  <button type="button" className="secondary" disabled={disabled||busy} onClick={inspect}>{t(busy?'checking':report||failed?'again':'button')}</button>
  <div role="status">
   {failed&&<p className="note">{t('failed')}</p>}
   {report&&<>
    <p>{t(report.ready?'found':'action')}</p>
    <ul>{report.packages.map(pkg=><li key={pkg.id}>
     <strong>{pkg.name}</strong>{pkg.version&&' '+pkg.version}{' · '}{t(pkg.status).replace('{version}',pkg.required??'')}
    </li>)}</ul>
    <p className="muted">{t('enabled')}</p>
   </>}
  </div>
 </div>;
}

// 2026-11-15-2003||codex-clan-editor||clan-creator/src/web/creator/profile-tools.tsx||Guiar instalacion externa de requisitos y ofrecer unicamente comprobacion en ES y EN
// 2026-11-15-2122||codex-clan-editor||clan-creator/src/web/creator/profile-tools.tsx||Enlazar r2modman manteniendo aviso en desarrollo y mostrar progreso de comprobacion real
// 2026-11-15-2126||codex-clan-editor||clan-creator/src/web/creator/profile-tools.tsx||Retirar boton dialogo resultados y peticion de comprobacion; dejar instalacion manual de requisitos
// 2026-11-15-2127||codex-clan-editor||clan-creator/src/web/creator/profile-tools.tsx||Mostrar captura suministrada en Prepare the game for mods con texto accesible
// 2026-11-15-2211||codex-clan-editor||clan-creator/src/web/creator/profile-tools.tsx||Compartir guia unica de instalacion manual sin repetir enlaces y requisitos en pantalla final
// 2026-11-15-2212||codex-clan-editor||clan-creator/src/web/creator/profile-tools.tsx||Evitar repetir lista de requisitos en instrucciones desplegadas de pantalla final
// 2026-11-21-1240||codex-clan-editor||clan-creator/src/web/creator/profile-tools.tsx||Conservar la guía compartida que se usa al instalar
// 2026-11-21-1945||codex-clan-editor||clan-creator/src/web/creator/profile-tools.tsx||Mostrar el estado y la acción siguiente para cada requisito del perfil elegido
