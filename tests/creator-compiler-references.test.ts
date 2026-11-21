import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {compilerReferences,newestCompilerRelease,selectCompilerRelease} from '../src/server/creator/compiler-references.ts';
import {bundleRoot,readBundle} from '../src/server/creator/bundled.ts';
import {releaseAssemblies} from '../src/server/creator/release-archive.ts';
import {zipBuffers} from '../src/server/creator/zip.ts';

test('release reader handles stored and compressed DLLs and rejects duplicate or missing names',()=>{
 const stored=Buffer.from('reference');
 const packed=Buffer.alloc(500,1);
 const zip=zipBuffers([{name:'plugins/A.dll',bytes:stored},{name:'lib/B.dll',bytes:packed}],{compress:true});
 const result=releaseAssemblies(zip,['A','B']);
 assert.deepEqual(result.get('A.dll'),stored);
 assert.deepEqual(result.get('B.dll'),packed);
 assert.throws(()=>releaseAssemblies(zip,['C']),/missing/);
 assert.throws(()=>releaseAssemblies(zipBuffers([
  {name:'plugins/A.dll',bytes:stored},{name:'other/A.dll',bytes:stored},
 ]),['A']),/Invalid ZIP assembly/);
 assert.deepEqual(releaseAssemblies(zipBuffers([{name:'legacy/A.dll',bytes:packed},{name:'modern/A.dll',bytes:stored}]),['A'],{A:'modern/A.dll'}).get('A.dll'),stored);
 assert.throws(()=>releaseAssemblies(Buffer.from('broken'),['A']),/Invalid ZIP directory/);
});

test('first compilation downloads pinned assemblies, rejects incorrect contents and can retry offline',async t=>{
 const cacheRoot=await fs.mkdtemp(path.join(os.tmpdir(),'mt2-compiler-references-'));
 t.after(()=>fs.rm(cacheRoot,{recursive:true,force:true}));
 const before=await compilerReferences({cacheRoot,fetchArchive:async()=>assert.fail('Status must not download')});
 assert.deepEqual(before.missing,['Trainworks Reloaded','Conductor','BepInEx BaseLib']);
 const rejected:unknown=await compilerReferences({download:true,cacheRoot,fetchArchive:async()=>zipBuffers(
  ['TrainworksReloaded.Base','TrainworksReloaded.Core','TrainworksReloaded.Plugin','Microsoft.Extensions.Configuration.Abstractions']
   .map(name=>({name:'plugins/'+name+'.dll',bytes:Buffer.from('wrong')}))
 )}).catch(error=>error);
 assert.equal((rejected as {code?:string}).code,'COMPILER_REFERENCES');
 assert.match(String(rejected),/Unexpected SHA-256/);
 assert.deepEqual(await fs.readdir(cacheRoot),[]);

 const bundle=await readBundle().catch(()=>null);
 if(!bundle){t.diagnostic('Audited binaries unavailable. Verified uncached preflight and invalid download.');return;}
 const files=Object.entries(bundle.references);
 const urls:string[]=[];
 const fetchArchive=async (url:string)=>{
  urls.push(url);
  const selection=files.filter(([name])=>url.includes('Trainworks-Reloaded')?(name.startsWith('Trainworks')||name.startsWith('Microsoft')):
   url.includes('/Conductor/')?name==='Conductor':name==='BepInEx');
  return zipBuffers(await Promise.all(selection.map(async ([name,file])=>({
   name:name==='BepInEx'?'lib/netstandard2.0/BepInEx.dll':'plugins/'+name+'.dll',bytes:await fs.readFile(path.join(bundleRoot,file))
  }))),{compress:true});
 };
 const first=await compilerReferences({download:true,cacheRoot,fetchArchive});
 assert.equal(urls.length,3);
 assert.equal(new URL(urls[0]).hostname,'github.com');
 assert.equal(new URL(urls[1]).hostname,'github.com');
 assert.deepEqual(first.missing,[]);
 assert.deepEqual(Object.keys(first.references).sort(),Object.keys(bundle.references).sort());
 const offline=await compilerReferences({download:true,cacheRoot,fetchArchive:async()=>assert.fail('Cache should work offline')});
 assert.deepEqual(offline,first);
 await fs.writeFile(first.references.Conductor,'broken');
 assert.deepEqual((await compilerReferences({cacheRoot})).missing,['Conductor']);
 await compilerReferences({download:true,cacheRoot,fetchArchive});
 assert.equal(urls.length,4);
 assert.match(urls[3],/Conductor\/releases/);
});
// 2026-11-21-0949||codex-clan-editor||clan-creator/tests/creator-compiler-references.test.ts||Cubrir lectura de releases, verificacion, reintento y reutilizacion sin red
// 2026-11-21-0953||codex-clan-editor||clan-creator/tests/creator-compiler-references.test.ts||Cubrir paquetes con varias DLL homonimas y preparar pruebas de seleccion voluntaria

test('new versions are proposed without changing current selection, can be activated and reused',async t=>{
 const cacheRoot=await fs.mkdtemp(path.join(os.tmpdir(),'mt2-compiler-selection-'));
 t.after(()=>fs.rm(cacheRoot,{recursive:true,force:true}));
 const config=JSON.parse(await fs.readFile(new URL('../config/compiler-references.json',import.meta.url),'utf8'));
 const conductor=config.packages.find((p:{id:string})=>p.id==='conductor');
 const archive=zipBuffers([{name:'plugins/Conductor.dll',bytes:Buffer.from('new compiler reference')}]);
 const digest=createHash('sha256').update(archive).digest('hex');
 const release=(tag_name:string,draft=false,hash='sha256:'+digest)=>{
  const url=conductor.url.replaceAll(conductor.version,tag_name);
  return {tag_name,draft,assets:[{name:path.basename(url),browser_download_url:url,digest:hash}]};
 };
 const update=newestCompilerRelease(conductor,[release('0.6.2'),release('0.6.10'),release('0.6.11',true),release('0.6.12',false,''),release('0.7.0-beta')])!;
 assert.equal(update.version,'0.6.10');
 const findUpdates=async()=>[update];
 assert.equal((await compilerReferences({cacheRoot})).versions.conductor,'0.6.0');
 await assert.rejects(selectCompilerRelease('conductor',update.version,{cacheRoot,findUpdates,fetchArchive:async()=>Buffer.alloc(10)}),/Unexpected release archive SHA-256/);
 assert.equal((await compilerReferences({cacheRoot})).versions.conductor,'0.6.0');
 await selectCompilerRelease('conductor',update.version,{cacheRoot,findUpdates,fetchArchive:async()=>archive});
 assert.equal((await compilerReferences({cacheRoot})).versions.conductor,update.version);
 await selectCompilerRelease('conductor',undefined,{cacheRoot});
 assert.equal((await compilerReferences({cacheRoot})).versions.conductor,'0.6.0');
 await selectCompilerRelease('conductor',update.version,{cacheRoot,findUpdates,fetchArchive:async()=>assert.fail('Previously verified release should be reused')});
 assert.equal((await compilerReferences({cacheRoot})).versions.conductor,update.version);
});
// 2026-11-21-0953||codex-clan-editor||clan-creator/tests\creator-compiler-references.test.ts||Probar deteccion sin activar, descarga elegida, restauracion y reutilizacion
