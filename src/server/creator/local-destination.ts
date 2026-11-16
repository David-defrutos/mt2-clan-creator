import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {creatorRules} from './catalog.js';
export async function suggestedLocalDestination(){const rules=await creatorRules();for(const pattern of rules.localInstall.defaultDirectories){if(pattern.includes('{APPDATA}')&&!process.env.APPDATA)continue;const folder=path.resolve(pattern.replaceAll('{APPDATA}',process.env.APPDATA??'').replaceAll('{HOME}',os.homedir()));const stat=await fs.stat(folder).catch(()=>null);if(stat?.isDirectory())return {folder};}return {folder:''};}
// 2026-11-15-2211||codex-clan-editor||clan-creator/src/server/creator/local-destination.ts||Sugerir solo carpeta Thunderstore existente sin inspeccionar ni instalar requisitos
