import test from 'node:test';
import assert from 'node:assert/strict';
import {creatorRules,readExample,cloneExampleCard,exampleParameters} from '../src/server/creator/catalog.ts';
import {description} from '../src/web/creator/presentation.ts';
import {gameText} from '../src/server/creator/description-tokens.ts';
test('native nested tokens resolve effects traits upgrades statuses and preserve ordinary keywords',async()=>{const rules=await creatorRules(),doc={cards:[{id:'c',effects:['@e'],traits:['@t']}],effects:[{id:'e',param_status_effects:[{status:'regen',count:4}],param_upgrade:'@u'}],upgrades:[{id:'u',bonus_unhealed_hp:20}],traits:[{id:'t',param_int:3}]};assert.equal(gameText('[trait0.power] [effect0.status0.power] [effect0.upgrade.unhealedbonushp] [resolve]',doc,{section:'cards',definition:doc.cards[0]},'en',rules),'3 4 20 Resolve');});
test('native previews show actual upgrade amounts and equipment resolve instead of stale root tokens',async()=>{const rules=await creatorRules();for(const [id,pattern]of [['official-HuskHermit',/Revenge:.*3/],['official-Fortify',/Resolve:.*6/]] as const){const e=await readExample(id),c=cloneExampleCard(e,'test','en');const text=description(c,{example:e,parameters:exampleParameters(e)},'en',rules);assert.match(text,pattern);assert.doesNotMatch(text,/variable value|effect0[.]|paramint/i);}});
// 2026-11-15-2107||codex-clan-editor||clan-creator/tests/creator-description-tokens.test.ts||Verificar cantidades anidadas nativas y regresiones de Husk Hermit y Fortified Pauldrons
// 2026-11-15-2108||codex-clan-editor||clan-creator/tests/creator-description-tokens.test.ts||Contrastar activacion post_combat real de Fortified Pauldrons
