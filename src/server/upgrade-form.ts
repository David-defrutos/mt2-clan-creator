import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import * as jsonc from 'jsonc-parser';
import {prepareEdit} from './edit.js';
import {scanClan} from './scan.js';
import {jsonPath} from './field-paths.js';
import {configRoot,dataRoot,keyForPath,inside} from './paths.js';

export interface UpgradeFormRequest {root:string;id:string;file:string;expectedHash:string;changes:{field:string;value:unknown}[];expectedToken?:string}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function prepareUpgradeForm(request:UpgradeFormRequest){
 const fields=JSON.parse(await fs.readFile(path.join(configRoot,'fields.json'),'utf8')).upgrades as {path:string;special?:boolean}[];
 if(!Array.isArray(request.changes)||request.changes.length>fields.length)throw new Error('Lista de cambios de mejora inválida.');
 const seen=new Set<string>();
 for(const change of request.changes){if(!change||typeof change.field!=='string'||seen.has(change.field)||!fields.some(f=>f.path===change.field&&!f.special))throw new Error('Campo de mejora no permitido o repetido.');seen.add(change.field);}
 const clan=await scanClan(request.root);const entry=clan.entries.find(e=>e.section==='upgrades'&&e.id===request.id&&e.file===request.file);
 if(!entry||clan.entries.filter(e=>e.section==='upgrades'&&e.id===request.id).length!==1)throw new Error('La mejora no tiene una identidad local única.');
 const absolute=path.resolve(request.root,request.file);if(!inside(path.join(request.root,'json'),absolute)||!inside(await fs.realpath(request.root),await fs.realpath(absolute)))throw new Error('La ruta sale de la carpeta del clan.');
 const original=await fs.readFile(absolute,'utf8');if(hash(original)!==request.expectedHash)throw new Error('El archivo cambió en disco. Actualiza el clan y revisa los cambios.');
 const reviews=await Promise.all(request.changes.map(change=>prepareEdit({...request,section:'upgrades',field:change.field,value:change.value})));
 const changes=reviews.filter(r=>r.changed).map(({field,before,after})=>({field,before,after}));
 const bom=original.startsWith('\uFEFF')?'\uFEFF':'';let source=bom?original.slice(1):original;
 const indent=source.match(/\n(\s+)"/)?.[1]??'  ';
 for(const change of changes)source=jsonc.applyEdits(source,jsonc.modify(source,['upgrades',entry.index,...jsonPath(change.field)],change.after,{formattingOptions:{insertSpaces:!indent.includes('\t'),tabSize:indent.includes('\t')?1:indent.length,eol:original.includes('\r\n')?'\r\n':'\n'}}));
 const newText=bom+source;const errors:jsonc.ParseError[]=[];jsonc.parse(source,errors,{allowTrailingComma:true,disallowComments:false});if(errors.length)throw new Error('El cambio produciría un JSON inválido.');
 if(hash(await fs.readFile(absolute,'utf8'))!==request.expectedHash)throw new Error('El archivo cambió durante la revisión.');
 const token=hash(JSON.stringify([await fs.realpath(request.root),request.id,request.file,request.expectedHash,newText,fields]));
 if(request.expectedToken&&request.expectedToken!==token)throw new Error('La vista previa ha caducado. Vuelve a previsualizar.');
 return {changed:changes.length>0,changes,newText,original,token};
}
const saving=new Set<string>();
export async function saveUpgradeForm(request:UpgradeFormRequest){
 if(!request.expectedToken)throw new Error('Previsualiza la mejora antes de guardar.');
 const root=await fs.realpath(request.root);if(saving.has(root))throw new Error('Hay otro guardado de mejoras en curso.');saving.add(root);
 try{const review=await prepareUpgradeForm(request);if(!review.changed)return {changed:false};
 const parent=path.join(dataRoot,'backups',keyForPath(root));await fs.mkdir(parent,{recursive:true});const folder=await fs.mkdtemp(path.join(parent,'upgrade-form-'));const backup=path.join(folder,request.file);await fs.mkdir(path.dirname(backup),{recursive:true});await fs.writeFile(backup,review.original,{flag:'wx'});
 const absolute=path.resolve(root,request.file);const temp=absolute+'.clan-editor-'+randomUUID()+'.tmp';
 try{await fs.writeFile(temp,review.newText,{flag:'wx'});if(!inside(root,await fs.realpath(path.dirname(absolute)))||!inside(root,await fs.realpath(absolute)))throw new Error('La ruta resuelta sale de la carpeta del clan.');if(hash(await fs.readFile(absolute,'utf8'))!==request.expectedHash)throw new Error('El archivo cambió durante el guardado.');await fs.rename(temp,absolute);}finally{await fs.rm(temp,{force:true});}
 return {changed:true,backup};
 }finally{saving.delete(root);}
}
