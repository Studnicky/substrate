import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { FlagEvaluator } from '../../src/FlagEvaluator.js';

describe('FlagEvaluator', () => {
  let evaluator: FlagEvaluator;

  beforeEach(() => {
    evaluator = FlagEvaluator.create();
  });

  it('an unregistered flag evaluates to false', () => {
    const result = evaluator.evaluate('never-registered', { 'targetingKey': 'user-1' });

    assert.equal(result, false);
  });

  it('a registered, disabled flag returns its defaultValue', () => {
    evaluator.register('off-flag', { 'defaultValue': true, 'enabled': false });
    evaluator.register('off-flag-2', { 'defaultValue': false, 'enabled': false });

    assert.equal(evaluator.evaluate('off-flag', { 'targetingKey': 'user-1' }), true);
    assert.equal(evaluator.evaluate('off-flag-2', { 'targetingKey': 'user-1' }), false);
  });

  it('a registered, enabled flag with no rolloutPercent (implicit 100) always returns true', () => {
    evaluator.register('full-rollout', { 'defaultValue': false, 'enabled': true });

    for (let i = 0; i < 50; i++) {
      const targetingKey = randomUUID();
      assert.equal(evaluator.evaluate('full-rollout', { 'targetingKey': targetingKey }), true);
    }
  });

  it('a registered, enabled flag with rolloutPercent: 50 produces a roughly 50/50 split', () => {
    // A single 32-bit hash reduced mod 100 is not perfectly uniform over any finite sample,
    // and targeting keys are random per-call — so we assert a tolerance band (35-65%) across
    // a large sample (1000 keys) rather than an exact 50%, which would be flaky by construction.
    evaluator.register('half-rollout', { 'defaultValue': false, 'enabled': true, 'rolloutPercent': 50 });

    const sampleSize = 1000;
    let trueCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      const targetingKey = randomUUID();
      if (evaluator.evaluate('half-rollout', { 'targetingKey': targetingKey })) {
        trueCount += 1;
      }
    }

    const trueRate = trueCount / sampleSize;
    assert.ok(trueRate > 0.35 && trueRate < 0.65, `expected true-rate in (0.35, 0.65), got ${String(trueRate)}`);
  });

  it('the same targetingKey always gets the same result for the same flag (determinism)', () => {
    evaluator.register('deterministic-flag', { 'defaultValue': false, 'enabled': true, 'rolloutPercent': 50 });

    const context = { 'targetingKey': 'stable-user' };
    const first = evaluator.evaluate('deterministic-flag', context);
    const second = evaluator.evaluate('deterministic-flag', context);

    assert.equal(first, second);
  });

  it('different flags with the same targetingKey can independently resolve differently', () => {
    // Registering many flags at 50% rollout for one fixed targetingKey — since the hash
    // incorporates the flag name, not just the targeting key, results should vary across flags.
    const targetingKey = 'fixed-user';
    const results = new Set<boolean>();

    for (let i = 0; i < 20; i++) {
      const flagName = `flag-${String(i)}`;
      evaluator.register(flagName, { 'defaultValue': false, 'enabled': true, 'rolloutPercent': 50 });
      results.add(evaluator.evaluate(flagName, { 'targetingKey': targetingKey }));
    }

    assert.ok(results.has(true) && results.has(false), 'expected both true and false results across flags for a fixed targetingKey');
  });

  it('unregister/has/list work correctly', () => {
    assert.equal(evaluator.has('a'), false);
    assert.deepEqual(evaluator.list(), []);

    evaluator.register('a', { 'defaultValue': false, 'enabled': true });
    evaluator.register('b', { 'defaultValue': false, 'enabled': true });

    assert.equal(evaluator.has('a'), true);
    assert.deepEqual(evaluator.list(), ['a', 'b']);

    evaluator.unregister('a');

    assert.equal(evaluator.has('a'), false);
    assert.deepEqual(evaluator.list(), ['b']);

    // unregistering a name never registered is a no-op, not an error
    evaluator.unregister('never-there');
  });

  it('re-registering the same name replaces the previous definition', () => {
    evaluator.register('flag', { 'defaultValue': false, 'enabled': false });
    assert.equal(evaluator.evaluate('flag', {}), false);

    evaluator.register('flag', { 'defaultValue': true, 'enabled': false });
    assert.equal(evaluator.evaluate('flag', {}), true);
  });
});
