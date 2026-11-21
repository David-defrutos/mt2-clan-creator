import test from 'node:test';
import assert from 'node:assert/strict';
import {blankCard} from '../src/server/creator/model.ts';
import {changeCardKind} from '../src/web/creator/new-card-wizard.tsx';
import {combatExample} from '../src/web/creator/combat-example.tsx';
import {visibleSearchOptions} from '../src/web/creator/search-select.tsx';
import {creatorRules} from '../src/server/creator/catalog.ts';

test('switching card type preserves shared fields and leaves original unit intact for undo',()=>{
 const unit={...blankCard('unit','test'),name:'Keeper',description:'My description',cost:3,rarity:'rare',unlockLevel:4,banner:true,image:'upload/art.png',attack:23,abilities:[{status:'ambush',count:1}]};
 for(const kind of ['spell','equipment','artifact','room'] as const){
  const card=changeCardKind(unit,kind);
  for(const key of ['name','description','cost','rarity','uid','unlockLevel','image'] as const)assert.equal(card[key],unit[key]);
  assert.equal(card.banner,false);assert.equal(card.abilities,undefined);assert.equal(unit.attack,23);assert.equal(unit.abilities.length,1);
 }
});

test('combat examples respect scope, amount, health caps and floor boundaries',()=>{
 const effect={recipe:'armor',amount:7,target:'all_friendly',when:'on_spawn'};
 const armor=combatExample(effect,true);assert.deepEqual(armor.map(row=>row.after),[7,7,0,0,0]);
 assert.deepEqual(combatExample({...effect,recipe:'damage',target:'enemy',amount:100},true).map(row=>row.after),[10,10,0,10,10]);
 const heal=combatExample({...effect,recipe:'heal',target:'spell_target',amount:99},false);
 assert.equal(heal[0].after,10);assert.ok(heal.slice(1).every(row=>row.after===5));
 assert.equal(combatExample({...effect,recipe:'draw'},true).length,0);
});

test('ability search matches bilingual aliases and visible tooltip words',async()=>{
 const rules=await creatorRules(),options=rules.unitAbilities.map((a:any)=>({value:a.status,label:a.label.en,searchText:(a.aliases??[]).join(' '),help:a.help.en}));
 for(const [query,status] of [['atacar primero','ambush'],['attack first','ambush'],['daño sobrante','trample'],['excess damage','trample']])assert.ok(visibleSearchOptions(options,query).some(o=>o.value===status));
 assert.equal(visibleSearchOptions([{value:'x',label:'Skill',help:'Recupera salud'}],'recupera')[0].value,'x');
});
// 2026-11-19-0847||codex-clan-editor||clan-creator/tests/creator-card-guidance.test.ts||Verificar conversión reversible, búsquedas bilingües y objetivos del ejemplo de combate
