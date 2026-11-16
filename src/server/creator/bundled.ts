import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {projectRoot,inside} from '../paths.js';
export interface BundleFile {path:string;sha256:string;bytes:number;source?:string}
export interface BundlePackage {id:string;folder:string;version:string;path:string;license:string;website:string}
export interface Bundle {schemaVersion:number;packages:BundlePackage[];references:Record<string,string>;files:BundleFile[]}
export const bundleRoot=path.join(projectRoot,'vendor/modding');
export async function readBundle(root=bundleRoot):Promise<Bundle>{
 const base=await fs.realpath(root);const index=JSON.parse(await fs.readFile(path.join(base,'index.json'),'utf8')) as Bundle;
 if(index.schemaVersion!==1||!Array.isArray(index.files)||!index.files.length||!Array.isArray(index.packages)||index.packages.length!==2)throw Error('Las herramientas incluidas están incompletas.');
 const seen=new Set<string>();for(const file of index.files){if(typeof file.path!=='string'||file.path.includes('\\')||path.isAbsolute(file.path)||file.path.split('/').some(p=>!p||p==='.'||p==='..')||seen.has(file.path.toLowerCase())||!/^([a-f0-9]{64})$/.test(file.sha256))throw Error('Inventario de herramientas no válido.');seen.add(file.path.toLowerCase());const target=path.resolve(base,file.path);if(!inside(base,target)||!inside(base,await fs.realpath(target)))throw Error('Recurso externo en las herramientas.');const stat=await fs.lstat(target);if(stat.isSymbolicLink()||!stat.isFile())throw Error('Recurso de herramientas no válido.');const bytes=await fs.readFile(target);if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Una herramienta incluida ha cambiado: '+file.path);}
 async function inventory(dir:string){for(const e of await fs.readdir(dir,{withFileTypes:true})){const target=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Enlace no permitido en herramientas.');if(e.isDirectory())await inventory(target);else{const rel=path.relative(base,target).replaceAll('\\','/');if(rel!=='index.json'&&!seen.has(rel.toLowerCase()))throw Error('Archivo no auditado en herramientas: '+rel);}}}await inventory(base);
 if(new Set(index.packages.map(p=>p.id)).size!==2)throw Error('Paquetes repetidos en herramientas.');
 for(const p of index.packages){if(!['trainworks','conductor'].includes(p.id)||!/^[A-Za-z0-9_-]+$/.test(p.folder)||p.path!=='packages/'+p.folder||!/^\d+\.\d+\.\d+$/.test(p.version)||!seen.has((p.path+'/LICENSE').toLowerCase()))throw Error('Paquete de herramientas no válido.');}
 for(const rel of Object.values(index.references))if(!seen.has(rel.toLowerCase())||!rel.endsWith('.dll'))throw Error('Referencia de compilación no incluida.');
 return index;
}
export async function bundledReferences(root=bundleRoot){const bundle=await readBundle(root);return {bundle,references:Object.fromEntries(Object.entries(bundle.references).map(([name,rel])=>[name,path.join(root,rel)]))};}
// 2026-11-15-1418||codex-clan-editor||clan-creator/src/server/creator/bundled.ts||Validar hashes, rutas y licencias de herramientas incluidas antes de compilar o instalar
// 2026-11-15-1418||codex-clan-editor||clan-creator/src\server\creator\bundled.ts||Normalizar también el nombre completo de licencia en la validación
// 2026-11-15-1433||codex-clan-editor||clan-creator/src\server\creator\bundled.ts||Rechazar archivos no auditados y paquetes duplicados antes de copiar herramientas
// 2026-11-15-1434||codex-clan-editor||clan-creator/src\server\creator\bundled.ts||Corregir símbolos y acentos alterados por lectura con codificación Windows
