import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {projectRoot} from '../dist-server/paths.js';
import {creatorRules,exampleList,readExample} from '../dist-server/creator/catalog.js';
import {exampleSearchText} from '../dist-server/creator/example-search-text.js';

// Keep the audited example payloads and their hashes intact.
const rules=await creatorRules();
const {items}=await exampleList();
const entries={};
for(const item of items){
 const example=await readExample(item.id);
 entries[item.id]=[item.sha256,exampleSearchText(example,rules)];
}
const target=path.join(projectRoot,'dist-server','catalog-search.json');
const temporary=target+'.'+randomUUID()+'.tmp';
try{
 await fs.writeFile(temporary,JSON.stringify(entries),{flag:'wx'});
 await fs.rename(temporary,target);
}finally{
 await fs.rm(temporary,{force:true});
}
console.log('Indexed '+Object.keys(entries).length+' catalog examples.');
// 2026-11-21-2043||codex-clan-editor||clan-creator/scripts/build-catalog-search.mjs||Crear el índice bilingüe de búsqueda sin modificar definiciones ni sus hashes
// 2026-11-21-2045||codex-clan-editor||clan-creator/scripts/build-catalog-search.mjs||Escribir el índice de forma atómica y permitir generarlo en una distribución preparada
