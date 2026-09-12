/** fuzzyFilter — register a matching plugin with FilterEngine. Run: npx tsx examples/fuzzyFilter.ts */

// #region usage
import { FilterEngine, FilterMode } from '@studnicky/filters/node';
import { LevenshteinAtLeastPlugin } from '@studnicky/matching-filters/node';
import assert from 'node:assert/strict';

const engine = new FilterEngine({
  'conditions': [{
    'operator': 'LevenshteinAtLeastPlugin:LEVENSHTEIN_AT_LEAST',
    'path': 'title',
    'value': { 'threshold': 0.8, 'value': 'refund request' }
  }],
  'gate': 'CORE.AND',
  'mode': FilterMode.CORE.WHITELIST,
  'plugins': [new LevenshteinAtLeastPlugin()]
});

const closeMatch = engine.evaluate({ 'title': 'refund requst' });
const different = engine.evaluate({ 'title': 'shipping update' });

console.log({ 'closeMatch': closeMatch.valid, 'different': different.valid });
// #endregion usage

assert.equal(closeMatch.valid, true);
assert.equal(different.valid, false);
console.log('fuzzyFilter: all assertions passed');
