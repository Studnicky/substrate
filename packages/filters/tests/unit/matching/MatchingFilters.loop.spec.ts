import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { FilterEngine, FilterMode } from '@studnicky/filters/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import {
  CosineAtLeastPlugin,
  DamerauLevenshteinAtLeastPlugin,
  JaccardAtLeastPlugin,
  JaroAtLeastPlugin,
  JaroWinklerAtLeastPlugin,
  LevenshteinAtLeastPlugin,
  NgramAtLeastPlugin,
  SorensenDiceAtLeastPlugin
} from '../../../src/matching/index.js';
import { MatchingFiltersScenarioCaseEntity } from './entities/MatchingFiltersScenarioCaseEntity.js';
import scenarioGroups from './MatchingFilters.scenarios.json' with { 'type': 'json' };

class MatchingFiltersRunners {
  static 'malformed-inputs'(scenarioCase: ScenarioCaseOfType<MatchingFiltersScenarioCaseEntity.Type, 'malformed-inputs'>): void {
    const { expected, input } = scenarioCase;
    assert.equal(new LevenshteinAtLeastPlugin().operators.LEVENSHTEIN_AT_LEAST(input.text, { 'threshold': Number.NaN, 'value': input.text }), expected.levenshtein);
    assert.equal(new NgramAtLeastPlugin().operators.NGRAM_AT_LEAST(input.text, { 'size': 0, 'threshold': input.threshold, 'value': input.text }), expected.ngram);
    assert.equal(new JaccardAtLeastPlugin().operators.JACCARD_AT_LEAST(input.tokens, { 'threshold': input.threshold, 'value': [input.text, input.number] }), expected.jaccard);
    assert.equal(new CosineAtLeastPlugin().operators.COSINE_AT_LEAST(new Map([[input.text, 1]]), { 'threshold': input.threshold, 'value': new Map([[input.text, Number.NaN]]) }), expected.cosine);
  }

  static 'valid-adapters'(scenarioCase: ScenarioCaseOfType<MatchingFiltersScenarioCaseEntity.Type, 'valid-adapters'>): void {
    const { expected, input } = scenarioCase;
    const { cosine, ngram, text, token } = input;
    assert.equal(new LevenshteinAtLeastPlugin().operators.LEVENSHTEIN_AT_LEAST(text.value, { 'threshold': text.threshold, 'value': text.comparison }), expected.levenshtein);
    assert.equal(new DamerauLevenshteinAtLeastPlugin().operators.DAMERAU_LEVENSHTEIN_AT_LEAST(text.transpositionValue, { 'threshold': text.transpositionThreshold, 'value': text.transpositionComparison }), expected.damerauLevenshtein);
    assert.equal(new JaroAtLeastPlugin().operators.JARO_AT_LEAST(text.jaroValue, { 'threshold': text.jaroThreshold, 'value': text.jaroComparison }), expected.jaro);
    assert.equal(new JaroWinklerAtLeastPlugin().operators.JARO_WINKLER_AT_LEAST(text.jaroValue, { 'threshold': text.jaroWinklerThreshold, 'value': text.jaroComparison }), expected.jaroWinkler);
    assert.equal(new NgramAtLeastPlugin().operators.NGRAM_AT_LEAST(ngram.value, { 'size': ngram.size, 'threshold': ngram.threshold, 'value': ngram.comparison }), expected.ngram);
    assert.equal(new JaccardAtLeastPlugin().operators.JACCARD_AT_LEAST(token.value, { 'threshold': token.threshold, 'value': token.comparison }), expected.jaccard);
    assert.equal(new SorensenDiceAtLeastPlugin().operators.SORENSEN_DICE_AT_LEAST(token.value, { 'threshold': token.threshold, 'value': token.comparison }), expected.sorensenDice);
    assert.equal(new CosineAtLeastPlugin().operators.COSINE_AT_LEAST(new Map([[cosine.key, cosine.value]]), { 'threshold': cosine.threshold, 'value': new Map([[cosine.key, cosine.comparison]]) }), expected.cosine);
    const engine = new FilterEngine({
      'conditions': [{ 'operator': 'LevenshteinAtLeastPlugin:LEVENSHTEIN_AT_LEAST', 'path': 'title', 'value': { 'threshold': 0.8, 'value': 'refund request' } }],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST,
      'plugins': [new LevenshteinAtLeastPlugin()]
    });
    assert.equal(engine.evaluate({ 'title': 'refund requst' }).valid, true);
    assert.equal(engine.evaluate({ 'title': 'shipping update' }).valid, false);
  }
}

ScenarioSuite.register({
  'entity': MatchingFiltersScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'matching filter adapters',
  'runners': MatchingFiltersRunners
});
