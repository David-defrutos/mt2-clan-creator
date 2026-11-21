import {randomUUID} from 'node:crypto';
import {catalogRoot,cloneExampleCard,creatorRules,readExample} from './catalog.js';
import {communityTemplates} from './community-templates.js';
import {blankDraft,nativePathDraft} from './model.js';
import {newDraft,saveDraft,validateDraftShape} from './projects.js';

export async function buildCommunityDraft(id:string,language='en'){
 const entry=(await communityTemplates(catalogRoot)).find(clan=>clan.id===id);
 if(!entry)throw Error('Choose an available community clan.');
 const draft=blankDraft(randomUUID());
 draft.communityTemplate=entry.id;
 draft.name=(language==='es'?'Copia de ':'Copy of ')+entry.name;
 draft.icon=entry.logo;
 const stoneExamples=(await creatorRules()).stones.examples[entry.id];
 if(stoneExamples)draft.stones=stoneExamples.map((stone:any)=>({...stone,name:stone.name[language]??stone.name.en}));
 draft.artwork=Object.fromEntries(Object.entries(entry.artwork).map(([key,art])=>[key,{...art,brief:''}]));
 await Promise.all(entry.champions.map(async (spec,i)=>{
  const champion=draft.champions[i];
  if(spec.card){
   champion.card={...cloneExampleCard(await readExample(spec.card),champion.card.uid,language),pathInTree:true};
   champion.paths=await Promise.all(spec.paths.map(async (id,j)=>{
    if(!id)return champion.paths[j];
    const selected=nativePathDraft(await readExample(id),language);
    if(!selected)throw Error('Incomplete community champion path.');
    return selected;
   }));
  }
  if(spec.starter)draft.starters[i]=cloneExampleCard(await readExample(spec.starter),draft.starters[i].uid,language);
  else draft.starters[i].effects=[];
 }));
 draft.cards=await Promise.all(entry.cards.map(async (spec,i)=>{
  const card=cloneExampleCard(await readExample(spec.templateId),'card-'+i,language);
  return {...card,banner:spec.banner,reward:spec.reward,unlockLevel:spec.unlockLevel};
 }));
 await validateDraftShape(draft);
 return draft;
}

export async function createCommunityDraft(id:string,language='en'){
 const copy=await buildCommunityDraft(id,language);
 const empty=await newDraft();
 return saveDraft({...copy,id:empty.id,revision:empty.revision,updatedAt:empty.updatedAt});
}
// 2026-11-21-1045||codex-clan-editor||clan-creator/src/server/creator/community-clans.ts||Crear una copia editable con las cartas, sendas y arte compatibles de cada clan
// 2026-11-21-1333||codex-clan-editor||clan-creator/src/server/creator/community-clans.ts||Cargar las recetas de piedra con los ejemplos comunitarios
// 2026-11-21-1333||codex-clan-editor||clan-creator/src/server/creator/community-clans.ts||Cargar las dos mejoras de SuccClan al abrir una copia para aprender
