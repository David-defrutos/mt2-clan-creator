import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {ExpansionSettings,loadExpansionChoices} from '../src/web/creator/expansions.tsx';
const rules={expansions:[{id:'punished',label:{en:'The Punished',es:'Los Castigados'}}],guidedText:{dlcTitle:{en:'My expansions'},dlcHelp:{en:'Choose the expansions you own.'},compatibleOnly:{en:'Only compatible examples'}}};
test('explicitly hidden ownership selector ignores a stale filter',()=>{assert.equal(renderToStaticMarkup(React.createElement(ExpansionSettings,{rules,language:'en',value:{owned:[],compatibleOnly:true},onChange:()=>{}})),'');assert.deepEqual(loadExpansionChoices(rules),{owned:[],compatibleOnly:false});});
test('public defaults enable expansion selector',()=>{const settings=JSON.parse(fs.readFileSync(new URL('../config/creator.json',import.meta.url),'utf8'));assert.equal(settings.showExpansionSettings,true);const html=renderToStaticMarkup(React.createElement(ExpansionSettings,{rules:{...rules,showExpansionSettings:settings.showExpansionSettings},language:'en',value:{owned:['punished'],compatibleOnly:true},onChange:()=>{}}));assert.ok(html.includes('My expansions'));assert.ok(html.includes('The Punished'));assert.ok(html.includes('checked=""'));});
// 2026-11-17-1909||codex-clan-editor||clan-creator/tests\creator-expansion-visibility.test.ts||Probar selector privado y ausencia de filtro oculto en distribución pública
// 2026-11-17-1918||codex-clan-editor||clan-creator/tests\creator-expansion-visibility.test.ts||Verificar selector DLC habilitado en configuración pública
