import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {projectRoot} from '../paths.js';
import {blankDraft,nativePathDraft} from './model.js';
import {readExample,cloneExampleCard} from './catalog.js';
import {newDraft,saveDraft,validateDraftShape} from './projects.js';
export async function officialTemplates(){return JSON.parse(await fs.readFile(path.join(projectRoot,'config/official-clans.json'),'utf8')).clans as any[];}
export async function buildOfficialDraft(id:string,language='es'){
 const entry=(await officialTemplates()).find(c=>c.id===id);if(!entry)throw Error('Elige uno de los clanes oficiales disponibles.');
 const d=blankDraft(randomUUID());d.name=(language==='es'?'Copia de ':'Copy of ')+entry.name[language];d.description=language==='es'?'Copia editable para aprender y crear mi propio clan.':'Editable copy for learning and creating my own clan.';
 for(const [i,spec]of entry.champions.entries()){const examples=await Promise.all(spec.paths.map((id:string)=>readExample(id)));d.champions[i]={card:{...cloneExampleCard(examples[0],'champion-'+i,language),name:(await readExample(spec.baseId)).names[language==='es'?'spanish':'english'],cost:0,pathInTree:true},paths:examples.map(e=>nativePathDraft(e,language)!)};d.starters[i]=cloneExampleCard(await readExample(spec.starterId),'starter-'+i,language);}
 for(const [i,spec]of entry.cards.entries()){const e=await readExample(spec.templateId),c=cloneExampleCard(e,'card-'+i,language);d.cards.push({...c,banner:spec.banner,reward:spec.reward,unlockLevel:spec.unlockLevel});}
 await validateDraftShape(d);return d;
}
export async function createOfficialDraft(id:string,language='es'){const copy=await buildOfficialDraft(id,language),empty=await newDraft();return saveDraft({...copy,id:empty.id,revision:empty.revision,updatedAt:empty.updatedAt});}
// 2026-11-15-2009||codex-clan-editor||clan-creator/src/server/creator/official-clans.ts||Cargar clan oficial como borrador independiente con dos campeones seis sendas iniciales cartas y reliquias
// 2026-11-16-2040||codex-clan-editor||clan-creator/src/server/creator/official-clans.ts||No añadir autor ficticio al cargar una copia oficial
