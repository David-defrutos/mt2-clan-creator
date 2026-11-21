import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildOfficialDraft} from '../src/server/creator/official-clans.ts';
import {buildCommunityDraft} from '../src/server/creator/community-clans.ts';
import {catalogRoot,cloneExampleCard,creatorRules,exampleList,readExample} from '../src/server/creator/catalog.ts';
import {generateClan} from '../src/server/creator/export.ts';
import {validateDraftShape} from '../src/server/creator/projects.ts';
import {CardPreview} from '../src/web/creator/card-preview.tsx';
import {ClanAssets} from '../src/web/creator/clan-assets.tsx';

test('official artifact and clan icons are available in the browser and generated artifact',async t=>{
 const rules=await creatorRules(),catalog=await exampleList();
 const example=await readExample('official-relic-PartFactory');
 if(!example.picture||!rules.officialClanIcons.awoken){t.skip('Official preview asset extraction unavailable');return;}
 const partFactory=cloneExampleCard(example,'part-factory','en');
 const html=renderToStaticMarkup(React.createElement(CardPreview,{card:partFactory,config:{rules,catalog},language:'en',projectId:''}));
 assert.ok(html.includes('/catalog/'+example.picture));
 assert.notEqual(example.detailPicture,example.picture);
 for(const file of [example.picture,example.detailPicture,rules.officialClanIcons.awoken.large])await fs.access(path.join(catalogRoot,file!));
 const draft=await buildOfficialDraft('awoken','en');
 assert.equal(draft.icon,rules.officialClanIcons.awoken.large);
 draft.cards.push(partFactory);
 const document=JSON.parse((await generateClan(draft,partFactory.uid)).cardJson!);
 const relic=document.relics.find(item=>item.names.english===partFactory.name);
 assert.ok(document.sprites.some(sprite=>'@'+sprite.id===relic.icon));
 assert.ok(document.sprites.some(sprite=>'@'+sprite.id===relic.icon_small));
 assert.notEqual(relic.icon,relic.icon_small);
});

test('Clan assets exposes the community UI variants and exports their sprite references',async t=>{
 const rules=await creatorRules(),catalog=await exampleList(),draft=await buildCommunityDraft('ww','en');
 const html=renderToStaticMarkup(React.createElement(ClanAssets,{draft,rules,items:catalog.items,language:'en',onEdit:()=>{}}));
 for(const key of ['frame-unit','frame-spell','frame-room','frame-equipment','banner-enabled_sprite',
  'banner-disabled_sprite','banner-frozen_sprite','banner-visited_sprite_disabled']){
  assert.ok(draft.artwork?.[key]?.image,key);
  assert.ok(html.includes('/catalog/'+draft.artwork![key].image),key);
 }
 assert.ok(html.includes('/catalog/'+draft.icon));
 const copy=await buildOfficialDraft('awoken','en');
 copy.artwork=draft.artwork;
 const {root}=await generateClan(copy);
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const base=JSON.parse((await fs.readFile(path.join(root,'json/clan.json'),'utf8')).replace(/^﻿/,''));
 assert.ok(Object.values(base.class_card_styles[0]).includes('@CustomArt_frame_room'));
 const cards=JSON.parse((await fs.readFile(path.join(root,'json/cards.json'),'utf8')).replace(/^﻿/,''));
 assert.ok(cards.sprites.some(sprite=>sprite.id==='CustomArt_banner_visited_sprite_disabled'));
 const positions=rules.steps.map(step=>step.id);
 assert.ok(positions.includes('stones'));
 assert.ok(positions.includes('clan-assets'));
 assert.ok(positions.indexOf('clan-assets')<positions.indexOf('review'));
});

test('Stones and slabs export as clan merchant upgrades and preserve Conductor triggers',async t=>{
 const succclan=await buildCommunityDraft('succclan','en');
 const draft=await buildOfficialDraft('awoken','en');
 draft.stones=succclan.stones;
 draft.stones!.push({uid:'new-power',name:'New Spell Slab',kind:'spell',group:'slab',rarity:'rare',recipe:'power',amount:10});
 await validateDraftShape(draft);
 const {root,classId}=await generateClan(draft);
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const doc=JSON.parse((await fs.readFile(path.join(root,'json/cards.json'),'utf8')).replace(/^\uFEFF/,''));
 for(const stone of draft.stones!){
  const relic=doc.relics.find(entry=>entry.id==='Stone_'+stone.uid);
  assert.equal(relic.type,'enhancer');
  const settings=relic.extensions[0].enhancer;
  assert.equal(settings.class,'@'+classId);
  assert.deepEqual(settings.pools,stone.uid==='curseguard-stone'
   ?['UnitUpgradePoolCommon','DraftUpgradePool','MalickaDraftUpgradePool']
   :stone.uid==='curseguard-slab'?['SoulSavior_UnitUpgradePoolCommon']:['SoulSavior_SpellUpgradePoolRare']);
  const effect=doc.relic_effects.find(entry=>'@'+entry.id===relic.relic_effects[0]);
  assert.equal(effect.name,'RelicEffectCardUpgrade');
  const upgrade=doc.upgrades.find(entry=>'@'+entry.id===effect.param_upgrade);
  if(stone.recipe==='power'){
   assert.equal(effect.param_card_type,'spell');
   assert.equal(upgrade.bonus_heal,10);
  }else{
   assert.equal(effect.param_card_type,'monster');
   const trigger=doc.character_triggers.find(entry=>'@'+entry.id===upgrade.trigger_upgrades[0]);
   assert.deepEqual(trigger.trigger,{id:'@Accursed',mod_reference:'Conductor'});
   assert.equal(doc.effects.find(entry=>'@'+entry.id===trigger.effects[0]).param_status_effects[0].count,stone.amount);
  }
  for(const ref of [relic.icon,relic.icon_small])await fs.access(path.join(root,doc.sprites.find(sprite=>'@'+sprite.id===ref).path));
 }
});
// 2026-11-21-1335||codex-clan-editor||clan-creator/tests/creator-clan-assets.test.ts||Probar iconos de artefactos y clanes, los ocho recursos de W&W y la generación de piedras
// 2026-11-21-1336||codex-clan-editor||clan-creator/tests/creator-clan-assets.test.ts||Verificar el export real de marcos, estandartes y piedras con un clan completo
