import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,execFile} from 'node:child_process';
import net from 'node:net';
import {appBuildId} from '../dist-server/creator/app-updates.js';
import {promisify} from 'node:util';
const run=promisify(execFile);
const root=path.resolve(import.meta.dirname,'..');const rules=JSON.parse(fs.readFileSync(path.join(root,'config/creator.json'),'utf8'));const instance=createHash('sha256').update(root.toLowerCase()).digest('hex').slice(0,20);fs.mkdirSync(path.join(root,'data'),{recursive:true});
const expectedBuild=appBuildId();
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function status(port){try{const r=await fetch(`http://127.0.0.1:${port}/api/creator`,{signal:AbortSignal.timeout(1200)});if(!r.ok)return false;const state=await r.json();return state.instance===instance&&state.appBuild===expectedBuild;}catch{return null;}}
async function available(port){return new Promise(resolve=>{const s=net.createServer();s.once('error',()=>resolve(false));s.listen(port,'127.0.0.1',()=>s.close(()=>resolve(true)));});}
async function browser(url){console.log('Open the creator at: '+url);if(process.platform==='win32')await run('powershell.exe',['-NoProfile','-Command',"Start-Process -FilePath $env:CLAN_CREATOR_URL -ErrorAction Stop"],{windowsHide:true,env:{...process.env,CLAN_CREATOR_URL:url}});else await run(process.platform==='darwin'?'open':'xdg-open',[url]);}
try{let port;for(let n=0;n<rules.application.portSearchCount;n++){const candidate=rules.application.port+n;if(await status(candidate)){await browser(`http://127.0.0.1:${candidate}/`);process.exit(0);}if(port===undefined&&await available(candidate))port=candidate;}if(!port)throw Error('No local port is available.');const stdout=fs.openSync(path.join(root,'data/server.log'),'a'),stderr=fs.openSync(path.join(root,'data/server-errors.log'),'a');const child=spawn(process.execPath,['dist-server/creator-server.js'],{cwd:root,env:{...process.env,CLAN_CREATOR_PORT:String(port)},detached:true,windowsHide:true,stdio:['ignore',stdout,stderr]});child.unref();fs.closeSync(stdout);fs.closeSync(stderr);for(let i=0;i<60;i++){if(await status(port)){await browser(`http://127.0.0.1:${port}/`);process.exit(0);}await delay(250);}throw Error('The creator server could not start.');}catch(e){fs.appendFileSync(path.join(root,'data/startup-errors.log'),new Date().toISOString()+' '+e.message+'\n');console.error('Could not open the creator: '+e.message+'\nSee data/startup-errors.log.');if(process.platform==='win32')await run('powershell.exe',['-NoProfile','-Command',"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Could not open the creator. See data/startup-errors.log or extract the complete distribution again.','Clan Creator')"],{windowsHide:true});else console.error(e.message);process.exitCode=1;}
// 2026-11-15-0917||codex-clan-editor||clan-creator/scripts/launch.mjs||Arranque sin terminal con instancia por carpeta, puerto libre, registros y apertura del navegador
// 2026-11-15-1352||codex-clan-editor||clan-creator/scripts/launch.mjs||Esperar apertura del navegador predeterminado antes de terminar y mostrar URL y errores en consola
// 2026-11-15-1434||codex-clan-editor||clan-creator/scripts\launch.mjs||Corregir símbolos y acentos alterados por lectura con codificación Windows
// 2026-11-16-2149||codex-clan-editor||clan-creator/scripts/launch.mjs||Mostrar instrucciones y errores de arranque en inglés para el paquete Windows
// 2026-11-21-1115||codex-clan-editor||clan-creator/scripts/launch.mjs||Comprobar la generación del programa al abrirlo
// 2026-11-21-1115||codex-clan-editor||clan-creator/scripts/launch.mjs||Leer una sola vez la huella de los archivos instalados
// 2026-11-21-1115||codex-clan-editor||clan-creator/scripts/launch.mjs||Reutilizar solo el servidor correspondiente a la compilación instalada
// 2026-11-21-1115||codex-clan-editor||clan-creator/scripts/launch.mjs||Buscar instancias actualizadas en todos los puertos y reservar el primero libre
