import {collectionStep,stepForCard,type WizardStep} from './wizard-steps.js';
import type {Example} from './catalog.js';
import {removeTemplateEffects} from './template-effects.js';
import {allCards,type CardDraft,type Draft} from './model.js';
export interface ReviewIssue {step:number;message:string;messageEn:string;uid?:string;field?:string}
export function needsSpellReview(card:CardDraft){
 return card.kind==='spell'&&!card.effects.length&&!!card.templateId&&!!card.removedTemplateEffects?.length;
}
export function needsTemplateReview(card:CardDraft){
 return needsSpellReview(card)||['room','artifact'].includes(card.kind)&&!!card.templateId&&!!card.removedTemplateEffects?.length||!!card.templateId?.endsWith('-simplified');
}
export function copiedCardNeedsPassive(card:CardDraft,example?:Example){
 if(!['room','artifact'].includes(card.kind)||!example||!card.removedTemplateEffects?.length)return false;
 const document=structuredClone(example.document);
 removeTemplateEffects(document,example.root,card.removedTemplateEffects);
 const root=document[example.root.section]?.find(entry=>entry.id===example.root.id);
 if(card.kind==='artifact')return !root?.relic_effects?.length;
 return !root?.effects?.length&&!root?.triggers?.length&&!root?.traits?.length;
}
function isEmptySpell(card:CardDraft,example?:Example){
 if(card.kind!=='spell'||card.effects.length)return false;
 if(!card.templateId)return true;
 if(!needsTemplateReview(card)||!example||example.costType==='unplayable')return false;
 const document=structuredClone(example.document);
 removeTemplateEffects(document,example.root,card.removedTemplateEffects);
 const root=document[example.root.section]?.find(entry=>entry.id===example.root.id);
 return !root?.effects?.length&&!root?.triggers?.length&&!root?.traits?.length;
}
export function draftIssues(d:Draft,steps:WizardStep[],getExample:(id:string)=>Example|undefined=()=>undefined){
 const issues:ReviewIssue[]=[],issue=(step:number,message:string,messageEn:string,uid?:string,field?:string)=>issues.push({step,message,messageEn,uid,field});
 if(!d.name.trim())issue(steps.findIndex(s=>s.type==='identity'),'Pon un nombre a tu clan.','Give your clan a name.',undefined,'name');
 d.champions.forEach((c,i)=>{const step=stepForCard(steps,d,c.card);if(!c.card.name.trim())issue(step,`Pon nombre al campeón ${i+1}.`,`Name champion ${i+1}.`,c.card.uid,'name');if(c.card.health<1)issue(step,'El campeón necesita salud mayor que cero.','Champion health must be greater than zero.',c.card.uid,'health');if(c.card.size<1)issue(step,'El campeón necesita capacidad mayor que cero.','Champion capacity must be greater than zero.',c.card.uid,'size');c.paths.forEach((p,j)=>{if(!p.name.trim())issue(steps.findIndex(s=>s.id===`path-${i}-${j}`),`Pon nombre a la senda ${j+1} del campeón ${i+1}.`,`Name path ${j+1} of champion ${i+1}.`,undefined,'pathName');});});
 d.starters.forEach((c,i)=>{if(!c.name.trim())issue(stepForCard(steps,d,c),`Completa la carta inicial ${i+1}.`,`Complete starter card ${i+1}.`,c.uid,'name');});
 if(!d.cards.some(c=>c.kind!=='artifact'&&!c.banner&&c.reward!==false))issue(collectionStep(steps,'spell'),'Añade un hechizo, una sala o una unidad sin estandarte para las recompensas normales.','Add a spell, a room, or a non-banner unit for normal rewards.',undefined,'collection');
 if(d.cards.filter(c=>c.kind==='unit'&&c.banner&&c.reward!==false).length<2){const candidate=d.cards.find(c=>c.kind==='unit'&&!c.banner&&c.reward!==false);issue(collectionStep(steps,'unit'),'Añade al menos dos unidades y márcalas como unidades de estandarte.','Add at least two units and mark them as banner units.',candidate?.uid,candidate?'banner':'collection');}
 for(const c of d.cards){const step=collectionStep(steps,c.kind);if(!c.name.trim())issue(step,'Hay una carta sin nombre.','A card has no name.',c.uid,'name');if(c.kind==='unit'&&c.health<1)issue(step,`${c.name||'La unidad'} necesita salud mayor que cero.`,`${c.name||'The unit'} needs health greater than zero.`,c.uid,'health');if(c.kind==='unit'&&c.size<1)issue(step,`${c.name||'La unidad'} necesita capacidad mayor que cero.`,`${c.name||'The unit'} needs capacity greater than zero.`,c.uid,'size');if(['room','artifact'].includes(c.kind)&&!c.templateId&&!c.passive)issue(step,'Elige un efecto para tu sala o artefacto.','Choose an effect for your room or artifact.',c.uid,'effects');}
 for(const stone of d.stones??[])if(!stone.name.trim())issue(steps.findIndex(s=>s.type==='stones'),'Pon un nombre a cada piedra o losa.','Name each stone or slab.');
 for(const c of allCards(d)){
  const example=c.templateId?getExample(c.templateId):undefined;
  if(isEmptySpell(c,example)||copiedCardNeedsPassive(c,example)&&!c.passive||example?.simplified?.needsEffect&&!c.passive&&!c.effects.length){
   const step=stepForCard(steps,d,c);
   issue(step,`${c.name||'La carta'} necesita al menos un efecto.`,`${c.name||'The card'} needs at least one effect.`,c.uid,'effects');
  }
 }
 return issues;
}
// 2026-11-17-0021||codex-clan-editor||clan-creator/src/server/creator/validation.ts||Compartir validación síncrona entre campos avance y revisión final
// 2026-11-20-0901||codex-clan-editor||clan-creator/src/server/creator/validation.ts||Revisar el hechizo real que queda después de eliminar los efectos copiados
// 2026-11-20-0902||codex-clan-editor||clan-creator/src/server/creator/validation.ts||Reconocer rasgos nativos que siguen dando comportamiento al hechizo
// 2026-11-21-1100||codex-clan-editor||clan-creator/src/server/creator/validation.ts||Pedir un efecto para las bases simplificadas que quedaron sin mecánica
// 2026-11-21-1217||codex-clan-editor||clan-creator/src/server/creator/validation.ts||Dirigir los avisos hacia el paso del tipo de carta correspondiente
// 2026-11-21-1333||codex-clan-editor||clan-creator/src/server/creator/validation.ts||Avisar si una piedra o losa queda sin nombre al instalar
// 2026-11-21-1513||codex-clan-editor||clan-creator/src/server/creator/validation.ts||Pedir una nueva regla si se quita el último efecto de una sala
// 2026-11-21-1814||codex-clan-editor||clan-creator/src/server/creator/validation.ts||Detectar artefactos copiados que necesitan un efecto tras quitar el último
// 2026-11-21-1817||codex-clan-editor||clan-creator/src/server/creator/validation.ts||Mantener libre la eliminación del último efecto de una reliquia y ofrecer la sustitución opcional
// 2026-11-21-1901||codex-clan-editor||clan-creator/src/server/creator/validation.ts||Avisar en la revisión cuando un artefacto copiado queda vacío
