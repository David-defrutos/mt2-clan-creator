import fs from 'node:fs/promises';
import path from 'node:path';

export interface CommunityTemplate {
 id:string;
 name:string;
 version:string;
 excluded:number;
 simplified?:number;
 champions:{name:string;card:string|null;paths:(string|null)[];starterName:string;starter:string|null}[];
 cards:{templateId:string;banner:boolean;reward:boolean;unlockLevel:number}[];
 artwork:Record<string,{image:string;scale?:number;positionY?:number}>;
 logo?:string;
}

export async function communityTemplates(catalogRoot:string):Promise<CommunityTemplate[]>{
 try{
  const manifest=JSON.parse(await fs.readFile(path.join(catalogRoot,'community-clans.json'),'utf8'));
  if(manifest.schemaVersion!==1||!Array.isArray(manifest.clans))throw Error('Invalid community clan catalog.');
  return manifest.clans;
 }catch(error){
  if((error as NodeJS.ErrnoException).code==='ENOENT')return [];
  throw error;
 }
}

export function communitySummary(clan:CommunityTemplate){
 return {id:clan.id,name:clan.name,version:clan.version,cards:clan.cards.length,
  champions:clan.champions.filter(champion=>champion.card).length,
  paths:clan.champions.flatMap(champion=>champion.paths).filter(Boolean).length,
  starters:clan.champions.filter(champion=>champion.starter).length,
  bannerUnits:clan.cards.filter(card=>card.banner).length,
  simplified:clan.simplified??0,
  excluded:clan.excluded};
}
// 2026-11-21-1045||codex-clan-editor||clan-creator/src/server/creator/community-templates.ts||Leer el índice local de clanes de la comunidad y resumir su cobertura
// 2026-11-21-1052||codex-clan-editor||clan-creator/src/server/creator/community-templates.ts||Indicar las unidades de estandarte disponibles antes de copiar el clan
// 2026-11-21-1101||codex-clan-editor||clan-creator/src/server/creator/community-templates.ts||Exponer el número de bases simplificadas por clan
