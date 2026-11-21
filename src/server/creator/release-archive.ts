import {inflateRawSync} from 'node:zlib';

const maxAssemblyBytes=8*1024*1024;

// Read only requested entries. Archive paths are never written to disk.
export function releaseAssemblies(bytes:Buffer,names:string[],entries:Record<string,string>={}){
 const requested=new Set(names.map(name=>name+'.dll'));
 const found=new Map<string,Buffer>();
 let end=bytes.length-22;
 for(;end>=Math.max(0,bytes.length-65557);end--){
  if(bytes.readUInt32LE(end)===0x06054b50&&end+22+bytes.readUInt16LE(end+20)===bytes.length)break;
 }
 if(end<Math.max(0,bytes.length-65557))throw Error('Invalid ZIP directory');
 const count=bytes.readUInt16LE(end+10),start=bytes.readUInt32LE(end+16),size=bytes.readUInt32LE(end+12);
 if(bytes.readUInt32LE(end+4)!==0||count!==bytes.readUInt16LE(end+8)||count===0xffff||start+size!==end)throw Error('Unsupported ZIP directory');
 let offset=start;
 for(let i=0;i<count;i++){
  if(offset+46>end||bytes.readUInt32LE(offset)!==0x02014b50)throw Error('Invalid ZIP entry');
  const nameSize=bytes.readUInt16LE(offset+28),next=offset+46+nameSize+bytes.readUInt16LE(offset+30)+bytes.readUInt16LE(offset+32);
  if(next>end)throw Error('Incomplete ZIP entry');
  const archivePath=bytes.toString('utf8',offset+46,offset+46+nameSize);
  const name=archivePath.split('/').pop()!;
  const entry=entries[name.slice(0,-4)];
  if(requested.has(name)&&(!entry||entry===archivePath)){
   const flags=bytes.readUInt16LE(offset+8),method=bytes.readUInt16LE(offset+10),packed=bytes.readUInt32LE(offset+20);
   const length=bytes.readUInt32LE(offset+24),local=bytes.readUInt32LE(offset+42);
   if(found.has(name)||(flags&1)||length===0||length>maxAssemblyBytes||local+30>start||bytes.readUInt32LE(local)!==0x04034b50)throw Error('Invalid ZIP assembly: '+name);
   const dataStart=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
   if(dataStart+packed>start||(method!==0&&method!==8)||(method===0&&packed!==length))throw Error('Unsupported ZIP assembly: '+name);
   const data=bytes.subarray(dataStart,dataStart+packed);
   const output=method===0?data:inflateRawSync(data,{maxOutputLength:length});
   if(output.length!==length)throw Error('Invalid ZIP assembly size: '+name);
   found.set(name,output);
  }
  offset=next;
 }
 if(offset!==end||found.size!==requested.size)throw Error('The release is missing compilation references');
 return found;
}
// 2026-11-21-0947||codex-clan-editor||clan-creator/src/server/creator/release-archive.ts||Leer solo las DLL requeridas de ZIP oficiales y acotar descompresion
// 2026-11-21-0953||codex-clan-editor||clan-creator/src/server/creator/release-archive.ts||Aceptar rutas exactas cuando un paquete incluye DLL para varios frameworks
