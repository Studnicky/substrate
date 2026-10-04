/** fuzzyFilter — find a misspelled Northstar Books catalogue title without matching another title. Run: npx tsx examples/fuzzyFilter.ts */

// #region usage
import { LevenshteinAtLeastPlugin } from '@studnicky/filters/matching';
import { FilterEngine, FilterMode } from '@studnicky/filters/node';
import assert from 'node:assert/strict';

const engine = new FilterEngine({
  'conditions': [{
    'operator': 'LevenshteinAtLeastPlugin:LEVENSHTEIN_AT_LEAST',
    'path': 'title',
    'value': { 'threshold': 0.8, 'value': 'The Dispossessed' }
  }],
  'gate': 'CORE.AND',
  'mode': FilterMode.CORE.WHITELIST,
  'plugins': [new LevenshteinAtLeastPlugin()]
});

const closeMatch = engine.evaluate({ 'title': 'The Dispossed' });
const different = engine.evaluate({ 'title': 'A Wizard of Earthsea' });

console.log({ 'catalogueTitleMatch': closeMatch.valid, 'differentCatalogueTitle': different.valid });
// #endregion usage

assert.equal(closeMatch.valid, true);
assert.equal(different.valid, false);
console.log('fuzzyFilter: all assertions passed');
