/** findSimilarText — normalize text, find candidates, and score a likely match. Run: npx tsx examples/findSimilarText.ts */

// #region usage
import { NgramCandidateIndex } from '@studnicky/matching/candidate-sources';
import { StringNormalizer } from '@studnicky/matching/normalizers';
import { LevenshteinScorer } from '@studnicky/matching/scorers';

const index = new NgramCandidateIndex(3);
const entries = new Map([
  ['978-0132350884', 'Clean Code'],
  ['978-0201633610', 'Design Patterns'],
  ['978-0321125217', 'Domain-Driven Design']
]);

for (const [id, label] of entries) {
  index.register(id, StringNormalizer.normalize(label));
}

const query = StringNormalizer.normalize(' clean code ');
const candidates = index.candidates(query);
const scored = candidates.map((id): { readonly 'id': string; readonly 'score': number } => {
  const label = entries.get(id) ?? '';
  const result = { 'id': id, 'score': LevenshteinScorer.score(query, StringNormalizer.normalize(label)) };
  return result;
}).toSorted((left, right): number => { const result = right.score - left.score; return result; });

console.log('Northstar Books title lookup:', { 'candidates': scored, 'query': query });
// #endregion usage

if (scored[0]?.id !== '978-0132350884' || (scored[0]?.score ?? 0) <= 0.8) {
  throw new Error('Expected the Northstar Books title lookup to select Clean Code with a score above 0.8.');
}
console.log('findSimilarText: all assertions passed');
