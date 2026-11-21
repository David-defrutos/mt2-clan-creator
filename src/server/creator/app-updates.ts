import fs from 'node:fs/promises';
import {statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {applicationRoot} from '../paths.js';

const versionPattern=/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
type Version={number:number[];prerelease:string[]};
type Release={tag_name:string;draft:boolean};

function parseVersion(tag:string):Version|undefined{
 const parts=versionPattern.exec(tag);
 if(!parts)return;
 const number=parts.slice(1,4).map(Number);
 if(!number.every(Number.isSafeInteger))return;
 return {number,prerelease:parts[4]?.split('.')??[]};
}
function compare(a:Version,b:Version){
 for(const [i,n] of a.number.entries())if(n!==b.number[i])return n-b.number[i];
 if(!a.prerelease.length||!b.prerelease.length)return Number(!a.prerelease.length)-Number(!b.prerelease.length);
 for(const [i,first] of a.prerelease.entries()){
  const second=b.prerelease[i];
  if(second===undefined)return 1;
  if(first===second)continue;
  const n=/^\d+$/.test(first),m=/^\d+$/.test(second);
  if(n&&m)return first.length-second.length||(first<second?-1:1);
  if(n!==m)return n?-1:1;
  return first<second?-1:1;
 }
 return a.prerelease.length-b.prerelease.length;
}

export function appBuildId(){
 const files=['dist/index.html','dist-server/creator-server.js'];
 const stamp=files.map(file=>statSync(path.join(applicationRoot,file),{throwIfNoEntry:false})?.mtimeMs??0);
 return createHash('sha256').update(stamp.join(':')).digest('hex').slice(0,16);
}

export async function installedAppVersion(){
 const app=JSON.parse(await fs.readFile(path.join(applicationRoot,'package.json'),'utf8'));
 if(typeof app.version!=='string'||!parseVersion(app.version))throw Error('Invalid application version.');
 return app.version as string;
}

export async function checkAppUpdate(version:string,repository:string,fetchRelease=fetch){
 const current=parseVersion(version);
 if(!current||!/^[-\w]+\/[-\w.]+$/.test(repository))throw Error('Invalid application release settings.');
 const releasesUrl='https://github.com/'+repository+'/releases';
 try{
  const response=await fetchRelease('https://api.github.com/repos/'+repository+'/releases?per_page=30',{
   headers:{Accept:'application/vnd.github+json','User-Agent':'MT2-Clan-Creator/'+version},
   signal:AbortSignal.timeout(6000),
  });
  if(!response.ok)throw Error('GitHub release list failed.');
  const releases=await response.json() as Release[];
  const available=releases.flatMap(release=>{
   if(release.draft||typeof release.tag_name!=='string')return [];
   const parsed=parseVersion(release.tag_name);
   return parsed?[{tag:release.tag_name,version:parsed}]:[];
  });
  // Stable installations follow stable releases. Beta installations also see beta releases.
  const latest=available.filter(r=>current.prerelease.length||!r.version.prerelease.length)
   .sort((a,b)=>compare(b.version,a.version))[0];
  if(latest){
   const difference=compare(latest.version,current);
   const status=difference>0?'available':difference<0?'ahead':'current';
   return {status,latest:latest.tag.replace(/^v/,''),url:releasesUrl+'/tag/'+encodeURIComponent(latest.tag)};
  }
 }catch{
  // Leave the app usable when GitHub is offline, unreachable or rate-limited.
 }
 return {status:'unavailable'};
}
// 2026-11-21-1105||codex-clan-editor||clan-creator/src/server/creator/app-updates.ts||Comparar la versión instalada con las releases públicas de GitHub mediante una consulta manual
// 2026-11-21-1115||codex-clan-editor||clan-creator/src/server/creator/app-updates.ts||Identificar la compilación además del número de versión
// 2026-11-21-1115||codex-clan-editor||clan-creator/src/server/creator/app-updates.ts||Distinguir procesos iniciados antes de recompilar el asistente
