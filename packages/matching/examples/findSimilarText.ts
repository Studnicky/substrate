/** findSimilarText — normalize text, find candidates, and score a likely match. Run: npx tsx examples/findSimilarText.ts */

// #region usage
import { LevenshteinScorer, NgramCandidateIndex, StringNormalizer } from '@studnicky/matching/node';
import assert from 'node:assert/strict';

const index = new NgramCandidateIndex(3);
const entries = new Map([
  ['account', 'Account access'],
  ['refund', 'Refund request'],
  ['shipping', 'Shipping status']
]);

for (const [id, label] of entries) {
  index.register(id, StringNormalizer.normalize(label));
}

const query = StringNormalizer.normalize(' refund requst ');
const candidates = index.candidates(query);
const scored = candidates.map((id): { readonly 'id': string; readonly 'score': number } => {
  const label = entries.get(id) ?? '';
  const result = { 'id': id, 'score': LevenshteinScorer.score(query, StringNormalizer.normalize(label)) };
  return result;
}).toSorted((left, right): number => { const result = right.score - left.score; return result; });

console.log({ 'candidates': scored, 'query': query });
// #endregion usage

assert.equal(scored[0]?.id, 'refund');
assert.ok((scored[0]?.score ?? 0) > 0.8);
console.log('findSimilarText: all assertions passed');
