import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SlidingWindowExhaustedError } from '../../../src/SlidingWindowExhaustedError.js';
import { SlidingWindowLimiter } from '../../../src/SlidingWindowLimiter.js';

const algorithms: readonly ('counter' | 'log')[] = ['log', 'counter'];

function createLimiter(algorithm: 'counter' | 'log'): SlidingWindowLimiter {
  const result = SlidingWindowLimiter.create({
    'algorithm': algorithm,
    'clock': (): number => 0,
    'limit': 3,
    'windowMs': 100
  });
  return result;
}

void describe('SlidingWindowLimiter weighted consumption', () => {
  for (const algorithm of algorithms) {
    void it(algorithm + ' consumes requested units and reports remaining capacity', () => {
      const limiter = createLimiter(algorithm);

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
    });

    void it(algorithm + ' waits for requested units and rejects impossible requests', async () => {
      const limiter = createLimiter(algorithm);

      assert.deepStrictEqual(await limiter.waitForToken({ 'tokens': 1.5 }), {
        'consumedTokens': 1.5,
        'remainingTokens': 1.5
      });
      assert.deepStrictEqual(await limiter.waitForToken({ 'tokens': 1.5 }), {
        'consumedTokens': 1.5,
        'remainingTokens': 0
      });

      const impossible = createLimiter(algorithm);
      await assert.rejects(() => impossible.waitForToken({ 'tokens': 4.5 }), SlidingWindowExhaustedError);
    });
  }

  void it('log retains fractional admissions until each timestamp expires', () => {
    let time = 0;
    const limiter = SlidingWindowLimiter.create({
      'algorithm': 'log',
      'clock': (): number => time,
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
});
