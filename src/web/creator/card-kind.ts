import {blankCard,maxCardNameLength,type CardDraft} from '../../server/creator/model';

export function duplicateCard(card:CardDraft,uid:string,prefix:string):CardDraft{
 const name=(prefix+' '+card.name).slice(0,maxCardNameLength)
  .replace(/[\uD800-\uDBFF]$/u,'').trimEnd();
 return {...structuredClone(card),uid,name};
}
export function changeCardKind(card:CardDraft,kind:CardDraft['kind'],image=card.image):CardDraft{
 return {...blankCard(kind,card.uid),name:card.name,description:card.description,cost:card.cost,rarity:card.rarity,image,reward:card.reward,unlockLevel:card.unlockLevel};
}
// 2026-11-19-0912||codex-clan-editor||clan-creator/src/web/creator/card-kind.ts||Extraer la conversión de tipo que conserva los campos compatibles
// 2026-11-20-0901||codex-clan-editor||clan-creator/src/web/creator/card-kind.ts||Duplicar con un nombre válido sin cortar un carácter Unicode
