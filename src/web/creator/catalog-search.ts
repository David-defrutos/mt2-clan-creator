import {local,type Language} from './presentation';

export const searchNormalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const words=(value:string)=>searchNormalize(value).match(/[\p{L}\p{N}]+/gu)??[];
const tokenCache=new WeakMap<object,Map<any,Set<string>>>();
const vocabularyCache=new WeakMap<object,string[]>();

function mechanicsVocabulary(rules:any){
 let vocabulary=vocabularyCache.get(rules);
 if(vocabulary)return vocabulary;
 const labels=[...Object.values(rules.statusLabels??{}),...(rules.unitAbilities??[]).map((entry:any)=>entry.label)];
 vocabulary=[...new Set(labels.flatMap(label=>Object.values(label as Record<string,string>).flatMap(words)))];
 vocabularyCache.set(rules,vocabulary);
 return vocabulary;
}

function cardTokens(item:any,rules:any){
 let byRules=tokenCache.get(item);
 if(!byRules){byRules=new Map();tokenCache.set(item,byRules);}
 let tokens=byRules.get(rules);
 if(!tokens){
  const clan=rules.officialClans?.[item.clan];
  const data=[...Object.values(item.names??{}),...Object.entries(item.descriptions??{})
   .filter(([key])=>key!=='key').map(([,value])=>value),item.source,item.searchText,local(clan,'en'),local(clan,'es')];
  tokens=new Set(words(data.filter(value=>typeof value==='string').join(' ')));
  byRules.set(rules,tokens);
 }
 return tokens;
}

export function exampleMatcher(query:string,rules:any){
 const options=rules.catalogBrowser??{};
 const stop=new Set((options.stopWords??[]).map(searchNormalize));
 const terms=[...new Set(words(query).filter(term=>!stop.has(term)))];
 if(!terms.length)return ()=>true;
 const vocabulary=mechanicsVocabulary(rules);
 const groups=(options.synonyms??[]).map((group:string[])=>group.map(searchNormalize));
 const alternatives=terms.map(term=>{
  const matches=new Set<string>([term]);
  for(const group of groups)if(group.includes(term)){
   for(const alias of group)matches.add(alias);
  }
  // Only extend verb stems to words used by a known mechanic.
  const root=term.replace(/(?:ando|iendo|ad[oa]s?|id[oa]s?|ar|er|ir)(?:se)?$/,'');
  if(root!==term&&root.length>=4)for(const keyword of vocabulary){
   if(keyword.startsWith(root))matches.add(keyword);
  }
  return [...matches].map(alias=>words(alias));
 });
 return (item:any)=>{
  const tokens=cardTokens(item,rules);
  return alternatives.every(group=>group.some(alias=>alias.every(term=>{
   if(tokens.has(term))return true;
   const cjk=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(term);
   for(const token of tokens)if(cjk?token.includes(term):token.startsWith(term))return true;
   return false;
  })));
 };
}

export function matchesExample(item:any,query:string,_language:Language,rules:any){
 return exampleMatcher(query,rules)(item);
}
// 2026-11-15-1240||codex-clan-editor||clan-creator/src/web/creator/catalog-search.ts||Buscar comportamientos con sinónimos habituales y sin exigir acentos ni términos técnicos
// 2026-11-21-2044||codex-clan-editor||clan-creator/src/web/creator/catalog-search.ts||Buscar frases naturales, palabras completas y raíces de etiquetas bilingües de mecánicas
// 2026-11-21-2045||codex-clan-editor||clan-creator/src/web/creator/catalog-search.ts||Reconocer participios de estados sin buscar raíces fuera del vocabulario conocido
