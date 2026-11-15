import fs from 'node:fs/promises';
import path from 'node:path';
import {parseAst} from 'rolldown/parseAst';
const es=JSON.parse(await fs.readFile('config/locales/es.json','utf8'));
const en=JSON.parse(await fs.readFile('config/locales/en.json','utf8'));
const missing=new Set();
function requireKey(key){if(key&&!Object.hasOwn(es,key))missing.add(key);}
function message(node){if(node?.type==='Literal'&&typeof node.value==='string')return node.value;if(node?.type==='TemplateLiteral'){let value='';node.quasis.forEach((q,i)=>{value+=q.value.cooked??'';if(node.expressions[i])value+=`{v${i}}`;});return value;}}
function walk(node,file){if(!node||typeof node!=='object')return;
 if(node.type==='JSXElement'&&node.openingElement.name?.name==='option'&&!node.openingElement.attributes.some(a=>a.name?.name==='value')&&node.children.some(c=>c.expression?.type==='CallExpression'&&c.expression.callee?.name==='t'))throw new Error(`Translated option must have an explicit value: ${file}`);
 if(node.type==='CallExpression'&&node.callee?.name==='t'&&node.arguments[0]?.type==='Literal')requireKey(node.arguments[0].value);
 if(file.endsWith('.ts')&&!file.endsWith('.tsx')){
  if(node.type==='NewExpression'&&node.callee?.name==='Error')requireKey(message(node.arguments[0]));
  if(node.type==='Property'&&['message','diagnostic','reason','note','description','help'].includes(node.key?.name))requireKey(message(node.value));
  if(node.type==='CallExpression'&&node.callee?.name==='add')requireKey(message(node.arguments[2]));
  if(node.type==='CallExpression'&&node.callee?.type==='MemberExpression'&&node.callee.property?.name==='push'&&node.callee.object?.name==='warnings')for(const arg of node.arguments)requireKey(message(arg));
 }
 for(const value of Object.values(node)){if(Array.isArray(value))for(const child of value)walk(child,file);else if(value&&typeof value==='object')walk(value,file);}
}
for(const directory of ['src/web','src/server'])for(const file of await fs.readdir(directory)){if(!/\.tsx?$/.test(file))continue;walk(parseAst(await fs.readFile(path.join(directory,file),'utf8'),{lang:file.endsWith('.tsx')?'tsx':'ts'}),file);}
async function configuration(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){if(entry.name==='locales'||entry.name==='i18n.json')continue;const file=path.join(directory,entry.name);if(entry.isDirectory())await configuration(file);else if(entry.name.endsWith('.json')){
 const value=JSON.parse(await fs.readFile(file,'utf8'));function visit(v){if(!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(visit);return;}for(const [key,item]of Object.entries(v)){if(['label','help','description','note'].includes(key)&&typeof item==='string')requireKey(item);if(key==='warnings'&&Array.isArray(item))item.filter(x=>typeof x==='string').forEach(requireKey);else visit(item);}}visit(value);
}}}
await configuration('config');
if(missing.size){console.error(JSON.stringify({missing:[...missing]},null,2));process.exitCode=1;}
const params=s=>[...s.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(m=>m[1]).sort().join(',');
if(Object.keys(es).sort().join('\n')!==Object.keys(en).sort().join('\n'))throw new Error('Catalogues have different keys.');
for(const key of Object.keys(es))if(params(es[key])!==params(en[key]))throw new Error(`Different parameters: ${key}`);
console.log(JSON.stringify({catalogueEntries:Object.keys(es).length,missing:missing.size}));

const fieldRules=JSON.parse(await fs.readFile('config/fields.json','utf8'));
for(const [section,rules] of Object.entries(fieldRules))for(const rule of rules){if(typeof rule.help!=='string'||!rule.help.trim())throw new Error(`Missing field help: ${section}.${rule.path}`);}
const uiHelp=JSON.parse(await fs.readFile('config/ui-help.json','utf8')).fields;
for(const file of await fs.readdir('src/web')){if(!file.endsWith('.tsx'))continue;const source=await fs.readFile(path.join('src/web',file),'utf8');function captions(node){if(!node||typeof node!=='object')return;if(node.type==='JSXOpeningElement'&&node.name.name==='FieldCaption'){const name=node.attributes.find(a=>a.name?.name==='name');if(name?.value?.type==='Literal'&&!uiHelp[name.value.value])throw new Error(`Missing form help: ${file}:${name.value.value}`);}for(const item of Object.values(node))if(Array.isArray(item))item.forEach(captions);else if(item&&typeof item==='object')captions(item);}captions(parseAst(source,{lang:'tsx'}));}
console.log(JSON.stringify({fieldHelp:Object.values(fieldRules).flat().length,formHelp:Object.keys(uiHelp).length}));
