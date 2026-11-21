import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';
import {creatorRules} from '../src/server/creator/catalog.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import {importCollectionBackup} from '../src/server/creator/collection-backup.ts';
import {projectFolder} from '../src/server/creator/projects.ts';
import {ClanOverview} from '../src/web/creator/clan-overview.tsx';
import {Welcome} from '../src/web/creator/welcome.tsx';
import {blankCard,blankDraft} from '../src/server/creator/model.ts';
import {playableContent} from '../src/server/creator/workflow-state.ts';
import {cardChanges,installationChanges} from '../src/server/creator/play-changes.ts';
import {RewardsEditor,rewardDestination} from '../src/web/creator/rewards-editor.tsx';
import {costlyRewards} from '../src/web/creator/balance-advice.tsx';
import {previousDrafts,previousBackup} from '../src/web/creator/previous-folder.tsx';
import {validateDraftBackup} from '../src/server/creator/draft-backup.ts';

test('reward choices match exported pools and the level view omits excluded cards',async()=>{
 const rules=await creatorRules(),unit={...blankCard('unit','one'),name:'Guard',banner:true},outside={...unit,uid:'two',name:'Hidden',reward:false};
 assert.equal(rewardDestination(unit),'banner');
 assert.equal(rewardDestination(outside),'outside');
 assert.equal(rewardDestination(blankCard('artifact','relic')),'artifact');
 const html=renderToStaticMarkup(React.createElement(RewardsEditor,{cards:[unit,outside],rules,language:'en',onChange:()=>{},onEdit:()=>{}}));
 const preview=html.slice(html.indexOf('Player view'));assert.match(preview,/Guard/);assert.doesNotMatch(preview,/Hidden/);
});
test('install and duplicate comparisons isolate real gameplay changes including effect amounts',()=>{
 const before=blankDraft(crypto.randomUUID()),original={...blankCard('spell','one'),name:'Spark'};
 before.cards=[original];const after=structuredClone(before);after.cards[0].cost=2;after.cards[0].effects[0].amount=12;
 const diff=cardChanges(original,after.cards[0]);assert.deepEqual(diff.map(d=>[d.field,d.recipe,d.before,d.after]),[['cost',undefined,1,2],['behavior','damage',6,12]]);
 after.cards.push({...original,uid:'two',name:'Another'});after.icon='new';
 assert.deepEqual(installationChanges(playableContent(before),playableContent(after)).map(d=>d.field),['cost','behavior','added','appearance']);
});
test('cost advice links only expensive eligible reward cards',async()=>{
 const rules=await creatorRules(),d=blankDraft(crypto.randomUUID());
 for(let i=0;i<40;i++)d.cards.push({...blankCard('spell',String(i)),name:String(i),cost:6});
 d.cards.push({...blankCard('unit','outside'),name:'Outside',reward:false,cost:8});
 assert.equal(costlyRewards(d,rules).length,40);
});
test('recover previous folder validates selected draft and referenced image using existing backup format',async t=>{
 const rules=await creatorRules(),id=crypto.randomUUID(),d=blankDraft(id),name='upload/'+crypto.randomUUID()+'.png';
 d.name='Previous clan';d.icon=name;
 const png=await (await import('sharp')).default({create:{width:2,height:2,channels:4,background:'blue'}}).png().toBuffer();
 const folder='Creator/data/creator-projects/'+id+'/';
 const file=Object.assign(new File([JSON.stringify(d)],'draft.json'),{webkitRelativePath:folder+'draft.json'});
 const image=Object.assign(new File([new Uint8Array(png)],'image.png'),{webkitRelativePath:folder+name});
 const items=await previousDrafts([file,image],rules.backups.maxBytes);assert.equal(items.length,1);
 const backup=await previousBackup(items[0],new Map([[image.webkitRelativePath,image]]),rules.backups);
 const valid=await validateDraftBackup(backup);assert.equal(valid.draft.name,d.name);assert.deepEqual(valid.files[0].bytes,png);
 const restored=await importCollectionBackup({version:rules.collectionBackups.version,format:rules.collectionBackups.format,entries:[backup]},[0]);
 t.after(()=>fs.rm(projectFolder(restored[0].id),{recursive:true,force:true}));
 assert.notEqual(restored[0].id,id);assert.deepEqual(await fs.readFile(path.join(projectFolder(restored[0].id),name)),png);
 await assert.rejects(previousBackup(items[0],new Map(),rules.backups));
});
// 2026-11-19-0800||codex-clan-editor||clan-creator/tests/creator-player-workflows.test.ts||Probar recompensas, comparaciones, coste alto y recuperación con imagen real

test('home offers both actions for a pending card, and whole-clan search filters across types',async()=>{
 const rules=await creatorRules(),draft=blankDraft(crypto.randomUUID());draft.name='First clan';
 const noop=()=>{};
 const html=renderToStaticMarkup(React.createElement(Welcome,{rules,language:'en',catalog:[],projects:[{id:draft.id,name:draft.name,pendingCard:{name:'Unfinished spell'}}],onOpen:noop}));
 assert.ok(html.includes('Unfinished spell'));assert.ok(html.includes(rules.workshopGuide.enterClan.en));
 draft.cards=['unit','artifact','spell'].map((kind,i)=>({...blankCard(kind as 'unit'|'artifact'|'spell',String(i)),name:i<2?'Winter '+kind:'Sun'}));
 const overview=renderToStaticMarkup(React.createElement(ClanOverview,{draft,query:'Winter',config:{rules,catalog:{items:[]}},details:{},language:'en',onBack:noop,onEdit:noop}));
 assert.match(overview,/Winter unit/);assert.match(overview,/Winter artifact/);assert.doesNotMatch(overview,/>Sun</);
});
// 2026-11-19-0802||codex-clan-editor||clan-creator/tests/creator-player-workflows.test.ts||Verificar doble acción al retomar, búsqueda transversal y restauración con imágenes a un borrador independiente
