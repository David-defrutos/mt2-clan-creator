export function stringLiterals(source){const matches=source.matchAll(/\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|@"(?:[^"]|"")*"|\$?"(?:\\.|[^"\\])*"/g);return [...matches].filter(m=>!m[0].startsWith('/')).map(m=>m[0]).join('\n');}
export function mentions(text,id){const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(?<![A-Za-z0-9_])'+escaped+'(?![A-Za-z0-9_])').test(text);}
export function referenceSection(key,owner,preferred){if(key==='triggers')return owner==='cards'?'card_triggers':'character_triggers';if(key==='trigger')return owner==='card_triggers'?'card_trigger_types':'character_trigger_types';return preferred[key];}
export function resolveLocal(index,id,section){return (index.get(id)??[]).filter(e=>!section||e.section===section);}
// 2026-11-15-1909||codex-clan-editor||clan-creator/scripts/catalog-audit-core.mjs||Resolver referencias por sección y detectar ambigüedades reales sin ocultar definiciones duplicadas
