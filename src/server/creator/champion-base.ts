import type {Example} from './catalog.js';

export function championBaseDocument(example:Example,document=example.document){
 const upgrade=example.championPath?.localUpgradeId;
 const {section,id}=example.root;
 const definitions=document[section];
 if(!upgrade||!definitions?.some(node=>node.id===id&&node.initial_upgrades?.includes('@'+upgrade)))return document;
 return {...document,[section]:definitions.map(node=>node.id===id?{
  ...node,initial_upgrades:node.initial_upgrades.filter((reference:string)=>reference!=='@'+upgrade),
 }:node)};
}
// 2026-11-19-2129||codex-clan-editor||clan-creator/src/server/creator/champion-base.ts||Separar la mejora propia de la senda del documento del campeón base
