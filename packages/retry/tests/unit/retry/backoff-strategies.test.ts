/**
 * Backoff Strategy Unit Tests
 *
 * Tests for all backoff strategy static methods on BackoffStrategy.
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { BackoffStrategy } from '../../../src/retry/index.js';

void describe('Backoff Strategies', () => {
  void describe('BackoffStrategy.constant', () => {
    void it('returns same delay regardless of attempt number', () => {
      const baseDelay = 100;

      strictEqual(BackoffStrategy.constant(0, baseDelay), 100);
      strictEqual(BackoffStrategy.constant(1, baseDelay), 100);
      strictEqual(BackoffStrategy.constant(2, baseDelay), 100);
      strictEqual(BackoffStrategy.constant(5, baseDelay), 100);
      strictEqual(BackoffStrategy.constant(10, baseDelay), 100);
    });

    void it('returns correct delay for different base values', () => {
      strictEqual(BackoffStrategy.constant(0, 50), 50);
      strictEqual(BackoffStrategy.constant(0, 200), 200);
      strictEqual(BackoffStrategy.constant(0, 1000), 1000);
    });
  });

  void describe('BackoffStrategy.linear', () => {
    void it('increases linearly with attempt number', () => {
      const baseDelay = 100;

      // Delay = baseDelay * (attemptNumber + 1)
      strictEqual(BackoffStrategy.linear(0, baseDelay), 100);
      strictEqual(BackoffStrategy.linear(1, baseDelay), 200);
      strictEqual(BackoffStrategy.linear(2, baseDelay), 300);
      strictEqual(BackoffStrategy.linear(3, baseDelay), 400);
      strictEqual(BackoffStrategy.linear(4, baseDelay), 500);
    });

    void it('works with different base delays', () => {
      strictEqual(BackoffStrategy.linear(0, 50), 50);
      strictEqual(BackoffStrategy.linear(1, 50), 100);
      strictEqual(BackoffStrategy.linear(2, 50), 150);
    });
  });

  void describe('BackoffStrategy.exponential', () => {
    void it('increases exponentially with attempt number', () => {
      const baseDelay = 100;

      // Delay = baseDelay * (2 ^ attemptNumber)
      strictEqual(BackoffStrategy.exponential(0, baseDelay), 100);
      strictEqual(BackoffStrategy.exponential(1, baseDelay), 200);
      strictEqual(BackoffStrategy.exponential(2, baseDelay), 400);
      strictEqual(BackoffStrategy.exponential(3, baseDelay), 800);
      strictEqual(BackoffStrategy.exponential(4, baseDelay), 1600);
    });

    void it('works with different base delays', () => {
      strictEqual(BackoffStrategy.exponential(0, 50), 50);
      strictEqual(BackoffStrategy.exponential(1, 50), 100);
      strictEqual(BackoffStrategy.exponential(2, 50), 200);
      strictEqual(BackoffStrategy.exponential(3, 50), 400);
    });
  });

  void describe('BackoffStrategy.exponentialWithJitter', () => {
    void it('returns value within expected range', () => {
      const baseDelay = 100;

      for (let i = 0; i < 100; i++) {
        const delay = BackoffStrategy.exponentialWithJitter(0, baseDelay);

        // Attempt 0: base delay is 100, jitter multiplier is 0.5-1.5
        // So range is 50-150
        ok(delay >= 50, `Delay ${delay} should be >= 50`);
        ok(delay <= 150, `Delay ${delay} should be <= 150`);
      }
    });

    void it('increases base delay exponentially with jitter range', () => {
      const baseDelay = 100;

      // Sample multiple times to verify range
      // Delay = baseDelay * 2^attempt * jitter(0.5-1.5)
      for (let attempt = 0; attempt <= 3; attempt++) {
        const exponentialBase = baseDelay * Math.pow(2, attempt);
        const minExpected = Math.floor(exponentialBase * 0.5);
        const maxExpected = Math.floor(exponentialBase * 1.5);

        for (let i = 0; i < 50; i++) {
          const delay = BackoffStrategy.exponentialWithJitter(attempt, baseDelay);

          ok(delay >= minExpected, `Attempt ${attempt}: Delay ${delay} should be >= ${minExpected}`);
          ok(delay <= maxExpected, `Attempt ${attempt}: Delay ${delay} should be <= ${maxExpected}`);
        }
      }
    });

    void it('produces varying results due to jitter', () => {
      const results = new Set<number>();

      // Generate multiple values - they should vary due to jitter
      for (let i = 0; i < 20; i++) {
        results.add(BackoffStrategy.exponentialWithJitter(0, 100));
      }

      // Should have some variety (not all the same)
      ok(results.size > 1, 'Jitter should produce varying results');
    });
  });

  void describe('BackoffStrategy.withCeiling', () => {
    void it('caps exponential backoff at maximum', () => {
      const cappedExponential = BackoffStrategy.withCeiling(BackoffStrategy.exponential, 500);

      strictEqual(cappedExponential(0, 100), 100);
      strictEqual(cappedExponential(1, 100), 200);
      strictEqual(cappedExponential(2, 100), 400);
      // Would be 800, capped at 500
      strictEqual(cappedExponential(3, 100), 500);
      // Would be 1600, capped at 500
      strictEqual(cappedExponential(4, 100), 500);
    });

    void it('caps linear backoff at maximum', () => {
      const cappedLinear = BackoffStrategy.withCeiling(BackoffStrategy.linear, 300);

      strictEqual(cappedLinear(0, 100), 100);
      strictEqual(cappedLinear(1, 100), 200);
      // Would be 300, at ceiling
      strictEqual(cappedLinear(2, 100), 300);
      // Would be 400, capped at 300
      strictEqual(cappedLinear(3, 100), 300);
    });

    void it('does not affect constant backoff below ceiling', () => {
      const cappedConstant = BackoffStrategy.withCeiling(BackoffStrategy.constant, 500);

      strictEqual(cappedConstant(0, 100), 100);
      strictEqual(cappedConstant(5, 100), 100);
      strictEqual(cappedConstant(10, 100), 100);
    });

    void it('returns ceiling when delay exceeds it', () => {
      const cappedConstant = BackoffStrategy.withCeiling(BackoffStrategy.constant, 50);

      // Base delay of 100 exceeds ceiling of 50
      strictEqual(cappedConstant(0, 100), 50);
    });
  });
});
