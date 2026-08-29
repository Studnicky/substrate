import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicate } from '../../src/predicates/Predicate.js';
import { Predicates } from '../../src/predicates/Predicates.js';

const TextThresholdPredicate = Predicate.and(
  Predicate.field('value', Predicates.isString),
  Predicate.field('threshold', Predicates.isFiniteNumber)
);

void describe('Predicate composition', () => {
  void it('narrows the fields of a composed record predicate', () => {
    const candidate: unknown = { 'threshold': 0.8, 'value': 'audit' };
    assert.equal(TextThresholdPredicate(candidate), true);
    if (!TextThresholdPredicate(candidate)) {
      assert.fail('Expected candidate to match');
    }
    assert.equal(candidate.value, 'audit');
    assert.equal(candidate.threshold, 0.8);
  });

  void it('requires every array item to match', () => {
    const predicate = Predicate.arrayItems(Predicates.isString);
    assert.equal(predicate(['audit', 'event']), true);
    assert.equal(predicate(['audit', 1]), false);
  });

  void it('requires every map entry to match', () => {
    const predicate = Predicate.mapEntries(Predicates.isString, Predicates.isFiniteNumber);
    assert.equal(predicate(new Map([['audit', 1]])), true);
    assert.equal(predicate(new Map([['audit', Number.NaN]])), false);
  });

  void it('composes alternatives and complements', () => {
    const scalar = Predicate.or(Predicates.isString, Predicates.isFiniteNumber);
    const notString = Predicate.not(Predicates.isString);
    assert.equal(scalar('audit'), true);
    assert.equal(scalar(0.8), true);
    assert.equal(scalar(false), false);
    assert.equal(notString('audit'), false);
    assert.equal(notString(0.8), true);
  });
});
