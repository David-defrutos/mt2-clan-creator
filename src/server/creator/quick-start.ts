import {buildOfficialDraft} from './official-clans.js';
import {creatorRules} from './catalog.js';
import {newDraft,saveDraft,validateDraftShape} from './projects.js';
export async function buildQuickDraft(language='en') {
 const rules=await creatorRules(),settings=rules.quickStart;
 const draft=await buildOfficialDraft(settings.clanId,language);
 const units=draft.cards.filter(c=>c.kind==='unit'&&c.banner&&c.reward!==false).slice(0,settings.bannerUnits);
 const spells=draft.cards.filter(c=>c.kind==='spell'&&c.reward!==false).slice(0,settings.spells);
 if(units.length!==settings.bannerUnits||spells.length!==settings.spells)throw Error('Quick start examples are unavailable.');
 draft.cards=[...units,...spells];draft.name='';draft.description='';draft.step=0;draft.guidedMode='quick';
 await validateDraftShape(draft);return draft;
}
export async function createQuickDraft(language='en') {
 const draft=await buildQuickDraft(language),empty=await newDraft();
 return saveDraft({...draft,id:empty.id,revision:empty.revision,updatedAt:empty.updatedAt});
}
// 2026-11-16-2144||codex-clan-editor||clan-creator/src/server/creator/quick-start.ts||Crear clan mínimo guiado desde ejemplos oficiales con campeones sendas iniciales dos unidades y un hechizo
