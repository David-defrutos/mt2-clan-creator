import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {creatorRules} from './catalog.js';
export interface LocalProfile {name:string; folder:string}

export async function thunderstoreProfiles(appData=process.env.APPDATA):Promise<LocalProfile[]> {
 if(!appData)return [];
 const root=path.join(appData,'Thunderstore Mod Manager','DataFolder','MonsterTrain2','profiles');
 const entries=await fs.readdir(root,{withFileTypes:true}).catch(()=>[]);
 const profiles=await Promise.all(entries.filter(entry=>entry.isDirectory()).map(async entry=>{
  const folder=path.join(root,entry.name,'BepInEx','plugins');
  const stat=await fs.stat(folder).catch(()=>null);
  return stat?.isDirectory()?{name:entry.name,folder}:null;
 }));
 return profiles.filter((profile):profile is LocalProfile=>profile!==null).sort((a,b)=>a.name.localeCompare(b.name));
}

export async function suggestedLocalDestination(){
 const profiles=await thunderstoreProfiles();
 const rules=await creatorRules();
 for(const pattern of rules.localInstall.defaultDirectories){
  if(pattern.includes('{APPDATA}')&&!process.env.APPDATA)continue;
  const folder=path.resolve(pattern.replaceAll('{APPDATA}',process.env.APPDATA??'').replaceAll('{HOME}',os.homedir()));
  const stat=await fs.stat(folder).catch(()=>null);
  if(stat?.isDirectory())return {folder,profiles};
 }
 return {folder:'',profiles};
}
// 2026-11-15-2211||codex-clan-editor||clan-creator/src/server/creator/local-destination.ts||Sugerir solo carpeta Thunderstore existente sin inspeccionar ni instalar requisitos
// 2026-11-19-0749||codex-clan-editor||clan-creator/src/server/creator/local-destination.ts||Enumerar perfiles de Thunderstore por nombre sin comprobar dependencias
