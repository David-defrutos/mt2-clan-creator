import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {checkAppUpdate,installedAppVersion} from '../src/server/creator/app-updates.ts';
import {creatorRules} from '../src/server/creator/catalog.ts';
import {AppUpdate} from '../src/web/creator/app-update.tsx';

const repository='David-defrutos/mt2-clan-creator';
const latest=(...tags:string[]):typeof fetch=>async(url)=>{
 assert.equal(String(url),'https://api.github.com/repos/'+repository+'/releases?per_page=30');
 return Response.json([{tag_name:'v100.0.0',draft:true},...tags.map(tag_name=>({tag_name,draft:false}))]);
};

test('release checks compare beta numbers, prefer a final release at the same version and keep stable users on stable releases',async()=>{
 assert.deepEqual(await checkAppUpdate('0.1.0-beta.5',repository,latest('v0.1.0-beta.7','v0.1.0-beta.10','irrelevant')),{
  status:'available',latest:'0.1.0-beta.10',url:'https://github.com/'+repository+'/releases/tag/v0.1.0-beta.10',
 });
 assert.equal((await checkAppUpdate('0.1.0-beta.5',repository,latest('v0.1.0','v0.1.0-beta.11'))).latest,'0.1.0');
 assert.equal((await checkAppUpdate('0.1.0',repository,latest('v0.2.0-beta.1','v0.1.0'))).status,'current');
 assert.equal((await checkAppUpdate('0.1.0-beta.5',repository,latest('v0.1.0-beta.4'))).status,'ahead');
 assert.equal((await checkAppUpdate('0.1.0-beta.5',repository,async()=>new Response(null,{status:429}))).status,'unavailable');
});

test('the header update panel lists the installed version and action',async()=>{
 const [version,config]=await Promise.all([installedAppVersion(),creatorRules()]);
 for(const language of ['en','es'] as const){
  const html=renderToStaticMarkup(React.createElement(AppUpdate,{version,rules:config.appUpdate,language}));
  assert.ok(html.includes(config.appUpdate.version[language].replace('{version}',version)));
  assert.ok(html.includes(config.appUpdate.check[language]));
  assert.match(html,/class="app-update"/);
 }
});
// 2026-11-21-1106||codex-clan-editor||clan-creator/tests/creator-app-updates.test.ts||Validar orden de versiones beta y estable, red no disponible y enlaces bilingües

test('release packaging rejects visible workstation paths and accepts the public alias',async()=>{
 const {validateDistributionPrivacy}=await import('../scripts/distribution-privacy.mjs');
 assert.throws(()=>validateDistributionPrivacy('config/rules.json',Buffer.from('C:/Users/Example/private.txt')),/Private data/);
 assert.throws(()=>validateDistributionPrivacy('catalog/official/art-manifest.json',Buffer.from('/home/somebody/catalog.json')),/Private data/);
 assert.doesNotThrow(()=>validateDistributionPrivacy('LICENSE',Buffer.from('Copyright (c) 2026 frutos')));
});
// 2026-11-21-1116||codex-clan-editor||clan-creator/tests/creator-app-updates.test.ts||Verificar el rechazo de rutas personales en archivos de distribución
// 2026-11-21-1223||codex-clan-editor||clan-creator/tests/creator-app-updates.test.ts||Verificar los controles bilingües de la cabecera
