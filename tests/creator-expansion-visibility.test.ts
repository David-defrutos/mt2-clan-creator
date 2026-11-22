import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {creatorRules} from '../src/server/creator/catalog.ts';
import {FirstClanDialog,Welcome} from '../src/web/creator/welcome.tsx';
import {ExpansionSettings,loadExpansionChoices} from '../src/web/creator/expansions.tsx';
const rules={expansions:[{id:'punished',label:{en:'The Punished',es:'Los Castigados'}}],guidedText:{dlcTitle:{en:'My expansions'},dlcHelp:{en:'Choose the expansions you own.'},compatibleOnly:{en:'Only compatible examples'}}};
test('explicitly hidden ownership selector ignores a stale filter',()=>{assert.equal(renderToStaticMarkup(React.createElement(ExpansionSettings,{rules,language:'en',value:{owned:[],compatibleOnly:true},onChange:()=>{}})),'');assert.deepEqual(loadExpansionChoices(rules),{owned:[],compatibleOnly:false});});
test('public defaults enable expansion selector',()=>{const settings=JSON.parse(fs.readFileSync(new URL('../config/creator.json',import.meta.url),'utf8'));assert.equal(settings.showExpansionSettings,true);const html=renderToStaticMarkup(React.createElement(ExpansionSettings,{rules:{...rules,showExpansionSettings:settings.showExpansionSettings},language:'en',value:{owned:['punished'],compatibleOnly:true},onChange:()=>{}}));assert.ok(html.includes('My expansions'));assert.ok(html.includes('The Punished'));assert.ok(html.includes('checked=""'));});
// 2026-11-17-1909||codex-clan-editor||clan-creator/tests\creator-expansion-visibility.test.ts||Probar selector privado y ausencia de filtro oculto en distribución pública
// 2026-11-17-1918||codex-clan-editor||clan-creator/tests\creator-expansion-visibility.test.ts||Verificar selector DLC habilitado en configuración pública

test('first clan offers either a blank clan or an editable official copy in both languages',async()=>{
 const settings=await creatorRules();
 const noOp=()=>{};
 for(const language of ['en','es'] as const){
  const html=renderToStaticMarkup(React.createElement(FirstClanDialog,{
   rules:settings,language,expansions:{owned:[],compatibleOnly:true},busy:false,onClose:noOp,onNew:noOp,onOfficial:noOp,
  }));
  const home=renderToStaticMarkup(React.createElement(Welcome,{
   rules:settings,language,catalog:[],projects:[],busy:false,onNew:noOp,onOfficial:noOp,
  }));
  assert.ok(home.includes(settings.labels.new[language]));
  assert.doesNotMatch(home,/Create my first clan|Crear mi primer clan/);
  assert.ok(!home.includes(settings.labels.officialClanTitle[language]));
  assert.ok(html.includes(settings.usabilityText.startQuestion[language]));
  assert.ok(html.includes(settings.labels.empty[language]));
  assert.doesNotMatch(html,/Use the prepared clan|Usar el clan preparado/);
  assert.ok(html.includes(settings.labels.officialClanTitle[language]));
  assert.ok(html.includes(settings.labels.officialClanLoad[language]));
  assert.match(html,/<option value="awoken">/);
  assert.doesNotMatch(html,/<option value="(?:railforged|punished|clanless)">/);
 }
});
// 2026-11-21-1006||codex-clan-editor||clan-creator/tests/creator-expansion-visibility.test.ts||Comprobar las dos opciones del primer clan, sus traducciones y el filtro de expansiones
// 2026-11-21-1007||codex-clan-editor||clan-creator/tests/creator-expansion-visibility.test.ts||Probar con las reglas hidratadas que recibe la pantalla de inicio
// 2026-11-21-1011||codex-clan-editor||clan-creator/tests/creator-expansion-visibility.test.ts||Verificar que Crear mi primer clan ofrece empezar desde cero o con una copia oficial
// 2026-11-21-1013||codex-clan-editor||clan-creator/tests/creator-expansion-visibility.test.ts||Verificar que la copia oficial solo aparece en el asistente tanto en ingles como en espanol

test('the clan picker follows each expansion checkbox even when the card filter is off',async()=>{
 const settings=await creatorRules();
 const noOp=()=>{};
 for(const language of ['en','es'] as const){
  for(const owned of [[],['punished'],['railforged'],['punished','railforged']]){
   const html=renderToStaticMarkup(React.createElement(FirstClanDialog,{
    rules:settings,language,expansions:{owned,compatibleOnly:false},busy:false,onClose:noOp,onNew:noOp,onOfficial:noOp,
   }));
   const visible=[...html.matchAll(/<option value="([^"]+)"/g)].map(match=>match[1]);
   const expected=settings.officialClanTemplates
    .filter(clan=>!clan.requiredDlc||owned.includes(clan.requiredDlc)).map(clan=>clan.id);
   assert.deepEqual(visible,expected);
  }
 }
});
// 2026-11-22-0949||codex-clan-editor||clan-creator/tests/creator-expansion-visibility.test.ts||Cubrir cada combinación de expansiones con el filtro de cartas desactivado
