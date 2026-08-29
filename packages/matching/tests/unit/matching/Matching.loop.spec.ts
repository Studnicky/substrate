import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import {
  AhoCorasickMatcher,
  BloomCandidateFilter,
  CosineScorer,
  CuckooCandidateFilter,
  DamerauLevenshteinScorer,
  DoubleMetaphoneEncoder,
  ExactMatcher,
  GlobMatcher,
  JaccardScorer,
  JaroScorer,
  JaroWinklerScorer,
  LevenshteinScorer,
  LshCandidateIndex,
  MetaphoneEncoder,
  MinimumHashEncoder,
  NgramCandidateIndex,
  NgramExtractor,
  NgramScorer,
  RadixMatcher,
  SoundexEncoder,
  SorensenDiceScorer,
  StringNormalizer,
  SuffixMatcher,
  TfIdfEncoder,
  TokenExtractor,
  TreeMatcher,
  TrieMatcher
} from '../../../src/index.js';

import scenarioGroups from './Matching.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'candidate-materialization'
  | 'cuckoo-rollback'
  | 'normalization-encoding-scoring'
  | 'radix-candidates'
  | 'structural-matching'
  | 'tree-candidates';

type JsonRecord = Record<string, unknown>;
type ScenarioCase = (typeof scenarioGroups.cases)[number];

function requireRecord(value: unknown, context: string): JsonRecord {
  if (!Predicates.isRecord(value)) {
    throw new TypeError(`Expected record for ${context}`);
  }
  return value;
}

function requireValue(record: JsonRecord, key: string): unknown {
  if (!Object.hasOwn(record, key)) {
    throw new TypeError(`Missing ${key}`);
  }
  return Reflect.get(record, key);
}

function requireString(value: unknown, context: string): string {
  if (!Predicates.isString(value)) {
    throw new TypeError(`Expected string for ${context}`);
  }
  return value;
}

function requireNumber(value: unknown, context: string): number {
  if (!Predicates.isFiniteNumber(value)) {
    throw new TypeError(`Expected finite number for ${context}`);
  }
  return value;
}

function requireBoolean(value: unknown, context: string): boolean {
  if (!Predicates.isBoolean(value)) {
    throw new TypeError(`Expected boolean for ${context}`);
  }
  return value;
}

function requireStringArray(value: unknown, context: string): readonly string[] {
  if (!Predicates.isArray(value)) {
    throw new TypeError(`Expected string array for ${context}`);
  }
  const strings: string[] = [];
  for (const item of value) {
    strings.push(requireString(item, context));
  }
  return strings;
}

function requireShape(value: unknown): ScenarioShape {
  if (value === 'candidate-materialization') return value;
  if (value === 'cuckoo-rollback') return value;
  if (value === 'normalization-encoding-scoring') return value;
  if (value === 'radix-candidates') return value;
  if (value === 'structural-matching') return value;
  if (value === 'tree-candidates') return value;
  throw new TypeError(`Unknown matching scenario shape: ${String(value)}`);
}

function runCase(scenarioCase: ScenarioCase): void {
  const input = requireRecord(scenarioCase.input, `${scenarioCase.name} input`);
  const expected = requireRecord(scenarioCase.expected, `${scenarioCase.name} expected`);
  const shape = requireShape(scenarioCase.shape);

  switch (shape) {
    case 'normalization-encoding-scoring': {
      assert.equal(StringNormalizer.normalize(requireString(requireValue(input, 'normalizerInput'), 'normalizerInput')), requireString(requireValue(expected, 'normalizer'), 'normalizer'));
      assert.equal(StringNormalizer.normalize(requireString(requireValue(input, 'unicodeInput'), 'unicodeInput')), requireString(requireValue(expected, 'unicode'), 'unicode'));
      assert.equal(SoundexEncoder.encode(requireString(requireValue(input, 'soundexLeft'), 'soundexLeft')), SoundexEncoder.encode(requireString(requireValue(input, 'soundexRight'), 'soundexRight')));
      assert.equal(MetaphoneEncoder.encode(requireString(requireValue(input, 'metaphoneLeft'), 'metaphoneLeft')), MetaphoneEncoder.encode(requireString(requireValue(input, 'metaphoneRight'), 'metaphoneRight')));
      assert.deepEqual(DoubleMetaphoneEncoder.encode(requireString(requireValue(input, 'doubleMetaphoneInput'), 'doubleMetaphoneInput')), requireStringArray(requireValue(expected, 'doubleMetaphone'), 'doubleMetaphone'));
      assert.equal(LevenshteinScorer.score(requireString(requireValue(input, 'levenshteinLeft'), 'levenshteinLeft'), requireString(requireValue(input, 'levenshteinRight'), 'levenshteinRight')) > requireNumber(requireValue(expected, 'levenshteinMinimum'), 'levenshteinMinimum'), true);
      assert.equal(DamerauLevenshteinScorer.score(requireString(requireValue(input, 'damerauLeft'), 'damerauLeft'), requireString(requireValue(input, 'damerauRight'), 'damerauRight')), requireNumber(requireValue(expected, 'damerau'), 'damerau'));
      assert.equal(JaroScorer.score(requireString(requireValue(input, 'jaroLeft'), 'jaroLeft'), requireString(requireValue(input, 'jaroRight'), 'jaroRight')) > requireNumber(requireValue(expected, 'jaroMinimum'), 'jaroMinimum'), true);
      assert.equal(JaroWinklerScorer.score(requireString(requireValue(input, 'jaroLeft'), 'jaroLeft'), requireString(requireValue(input, 'jaroRight'), 'jaroRight')) > requireNumber(requireValue(expected, 'jaroWinklerMinimum'), 'jaroWinklerMinimum'), true);
      assert.equal(JaccardScorer.score(new Set(requireStringArray(requireValue(input, 'jaccardLeft'), 'jaccardLeft')), new Set(requireStringArray(requireValue(input, 'jaccardRight'), 'jaccardRight'))), requireNumber(requireValue(expected, 'jaccard'), 'jaccard'));
      assert.equal(SorensenDiceScorer.score(new Set(requireStringArray(requireValue(input, 'jaccardLeft'), 'jaccardLeft')), new Set(requireStringArray(requireValue(input, 'jaccardRight'), 'jaccardRight'))), requireNumber(requireValue(expected, 'sorensenDice'), 'sorensenDice'));
      assert.equal(NgramScorer.score(requireString(requireValue(input, 'ngramLeft'), 'ngramLeft'), requireString(requireValue(input, 'ngramRight'), 'ngramRight'), requireNumber(requireValue(input, 'ngramSize'), 'ngramSize')) > 0, true);
      assert.equal(CosineScorer.score(new Map([[requireString(requireValue(input, 'cosineKey'), 'cosineKey'), requireNumber(requireValue(input, 'cosineLeft'), 'cosineLeft')]]), new Map([[requireString(requireValue(input, 'cosineKey'), 'cosineKey'), requireNumber(requireValue(input, 'cosineRight'), 'cosineRight')]])), 1);
      assert.deepEqual(TokenExtractor.extract(requireString(requireValue(input, 'tokenInput'), 'tokenInput')), requireStringArray(requireValue(expected, 'tokens'), 'tokens'));
      assert.deepEqual(
        NgramExtractor.extract(
          requireString(requireValue(input, 'ngramInput'), 'ngramInput'),
          requireNumber(requireValue(input, 'ngramSize'), 'ngramSize'),
        ),
        requireStringArray(requireValue(expected, 'ngrams'), 'ngrams'),
      );
      const tfIdf = TfIdfEncoder.encode(requireString(requireValue(input, 'tfIdfInput'), 'tfIdfInput'), new Map([[requireString(requireValue(input, 'tfIdfToken'), 'tfIdfToken'), requireNumber(requireValue(input, 'documentFrequency'), 'documentFrequency')]]), requireNumber(requireValue(input, 'documentCount'), 'documentCount'));
      const auditWeight = tfIdf.get(requireString(requireValue(input, 'tfIdfToken'), 'tfIdfToken'));
      assert.equal(auditWeight !== undefined && auditWeight > 0, true);
      assert.deepEqual(MinimumHashEncoder.encode(requireString(requireValue(input, 'minHashLeft'), 'minHashLeft'), requireNumber(requireValue(input, 'seed'), 'seed'), requireNumber(requireValue(input, 'signatureSize'), 'signatureSize')), MinimumHashEncoder.encode(requireString(requireValue(input, 'minHashRight'), 'minHashRight'), requireNumber(requireValue(input, 'seed'), 'seed'), requireNumber(requireValue(input, 'signatureSize'), 'signatureSize')));
      return;
    }
    case 'structural-matching': {
      assert.equal(ExactMatcher.matches(requireString(requireValue(input, 'exactPattern'), 'exactPattern'), requireString(requireValue(input, 'exactValue'), 'exactValue')), requireBoolean(requireValue(expected, 'exact'), 'exact'));
      assert.equal(ExactMatcher.matches(requireString(requireValue(input, 'exactPattern'), 'exactPattern'), requireString(requireValue(input, 'exactMiss'), 'exactMiss')), false);
      assert.equal(GlobMatcher.matches(requireString(requireValue(input, 'globDeepPattern'), 'globDeepPattern'), requireString(requireValue(input, 'globValue'), 'globValue')), true);
      assert.equal(GlobMatcher.matches(requireString(requireValue(input, 'globBracePattern'), 'globBracePattern'), requireString(requireValue(input, 'globValue'), 'globValue')), true);
      assert.equal(GlobMatcher.matches(requireString(requireValue(input, 'globClassPattern'), 'globClassPattern'), requireString(requireValue(input, 'globValue'), 'globValue')), true);
      assert.equal(GlobMatcher.matches(requireString(requireValue(input, 'globQuestionPattern'), 'globQuestionPattern'), requireString(requireValue(input, 'globValue'), 'globValue')), true);
      assert.equal(TrieMatcher.matches(requireString(requireValue(input, 'triePattern'), 'triePattern'), requireString(requireValue(input, 'globValue'), 'globValue')), true);
      assert.equal(TrieMatcher.matches(requireString(requireValue(input, 'customDelimiterPattern'), 'customDelimiterPattern'), requireString(requireValue(input, 'customDelimiterValue'), 'customDelimiterValue'), requireString(requireValue(input, 'customDelimiter'), 'customDelimiter')), true);
      const trie = new TrieMatcher(requireString(requireValue(input, 'trieDeepPattern'), 'trieDeepPattern'));
      assert.equal(trie.matches(requireString(requireValue(input, 'trieDeepValue'), 'trieDeepValue')), true);
      assert.equal(trie.matches(requireString(requireValue(input, 'trieMiss'), 'trieMiss')), false);
      assert.equal(RadixMatcher.matches(requireString(requireValue(input, 'radixPattern'), 'radixPattern'), requireString(requireValue(input, 'radixValue'), 'radixValue')), true);
      assert.equal(TreeMatcher.matches(requireString(requireValue(input, 'customDelimiterPattern'), 'customDelimiterPattern'), requireString(requireValue(input, 'customDelimiterValue'), 'customDelimiterValue'), requireString(requireValue(input, 'customDelimiter'), 'customDelimiter')), true);
      assert.equal(SuffixMatcher.matches(requireString(requireValue(input, 'suffixPattern'), 'suffixPattern'), requireString(requireValue(input, 'suffixValue'), 'suffixValue')), true);
      assert.equal(SuffixMatcher.matches(requireString(requireValue(input, 'suffixPattern'), 'suffixPattern'), requireString(requireValue(input, 'suffixMiss'), 'suffixMiss')), false);
      const patterns = new Map<string, string>();
      const ahoPatterns = requireRecord(requireValue(input, 'ahoPatterns'), 'ahoPatterns');
      for (const [pattern, id] of Object.entries(ahoPatterns)) {
        patterns.set(pattern, requireString(id, 'aho pattern id'));
      }
      assert.deepEqual(new AhoCorasickMatcher(patterns).find(requireString(requireValue(input, 'ahoValue'), 'ahoValue')), requireStringArray(requireValue(expected, 'aho'), 'aho'));
      return;
    }
    case 'candidate-materialization': {
      const bloom = new BloomCandidateFilter(requireNumber(requireValue(input, 'bloomBitCount'), 'bloomBitCount'), requireNumber(requireValue(input, 'bloomHashCount'), 'bloomHashCount'));
      bloom.add(requireString(requireValue(input, 'id'), 'id'));
      assert.equal(bloom.mightContain(requireString(requireValue(input, 'id'), 'id')), true);
      const cuckoo = new CuckooCandidateFilter(requireNumber(requireValue(input, 'cuckooBucketCount'), 'cuckooBucketCount'));
      assert.equal(cuckoo.add(requireString(requireValue(input, 'id'), 'id')), true);
      assert.equal(cuckoo.mightContain(requireString(requireValue(input, 'id'), 'id')), true);
      assert.equal(cuckoo.delete(requireString(requireValue(input, 'id'), 'id')), true);
      const ngrams = new NgramCandidateIndex(requireNumber(requireValue(input, 'ngramSize'), 'ngramSize'));
      ngrams.register(requireString(requireValue(input, 'id'), 'id'), requireString(requireValue(input, 'ngramRegisteredValue'), 'ngramRegisteredValue'));
      assert.deepEqual(ngrams.candidates(requireString(requireValue(input, 'ngramQuery'), 'ngramQuery')), requireStringArray(requireValue(expected, 'ngramCandidates'), 'ngramCandidates'));
      assert.equal(ngrams.unregister(requireString(requireValue(input, 'id'), 'id')), true);
      assert.deepEqual(ngrams.candidates(requireString(requireValue(input, 'ngramQuery'), 'ngramQuery')), []);
      const signature = MinimumHashEncoder.encode(requireString(requireValue(input, 'minHashValue'), 'minHashValue'), requireNumber(requireValue(input, 'seed'), 'seed'), requireNumber(requireValue(input, 'signatureSize'), 'signatureSize'));
      const lsh = new LshCandidateIndex(requireNumber(requireValue(input, 'rowsPerBand'), 'rowsPerBand'));
      lsh.register(requireString(requireValue(input, 'id'), 'id'), signature);
      assert.deepEqual(lsh.candidates(signature), requireStringArray(requireValue(expected, 'lshCandidates'), 'lshCandidates'));
      assert.equal(lsh.unregister(requireString(requireValue(input, 'id'), 'id')), true);
      assert.deepEqual(lsh.candidates(signature), []);
      return;
    }
    case 'cuckoo-rollback': {
      const options = requireRecord(requireValue(input, 'options'), 'options');
      const cuckoo = new CuckooCandidateFilter(requireNumber(requireValue(input, 'bucketCount'), 'bucketCount'), { 'bucketSize': requireNumber(requireValue(options, 'bucketSize'), 'bucketSize'), 'relocationLimit': requireNumber(requireValue(options, 'relocationLimit'), 'relocationLimit') });
      assert.equal(cuckoo.add(requireString(requireValue(input, 'first'), 'first')), true);
      assert.equal(cuckoo.add(requireString(requireValue(input, 'second'), 'second')), requireBoolean(requireValue(expected, 'secondAdded'), 'secondAdded'));
      assert.equal(cuckoo.mightContain(requireString(requireValue(input, 'first'), 'first')), true);
      return;
    }
    case 'tree-candidates': {
      const tree = new TreeMatcher();
      tree.register('literal', requireString(requireValue(input, 'literalPattern'), 'literalPattern'));
      tree.register('single', requireString(requireValue(input, 'singlePattern'), 'singlePattern'));
      tree.register('deep', requireString(requireValue(input, 'deepPattern'), 'deepPattern'));
      const topic = requireString(requireValue(input, 'topic'), 'topic');
      assert.deepEqual(tree.candidates(topic), requireStringArray(requireValue(expected, 'beforeUnregister'), 'beforeUnregister'));
      assert.equal(tree.unregister('single'), true);
      assert.deepEqual(tree.candidates(topic), requireStringArray(requireValue(expected, 'afterUnregister'), 'afterUnregister'));
      return;
    }
    case 'radix-candidates': {
      const radix = new RadixMatcher();
      radix.register('users', requireString(requireValue(input, 'usersPattern'), 'usersPattern'));
      radix.register('errors', requireString(requireValue(input, 'errorsPattern'), 'errorsPattern'));
      assert.deepEqual(radix.candidates(requireString(requireValue(input, 'topic'), 'topic')), requireStringArray(requireValue(expected, 'candidates'), 'candidates'));
      assert.deepEqual(radix.candidates(requireString(requireValue(input, 'nestedTopic'), 'nestedTopic')), []);
      assert.equal(radix.unregister('users'), true);
      assert.deepEqual(radix.candidates(requireString(requireValue(input, 'topic'), 'topic')), []);
      return;
    }
  }
}

void describe('matching primitives', () => {
  for (const scenarioCase of scenarioGroups.cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
