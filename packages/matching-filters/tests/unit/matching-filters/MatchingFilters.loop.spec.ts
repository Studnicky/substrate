import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import {
  CosineAtLeastPlugin,
  DamerauLevenshteinAtLeastPlugin,
  JaccardAtLeastPlugin,
  JaroAtLeastPlugin,
  JaroWinklerAtLeastPlugin,
  LevenshteinAtLeastPlugin,
  NgramAtLeastPlugin,
  SorensenDiceAtLeastPlugin
} from '../../../src/index.js';
import scenarioGroups from './MatchingFilters.scenarios.json' with { type: 'json' };

type ScenarioCase = Record<string, unknown>;
type ScenarioShape = 'malformed-inputs' | 'valid-adapters';

void describe('matching filter adapters', () => {
  for (const scenarioCase of scenarioGroups.cases) {
    void it(requireString(requireValue(scenarioCase, 'name'), 'scenario name'), () => {
      runScenario(requireRecord(scenarioCase, 'scenario case'));
    });
  }
});

function runScenario(scenarioCase: ScenarioCase): void {
  const shape = requireShape(requireValue(scenarioCase, 'shape'));
  const input = requireRecord(requireValue(scenarioCase, 'input'));
  const expected = requireRecord(requireValue(scenarioCase, 'expected'));

  switch (shape) {
    case 'valid-adapters': {
      const text = requireRecord(requireValue(input, 'text'));
      const token = requireRecord(requireValue(input, 'token'));
      const ngram = requireRecord(requireValue(input, 'ngram'));
      const cosine = requireRecord(requireValue(input, 'cosine'));
      assert.equal(new LevenshteinAtLeastPlugin().operators.LEVENSHTEIN_AT_LEAST(requireString(requireValue(text, 'value')), { 'threshold': requireNumber(requireValue(text, 'threshold')), 'value': requireString(requireValue(text, 'comparison')) }), requireBoolean(requireValue(expected, 'levenshtein')));
      assert.equal(new DamerauLevenshteinAtLeastPlugin().operators.DAMERAU_LEVENSHTEIN_AT_LEAST(requireString(requireValue(text, 'transpositionValue')), { 'threshold': requireNumber(requireValue(text, 'transpositionThreshold')), 'value': requireString(requireValue(text, 'transpositionComparison')) }), requireBoolean(requireValue(expected, 'damerauLevenshtein')));
      assert.equal(new JaroAtLeastPlugin().operators.JARO_AT_LEAST(requireString(requireValue(text, 'jaroValue')), { 'threshold': requireNumber(requireValue(text, 'jaroThreshold')), 'value': requireString(requireValue(text, 'jaroComparison')) }), requireBoolean(requireValue(expected, 'jaro')));
      assert.equal(new JaroWinklerAtLeastPlugin().operators.JARO_WINKLER_AT_LEAST(requireString(requireValue(text, 'jaroValue')), { 'threshold': requireNumber(requireValue(text, 'jaroWinklerThreshold')), 'value': requireString(requireValue(text, 'jaroComparison')) }), requireBoolean(requireValue(expected, 'jaroWinkler')));
      assert.equal(new NgramAtLeastPlugin().operators.NGRAM_AT_LEAST(requireString(requireValue(ngram, 'value')), { 'size': requireNumber(requireValue(ngram, 'size')), 'threshold': requireNumber(requireValue(ngram, 'threshold')), 'value': requireString(requireValue(ngram, 'comparison')) }), requireBoolean(requireValue(expected, 'ngram')));
      assert.equal(new JaccardAtLeastPlugin().operators.JACCARD_AT_LEAST(requireStringArray(requireValue(token, 'value')), { 'threshold': requireNumber(requireValue(token, 'threshold')), 'value': requireStringArray(requireValue(token, 'comparison')) }), requireBoolean(requireValue(expected, 'jaccard')));
      assert.equal(new SorensenDiceAtLeastPlugin().operators.SORENSEN_DICE_AT_LEAST(requireStringArray(requireValue(token, 'value')), { 'threshold': requireNumber(requireValue(token, 'threshold')), 'value': requireStringArray(requireValue(token, 'comparison')) }), requireBoolean(requireValue(expected, 'sorensenDice')));
      assert.equal(new CosineAtLeastPlugin().operators.COSINE_AT_LEAST(new Map([[requireString(requireValue(cosine, 'key')), requireNumber(requireValue(cosine, 'value'))]]), { 'threshold': requireNumber(requireValue(cosine, 'threshold')), 'value': new Map([[requireString(requireValue(cosine, 'key')), requireNumber(requireValue(cosine, 'comparison'))]]) }), requireBoolean(requireValue(expected, 'cosine')));
      return;
    }
    case 'malformed-inputs': {
      assert.equal(new LevenshteinAtLeastPlugin().operators.LEVENSHTEIN_AT_LEAST(requireString(requireValue(input, 'text')), { 'threshold': Number.NaN, 'value': requireString(requireValue(input, 'text')) }), requireBoolean(requireValue(expected, 'levenshtein')));
      assert.equal(new NgramAtLeastPlugin().operators.NGRAM_AT_LEAST(requireString(requireValue(input, 'text')), { 'size': 0, 'threshold': requireNumber(requireValue(input, 'threshold')), 'value': requireString(requireValue(input, 'text')) }), requireBoolean(requireValue(expected, 'ngram')));
      assert.equal(new JaccardAtLeastPlugin().operators.JACCARD_AT_LEAST(requireStringArray(requireValue(input, 'tokens')), { 'threshold': requireNumber(requireValue(input, 'threshold')), 'value': [requireString(requireValue(input, 'text')), requireNumber(requireValue(input, 'number'))] }), requireBoolean(requireValue(expected, 'jaccard')));
      assert.equal(new CosineAtLeastPlugin().operators.COSINE_AT_LEAST(new Map([[requireString(requireValue(input, 'text')), 1]]), { 'threshold': requireNumber(requireValue(input, 'threshold')), 'value': new Map([[requireString(requireValue(input, 'text')), Number.NaN]]) }), requireBoolean(requireValue(expected, 'cosine')));
      return;
    }
  }

  return assertNever(shape);
}

function assertNever(value: never): never {
  throw RuntimeError.create(`Unsupported scenario shape: ${value}`);
}

function requireBoolean(value: unknown): boolean {
  if (Predicates.isBoolean(value)) {
    return value;
  }
  throw RuntimeError.create('Expected a boolean scenario value.');
}

function requireNumber(value: unknown): number {
  if (Predicates.isFiniteNumber(value)) {
    return value;
  }
  throw RuntimeError.create('Expected a finite-number scenario value.');
}

function requireRecord(value: unknown, context = 'scenario value'): Record<string, unknown> {
  if (Predicates.isRecord(value)) {
    return value;
  }
  throw RuntimeError.create(`Expected ${context} to be a record.`);
}

function requireShape(value: unknown): ScenarioShape {
  if (value === 'malformed-inputs' || value === 'valid-adapters') {
    return value;
  }
  throw RuntimeError.create('Unsupported scenario shape.');
}

function requireString(value: unknown, context = 'scenario value'): string {
  if (Predicates.isString(value)) {
    return value;
  }
  throw RuntimeError.create(`Expected ${context} to be a string.`);
}

function requireStringArray(value: unknown): string[] {
  if (!Predicates.isArray(value)) {
    throw RuntimeError.create('Expected a string-array scenario value.');
  }

  const result: string[] = [];
  for (const item of value) {
    result.push(requireString(item));
  }
  return result;
}

function requireValue(record: Record<string, unknown>, key: string): unknown {
  if (Object.hasOwn(record, key)) {
    return record[key];
  }
  throw RuntimeError.create(`Expected scenario value ${key}.`);
}
