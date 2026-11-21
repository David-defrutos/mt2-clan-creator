import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildCommunityDraft} from '../src/server/creator/community-clans.ts';
import {communityTemplates} from '../src/server/creator/community-templates.ts';
import {catalogRoot,creatorRules,readExample,cloneExampleCard,exampleList,exampleParameters,applyExampleParameters} from '../src/server/creator/catalog.ts';
import {generateClan,reviewDraft} from '../src/server/creator/export.ts';
import {FirstClanDialog} from '../src/web/creator/welcome.tsx';

import {TemplateEffectsEditor} from '../src/web/creator/template-effects-editor.tsx';
import {description} from '../src/web/creator/presentation.ts';
import {templateEffects} from '../src/server/creator/template-effects.ts';

test('Inception preserves the chosen ally and edits attack and maximum health independently',async()=>{
 const rules=await creatorRules(),draft=await buildCommunityDraft('succclan');
 const card=draft.starters.find(card=>card.templateId==='succclan-Inception-simplified')!;
 const example=await readExample(card.templateId!),parameters=exampleParameters(example);
 const attack=parameters.find(p=>p.path.at(-1)==='bonus_damage')!,health=parameters.find(p=>p.path.at(-1)==='bonus_hp')!;
 card.parameters[attack.key]=7;
 card.parameters[health.key]=4;
 const text=description(card,{example,parameters},'en',rules);
 assert.match(text,/\+7 attack/i);
 assert.match(text,/\+4 maximum health/i);
 assert.doesNotMatch(text,/Upgrade units|Psionic/i);
 const html=renderToStaticMarkup(React.createElement(TemplateEffectsEditor,{
  card,template:{example,parameters},rules,language:'en',onChange:()=>{},
 }));
 assert.match(html,/The unit receiving the card/);
 assert.match(html,/value="friendly" selected=""/);
 const generated=await generateClan(draft,card.uid);
 const doc=JSON.parse(generated.cardJson);
 const selected=doc.effects.find(effect=>effect.target_mode==='drop_target_character');
 assert.equal(selected.target_team,'monsters');
 assert.ok(doc.upgrades.some(upgrade=>upgrade.bonus_damage===7));
 assert.ok(doc.upgrades.some(upgrade=>upgrade.bonus_hp===4));
 const first=templateEffects(example.document,example.root).find(row=>row.index===0)!;
 card.removedTemplateEffects=[first.key];
 const remaining=applyExampleParameters(example,card);
 const root=remaining.cards.find(row=>row.id===example.root.id)!;
 const effect=remaining.effects.find(row=>'@'+row.id===root.effects[0])!;
 assert.equal(effect.target_mode,'drop_target_character');
 assert.equal(effect.target_team,'monsters');
});

test('community copies retain audited mechanics and artwork and mark simplified content',async()=>{
 const templates=await communityTemplates(catalogRoot);
 assert.deepEqual(templates.map(clan=>clan.id),['freecompany','succclan','ww']);
 for(const template of templates){
  const draft=await buildCommunityDraft(template.id,'es');
  assert.equal(draft.communityTemplate,template.id);
  assert.equal(draft.name,'Copia de '+template.name);
  assert.deepEqual(draft.cards.map(({templateId,banner,reward,unlockLevel})=>({templateId,banner,reward,unlockLevel})),template.cards);
  assert.deepEqual(draft.champions.map(c=>c.card.templateId??null),template.champions.map(c=>c.card));
  assert.deepEqual(draft.starters.map(c=>c.templateId??null),template.champions.map(c=>c.starter));
  assert.deepEqual(draft.champions.map(c=>c.paths.map(p=>p.levels[0].native?.templateId??null)),template.champions.map(c=>c.paths));
  for(const art of [...Object.values(draft.artwork??{}).map(a=>a.image),draft.icon]){
   assert.ok(art);
   const bytes=await fs.readFile(path.join(catalogRoot,art));
   assert.equal(createHash('sha256').update(bytes).digest('hex'),path.basename(art,'.png'));
  }
  for(const card of draft.cards){
   const example=await readExample(card.templateId!);
   assert.ok(!example.legacy);
   assert.ok(!example.document[example.root.section].find(d=>d.id===example.root.id)?.hide_in_logbook);
  }
  assert.ok((await reviewDraft(draft)).some(issue=>issue.field==='effects'));
  assert.ok(draft.champions.every(c=>c.card.name&&c.paths.every(p=>p.name)));
  assert.ok(draft.starters.every(c=>c.name));
 }
 const free=await buildCommunityDraft('freecompany');
 const succ=await buildCommunityDraft('succclan');
 const ww=await buildCommunityDraft('ww');
 assert.deepEqual([free,succ,ww].map(d=>d.cards.filter(c=>c.banner).length),[9,9,9]);
 assert.deepEqual(succ.champions[1].paths.map(p=>p.name),['Blood Thirsty','Plague','Profanity']);
 assert.equal(ww.starters[0].name,'Wizard Affairs Chaperon');
 assert.equal(ww.starters[1].name,'Witch Affairs Chaperone');
 const roderic=await readExample(free.champions[0].card.templateId!);
 assert.ok(roderic.simplified&&roderic.characterPicture);
 assert.equal(roderic.attack,10);
 assert.equal(roderic.health,36);
 assert.ok(!roderic.document.game_objects.some(art=>art.extensions?.character_art?.animations?.length));
 const intern=await readExample(ww.cards.find(c=>c.templateId==='ww-WW_U10-simplified')!.templateId!);
 assert.ok(intern.characterPicture);
 assert.doesNotMatch(JSON.stringify(intern.document),/CardEffectAcademicConsumeCredits|StatusEffectAcademicInsurance/);
 await assert.rejects(buildCommunityDraft('unavailable'),/available community clan/);
});

test('the three community copies export their art and compatible paths after completing missing effects',async()=>{
 const officialEquipment=(await exampleList()).items.find(e=>e.official&&e.kind==='equipment'&&!e.legacy)!;
 const equipment=await readExample(officialEquipment.id);
 for(const id of ['freecompany','succclan','ww']){
  const draft=await buildCommunityDraft(id);
  for(const card of [...draft.starters,...draft.cards]){
   const example=await readExample(card.templateId!);
   if(!example.simplified?.needsEffect)continue;
   if(card.kind==='spell')card.effects=[{recipe:'damage',amount:6,target:'enemy',when:'on_spawn'}];
   if(card.kind==='artifact')card.passive={recipe:'relic_ember',amount:1};
   if(card.kind==='room')card.passive={recipe:'room_avarice',amount:1};
   if(card.kind==='equipment')Object.assign(card,{
    ...cloneExampleCard(equipment,card.uid,'en'),name:card.name,appearanceTemplateId:example.id,
    cost:card.cost,reward:card.reward,unlockLevel:card.unlockLevel,
   });
  }
  const result=await generateClan(draft);
  try{
   assert.ok(!result.validation.some(v=>v.severity==='error'),id);
   const base=JSON.parse((await fs.readFile(path.join(result.root,'json/clan.json'),'utf8')).replace(/^\uFEFF/,''));
   assert.equal(base.classes[0].champions[1].upgrade_tree.length,3);
   if(id==='succclan'){
    assert.match(base.classes[0].champions[1].icon,/CustomArt_champion2_icon/);
    const doc=JSON.parse((await fs.readFile(path.join(result.root,'json/cards.json'),'utf8')).replace(/^\uFEFF/,''));
    assert.ok(doc.upgrades.find(u=>u.id==='Champion1Path0Level0').trigger_upgrades.length);
   }
   const banner=await fs.readFile(path.join(result.root,'textures/CustomArt_banner_enabled_sprite.png'));
   assert.deepEqual(banner,await fs.readFile(path.join(catalogRoot,draft.artwork!['banner-enabled_sprite'].image!)));
  }finally{
   await fs.rm(result.root,{recursive:true,force:true});
  }
 }
});

test('the create clan dialog offers all three examples in English and Spanish',async()=>{
 const rules=await creatorRules(),noOp=()=>{};
 for(const language of ['en','es'] as const){
  const html=renderToStaticMarkup(React.createElement(FirstClanDialog,{
   rules,language,expansions:undefined,busy:false,onClose:noOp,onNew:noOp,onOfficial:noOp,onCommunity:noOp,
  }));
  assert.ok(html.includes('<h2>'+rules.communityClanText.title[language]+'</h2>'));
  assert.ok(html.includes(rules.communityClanText.authorInvitation[language].replace('{contact}',rules.welcome.contactName)));
  assert.ok(html.includes('<h2>'+rules.labels.officialClanTitle[language]+'</h2>'));
  for(const id of ['freecompany','succclan','ww'])assert.ok(html.includes('value="'+id+'"'));
 }
});
// 2026-11-21-1048||codex-clan-editor||clan-creator/tests/creator-community-clans.test.ts||Probar importación, huecos, arte, sendas exportadas y selector bilingüe de los tres clanes
// 2026-11-21-1048||codex-clan-editor||clan-creator/tests/creator-community-clans.test.ts||Leer el JSON exportado con BOM en la comprobación de sendas y estandarte
// 2026-11-21-1051||codex-clan-editor||clan-creator/tests/creator-community-clans.test.ts||Exportar las tres copias completas de prueba, comprobar el arte y un disparador de senda nativo
// 2026-11-21-1102||codex-clan-editor||clan-creator/tests/creator-community-clans.test.ts||Probar campeones y sendas recuperados, recorte del código propio y exportación al completar efectos
// 2026-11-21-1247||codex-clan-editor||clan-creator/tests/creator-community-clans.test.ts||Probar cantidades editables, vistas y destinatario recuperado de Inception
// 2026-11-21-1257||codex-clan-editor||clan-creator/tests/creator-community-clans.test.ts||Comprobar el selector de objetivo editable junto al efecto encadenado de Inception
// 2026-11-21-1602||codex-clan-editor||clan-creator/tests/creator-community-clans.test.ts||Comprobar que la invitación del selector incluye el contacto en los dos idiomas
