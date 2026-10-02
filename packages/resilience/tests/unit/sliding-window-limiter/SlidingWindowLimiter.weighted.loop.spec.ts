import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SlidingWindowExhaustedError } from '../../../src/SlidingWindowExhaustedError.js';
import { SlidingWindowLimiter } from '../../../src/SlidingWindowLimiter.js';

class WeightedConsumptionScenarios {
  static readonly algorithms: readonly ('counter' | 'log')[] = ['log', 'counter'];

  static buildLimiter(algorithm: 'counter' | 'log'): SlidingWindowLimiter {
    const result = SlidingWindowLimiter.create({
      'algorithm': algorithm,
      'clock': (): number => {return 0;},
      'limit': 3,
      'windowMs': 100
    });
    return result;
  }

  static assertConsumesRequestedUnits(algorithm: 'counter' | 'log'): void {
    const limiter = WeightedConsumptionScenarios.buildLimiter(algorithm);

    assert.deepStrictEqual(limiter.consume(1.5), {
      'consumedTokens': 1.5,
      'remainingTokens': 1.5
    });
    assert.deepStrictEqual(limiter.consume(1.5), {
      'consumedTokens': 1.5,
      'remainingTokens': 0
    });
    assert.throws(() => {
      limiter.consume();
    }, SlidingWindowExhaustedError);
  }

  static async assertWaitsForRequestedUnits(algorithm: 'counter' | 'log'): Promise<void> {
    const limiter = WeightedConsumptionScenarios.buildLimiter(algorithm);

    assert.deepStrictEqual(await limiter.waitForToken({ 'tokens': 1.5 }), {
      'consumedTokens': 1.5,
      'remainingTokens': 1.5
    });
    assert.deepStrictEqual(await limiter.waitForToken({ 'tokens': 1.5 }), {
      'consumedTokens': 1.5,
      'remainingTokens': 0
    });

    const impossible = WeightedConsumptionScenarios.buildLimiter(algorithm);
    await assert.rejects(() => {
      const waiting = impossible.waitForToken({ 'tokens': 4.5 });
      return waiting;
    }, SlidingWindowExhaustedError);
  }

  static declaresAlgorithmScenarios(): void {
    for (let index = 0; index < WeightedConsumptionScenarios.algorithms.length; index += 1) {
      const algorithm = WeightedConsumptionScenarios.algorithms[index];
      if (algorithm !== undefined) {
        void it(`${algorithm} consumes requested units and reports remaining capacity`, () => {
          WeightedConsumptionScenarios.assertConsumesRequestedUnits(algorithm);
        });

        void it(`${algorithm} waits for requested units and rejects impossible requests`, async () => {
          await WeightedConsumptionScenarios.assertWaitsForRequestedUnits(algorithm);
        });
      }
    }
  }

  static declaresFractionalExpiry(): void {
    void it('log retains fractional admissions until each timestamp expires', () => {
      let time = 0;
      const limiter = SlidingWindowLimiter.create({
        'algorithm': 'log',
        'clock': (): number => {return time;},
        'limit': 1,
        'windowMs': 100
      });

      assert.deepStrictEqual(limiter.consume(0.25), { 'consumedTokens': 0.25, 'remainingTokens': 0.75 });
      time = 50;
      assert.deepStrictEqual(limiter.consume(0.25), { 'consumedTokens': 0.25, 'remainingTokens': 0.5 });
      time = 101;
      assert.deepStrictEqual(limiter.consume(0.75), { 'consumedTokens': 0.75, 'remainingTokens': 0 });
      time = 151;
      assert.deepStrictEqual(limiter.consume(0.25), { 'consumedTokens': 0.25, 'remainingTokens': 0 });
    });
  }
}

void describe('SlidingWindowLimiter weighted consumption', () => {
  WeightedConsumptionScenarios.declaresAlgorithmScenarios();
  WeightedConsumptionScenarios.declaresFractionalExpiry();
});
