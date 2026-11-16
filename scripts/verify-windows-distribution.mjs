import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const run=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),proofFile=path.join(root,'data/acceptance/windows-zip-current.json'),report=JSON.parse(await fs.readFile(proofFile,'utf8')),home=report.extractedRoot,system=process.env.SystemRoot||'C:\\Windows';
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!['path','node_path','node_options','clan_creator_home','clan_creator_port'].includes(key.toLowerCase())));
env.PATH=[path.join(system,'System32'),system,path.join(system,'System32/WindowsPowerShell/v1.0')].join(';');
let nodeAvailable=true;try{await run(path.join(system,'System32/where.exe'),['node'],{cwd:home,env,windowsHide:true});}catch{nodeAvailable=false;}if(nodeAvailable)throw Error('El entorno todavía puede encontrar Node');
const cmd=path.join(system,'System32/cmd.exe'),launcher=await fs.stat(path.join(home,'Launch-Creator.cmd')).then(()=> 'Launch-Creator.cmd').catch(()=> 'Abrir-creador.cmd');
const launched=await new Promise((resolve,reject)=>{const child=spawn(cmd,['/d','/c',launcher],{cwd:home,env,windowsHide:true,stdio:'ignore'});const timer=setTimeout(()=>reject(Error('El lanzador no termina en 60 s')),60000);child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('exit',code=>{clearTimeout(timer);if(code===0)resolve({stdout:'Real CMD launcher exited successfully with stdio ignored'});else reject(Error('Launcher exit '+code));});});
const rules=JSON.parse(await fs.readFile(path.join(home,'config/creator.json'),'utf8')),instance=createHash('sha256').update(home.toLowerCase()).digest('hex').slice(0,20);let url,info;
for(let n=0;n<rules.application.portSearchCount;n++){const candidate='http://127.0.0.1:'+(rules.application.port+n);try{const res=await fetch(candidate+'/api/creator',{signal:AbortSignal.timeout(1000)});const body=await res.json();if(body.instance===instance){url=candidate;info=body;break;}}catch{}}
console.log('Instance located',url);if(!url)throw Error('El lanzador no inició la instancia extraída');
const page=await fetch(url+'/',{signal:AbortSignal.timeout(10000)}).then(r=>r.text());if(!page.includes('root'))throw Error('Página inicial ausente');
const assets=[...page.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g)].map(m=>m[1]);for(const asset of assets){const r=await fetch(new URL(asset,url),{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Falta '+asset);}
const projects=await fetch(url+'/api/projects',{signal:AbortSignal.timeout(10000)}).then(r=>r.json());// User may create drafts after the launcher opens; archive privacy is checked before extraction.
const node=path.join(home,'runtime/node.exe');const native=await run(node,['--input-type=module','-e',"const sharp=(await import('sharp')).default; const b=await sharp({create:{width:2,height:2,channels:4,background:'#fff'}}).png().toBuffer(); console.log(JSON.stringify({execPath:process.execPath,pngBytes:b.length}));"],{cwd:home,env,windowsHide:true,timeout:10000});
Object.assign(report,{testedAt:new Date().toISOString(),systemNodeAvailable:nodeAvailable,cleanPath:env.PATH,launcher,launcherExitCode:0,launcherOutput:launched.stdout,url,instance,projects:projects.length,frontendAssets:assets,catalogItems:info.catalog.length??info.catalog.items?.length,nativeImageProcessing:JSON.parse(native.stdout),passed:true});await fs.writeFile(proofFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
// 2026-11-16-2024||codex-clan-editor||clan-creator/scripts/verify-windows-distribution.mjs||Probar ZIP extraído con lanzador real PATH sin Node catálogo recursos web y módulo nativo de imágenes
// 2026-11-16-2025||codex-clan-editor||clan-creator/scripts/verify-windows-distribution.mjs||Ejecutar lanzador por nombre desde cwd evitando doble escape de comillas de cmd
// 2026-11-16-2026||codex-clan-editor||clan-creator/scripts/verify-windows-distribution.mjs||Limitar tiempo HTTP y permitir continuar verificando la instancia extraída ya iniciada
// 2026-11-16-2027||codex-clan-editor||clan-creator/scripts/verify-windows-distribution.mjs||No confundir borradores creados tras arrancar con datos incluidos en ZIP; conservar actividad del usuario
// 2026-11-16-2030||codex-clan-editor||clan-creator/scripts/verify-windows-distribution.mjs||Medir salida real del lanzador sin esperar pipes heredados por el navegador externo
// 2026-11-16-2149||codex-clan-editor||clan-creator/scripts/verify-windows-distribution.mjs||Verificar lanzador inglés cuando está incluido con compatibilidad para versiones anteriores
