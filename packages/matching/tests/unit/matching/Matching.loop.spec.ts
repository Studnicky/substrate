import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
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
  SorensenDiceScorer,
  SoundexEncoder,
  StringNormalizer,
  SuffixMatcher,
  TfIdfEncoder,
  TokenExtractor,
  TreeMatcher,
  TrieMatcher
} from '../../../src/index.js';
import { MatchingScenarioCaseEntity } from './entities/MatchingScenarioCaseEntity.js';
import scenarioGroups from './Matching.scenarios.json' with { 'type': 'json' };

class MatchingRunners {
  static 'candidate-materialization'(scenarioCase: ScenarioCaseOfType<MatchingScenarioCaseEntity.Type, 'candidate-materialization'>): void {
    const { expected, input } = scenarioCase;
    const bloom = new BloomCandidateFilter(input.bloomBitCount, input.bloomHashCount);
    bloom.add(input.id);
    assert.equal(bloom.mightContain(input.id), true);
    const cuckoo = new CuckooCandidateFilter(input.cuckooBucketCount);
    assert.equal(cuckoo.add(input.id), true);
    assert.equal(cuckoo.mightContain(input.id), true);
    assert.equal(cuckoo.delete(input.id), true);
    const ngrams = new NgramCandidateIndex(input.ngramSize);
    ngrams.register(input.id, input.ngramRegisteredValue);
    assert.deepEqual(ngrams.candidates(input.ngramQuery), expected.ngramCandidates);
    assert.equal(ngrams.unregister(input.id), true);
    assert.deepEqual(ngrams.candidates(input.ngramQuery), []);
    const signature = MinimumHashEncoder.encode(input.minimumHashValue, input.seed, input.signatureSize);
    const lsh = new LshCandidateIndex(input.rowsPerBand);
    lsh.register(input.id, signature);
    assert.deepEqual(lsh.candidates(signature), expected.lshCandidates);
    assert.equal(lsh.unregister(input.id), true);
    assert.deepEqual(lsh.candidates(signature), []);
  }

  static 'cuckoo-rollback'(scenarioCase: ScenarioCaseOfType<MatchingScenarioCaseEntity.Type, 'cuckoo-rollback'>): void {
    const { expected, input } = scenarioCase;
    const options = input.options;
    const cuckoo = new CuckooCandidateFilter(input.bucketCount, { 'bucketSize': options.bucketSize, 'relocationLimit': options.relocationLimit });
    assert.equal(cuckoo.add(input.first), true);
    assert.equal(cuckoo.add(input.second), expected.secondAdded);
    assert.equal(cuckoo.mightContain(input.first), true);
  }

  static 'normalization-encoding-scoring'(scenarioCase: ScenarioCaseOfType<MatchingScenarioCaseEntity.Type, 'normalization-encoding-scoring'>): void {
    const { expected, input } = scenarioCase;
    assert.equal(StringNormalizer.normalize(input.normalizerInput), expected.normalizer);
    assert.equal(StringNormalizer.normalize(input.unicodeInput), expected.unicode);
    assert.equal(SoundexEncoder.encode(input.soundexLeft), SoundexEncoder.encode(input.soundexRight));
    assert.equal(MetaphoneEncoder.encode(input.metaphoneLeft), MetaphoneEncoder.encode(input.metaphoneRight));
    assert.deepEqual(DoubleMetaphoneEncoder.encode(input.doubleMetaphoneInput), expected.doubleMetaphone);
    assert.equal(LevenshteinScorer.score(input.levenshteinLeft, input.levenshteinRight) > expected.levenshteinMinimum, true);
    assert.equal(DamerauLevenshteinScorer.score(input.damerauLeft, input.damerauRight), expected.damerau);
    assert.equal(JaroScorer.score(input.jaroLeft, input.jaroRight) > expected.jaroMinimum, true);
    assert.equal(JaroWinklerScorer.score(input.jaroLeft, input.jaroRight) > expected.jaroWinklerMinimum, true);
    assert.equal(JaccardScorer.score(new Set(input.jaccardLeft), new Set(input.jaccardRight)), expected.jaccard);
    assert.equal(SorensenDiceScorer.score(new Set(input.jaccardLeft), new Set(input.jaccardRight)), expected.sorensenDice);
    assert.equal(NgramScorer.score(input.ngramLeft, input.ngramRight, input.ngramSize) > 0, true);
    assert.equal(CosineScorer.score(new Map([[input.cosineKey, input.cosineLeft]]), new Map([[input.cosineKey, input.cosineRight]])), 1);
    assert.deepEqual(TokenExtractor.extract(input.tokenInput), expected.tokens);
    assert.deepEqual(
      NgramExtractor.extract(
        input.ngramInput,
        input.ngramSize
      ),
      expected.ngrams
    );
    const tfIdf = TfIdfEncoder.encode(input.tfIdfInput, new Map([[input.tfIdfToken, input.documentFrequency]]), input.documentCount);
    const auditWeight = tfIdf.get(input.tfIdfToken);
    assert.equal(auditWeight !== undefined && auditWeight > 0, true);
    assert.deepEqual(MinimumHashEncoder.encode(input.minimumHashLeft, input.seed, input.signatureSize), MinimumHashEncoder.encode(input.minimumHashRight, input.seed, input.signatureSize));
  }

  static 'radix-candidates'(scenarioCase: ScenarioCaseOfType<MatchingScenarioCaseEntity.Type, 'radix-candidates'>): void {
    const { expected, input } = scenarioCase;
    const radix = new RadixMatcher();
    radix.register('users', input.usersPattern);
    radix.register('errors', input.errorsPattern);
    assert.deepEqual(radix.candidates(input.topic), expected.candidates);
    assert.deepEqual(radix.candidates(input.nestedTopic), []);
    assert.equal(radix.unregister('users'), true);
    assert.deepEqual(radix.candidates(input.topic), []);
  }

  static 'structural-matching'(scenarioCase: ScenarioCaseOfType<MatchingScenarioCaseEntity.Type, 'structural-matching'>): void {
    const { expected, input } = scenarioCase;
    assert.equal(ExactMatcher.matches(input.exactPattern, input.exactValue), expected.exact);
    assert.equal(ExactMatcher.matches(input.exactPattern, input.exactMiss), false);
    assert.equal(GlobMatcher.matches(input.globDeepPattern, input.globValue), true);
    assert.equal(GlobMatcher.matches(input.globBracePattern, input.globValue), true);
    assert.equal(GlobMatcher.matches(input.globClassPattern, input.globValue), true);
    assert.equal(GlobMatcher.matches(input.globQuestionPattern, input.globValue), true);
    assert.equal(TrieMatcher.matches(input.triePattern, input.globValue), true);
    assert.equal(TrieMatcher.matches(input.customDelimiterPattern, input.customDelimiterValue, input.customDelimiter), true);
    const trie = new TrieMatcher(input.trieDeepPattern);
    assert.equal(trie.matches(input.trieDeepValue), true);
    assert.equal(trie.matches(input.trieMiss), false);
    assert.equal(RadixMatcher.matches(input.radixPattern, input.radixValue), true);
    assert.equal(TreeMatcher.matches(input.customDelimiterPattern, input.customDelimiterValue, input.customDelimiter), true);
    assert.equal(SuffixMatcher.matches(input.suffixPattern, input.suffixValue), true);
    assert.equal(SuffixMatcher.matches(input.suffixPattern, input.suffixMiss), false);
    const patterns = new Map<string, string>(Object.entries(input.ahoPatterns));
    assert.deepEqual(new AhoCorasickMatcher(patterns).find(input.ahoValue), expected.aho);
  }

  static 'tree-candidates'(scenarioCase: ScenarioCaseOfType<MatchingScenarioCaseEntity.Type, 'tree-candidates'>): void {
    const { expected, input } = scenarioCase;
    const tree = new TreeMatcher();
    tree.register('literal', input.literalPattern);
    tree.register('single', input.singlePattern);
    tree.register('deep', input.deepPattern);
    const topic = input.topic;
    assert.deepEqual(tree.candidates(topic), expected.beforeUnregister);
    assert.equal(tree.unregister('single'), true);
    assert.deepEqual(tree.candidates(topic), expected.afterUnregister);
  }
}

ScenarioSuite.register({
  'entity': MatchingScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'matching primitives',
  'runners': MatchingRunners
});
