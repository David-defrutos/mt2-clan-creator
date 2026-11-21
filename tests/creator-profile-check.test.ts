import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {dataRoot} from '../src/server/paths.ts';
import {checkProfile} from '../src/server/creator/check-profile.ts';
test('requisitos: informar ausencias sin crear archivos y comprobar versiones del gestor en carpetas anidadas',async t=>{const dir=await fs.mkdtemp(path.join(dataRoot,'profile-check-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));let r=await checkProfile(dir);assert.equal(r.ready,false);assert.ok(r.packages.every(p=>p.status==='missing'));assert.deepEqual(await fs.readdir(dir),[]);await fs.mkdir(path.join(dir,'BepInEx/core'),{recursive:true});await fs.writeFile(path.join(dir,'BepInEx/core/BepInEx.dll'),'test');for(const [folder,dll,version]of [['MT2-Trainworks_Reloaded','TrainworksReloaded.Plugin.dll','0.8.0'],['Conductor-Conductor','Conductor.dll','0.6.0']]){const pkg=path.join(dir,'BepInEx/plugins',folder);await fs.mkdir(path.join(pkg,'plugins'),{recursive:true});await fs.writeFile(path.join(pkg,'plugins',dll),'test');await fs.writeFile(path.join(pkg,'manifest.json'),JSON.stringify({version_number:version}));}r=await checkProfile(path.join(dir,'BepInEx/plugins'));assert.equal(r.ready,true);assert.equal(r.profile,await fs.realpath(dir));assert.equal((await checkProfile(dir)).fingerprint,r.fingerprint);await fs.writeFile(path.join(dir,'BepInEx/plugins/Conductor-Conductor/manifest.json'),JSON.stringify({version_number:'0.5.0'}));assert.equal((await checkProfile(dir)).packages.find(p=>p.id==='conductor')!.status,'outdated');await fs.writeFile(path.join(dir,'BepInEx/plugins/Conductor.dll'),'duplicate');assert.equal((await checkProfile(dir)).packages.find(p=>p.id==='conductor')!.status,'duplicate');});
// 2026-11-15-2007||codex-clan-editor||clan-creator/tests/creator-profile-check.test.ts||Probar comprobacion sin escrituras, versiones antiguas y duplicados en perfiles Thunderstore

test('profile instructions link r2modman download while keeping its development notice',async()=>{const React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{GameSetupGuide}=await import('../src/web/creator/profile-tools.tsx'),{creatorRules}=await import('../src/server/creator/catalog.ts');const rules=await creatorRules();for(const language of ['es','en'] as const){const html=renderToStaticMarkup(React.createElement(GameSetupGuide,{rules,language}));assert.match(html,/href="https:\/\/r2modman[.]com\/download-latest\/"/);assert.match(html,language==='en'?/In development/:/En desarrollo/i);assert.doesNotMatch(html,/<button/);assert.match(html,language==='en'?/Install and enable all three/:/Instala y activa allí los tres/);}});
// 2026-11-15-2122||codex-clan-editor||clan-creator/tests/creator-profile-check.test.ts||Probar enlace de descarga y explicacion de archivos comprobados en ES EN
// 2026-11-15-2126||codex-clan-editor||clan-creator/tests/creator-profile-check.test.ts||Verificar instrucciones manuales sin boton de comprobacion y conservar enlaces de gestores
test('profile diagnostic endpoint returns only statuses for the selected local folder',async t=>{
 const {createCreatorServer}=await import('../src/server/creator-server.ts');
 const dir=await fs.mkdtemp(path.join(dataRoot,'profile-http-'));
 const server=createCreatorServer();
 t.after(async()=>{
  await new Promise<void>(resolve=>server.close(()=>resolve()));
  await fs.rm(dir,{recursive:true,force:true});
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();
 assert.ok(address&&typeof address==='object');
 const url='http://127.0.0.1:'+address.port+'/api/profile-check';
 const plugins=path.join(dir,'BepInEx','plugins');
 await fs.mkdir(plugins,{recursive:true});
 await fs.writeFile(path.join(plugins,'Conductor.dll'),'sample');
 const post=(folder:string,origin?:string)=>fetch(url,{method:'POST',headers:{
  'Content-Type':'application/json',...(origin?{Origin:origin}:{})
 },body:JSON.stringify({folder})});
 const response=await post(plugins);
 assert.equal(response.status,200);
 const report=await response.json();
 assert.deepEqual(Object.keys(report).sort(),['packages','ready']);
 assert.deepEqual(report.packages.map((pkg:any)=>[pkg.id,pkg.status]),[
  ['bepinex','missing'],['trainworks','missing'],['conductor','unknown'],
 ]);
 assert.equal(report.ready,false);
 assert.deepEqual(await fs.readdir(plugins),['Conductor.dll']);
 assert.equal((await post(plugins,'https://foreign.invalid')).status,403);
 assert.equal((await post('relative-folder')).status,400);
});
// 2026-11-21-1508||codex-clan-editor||clan-creator/tests/creator-profile-check.test.ts||Comprobar el enlace y aviso de r2modman en la guía vigente
// 2026-11-21-1946||codex-clan-editor||clan-creator/tests/creator-profile-check.test.ts||Cubrir el diagnóstico por HTTP, versión sin manifiesto y rechazo de orígenes externos
