/**
 * Throttle State Management Unit Tests
 *
 * Tests for state inspection methods without async operations
 */

import { strictEqual } from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { Throttle } from '../../../src/throttle/index.js';

void describe('State Management', () => {
  void describe('getStats()', () => {
    void it('returns correct initial stats', () => {
      const throttle = new Throttle({ concurrencyLimit: 5 });

      const stats = throttle.getStats();

      strictEqual(stats.activeCount, 0);
      strictEqual(stats.queuedCount, 0);
      strictEqual(stats.totalExecuted, 0);
      strictEqual(stats.concurrencyLimit, 5);
    });

    void it('returns stats with no operations', () => {
      const throttle = new Throttle({ concurrencyLimit: 5 });

      const stats = throttle.getStats();

      strictEqual(stats.activeCount, 0);
      strictEqual(stats.queuedCount, 0);
      strictEqual(stats.totalExecuted, 0);
      strictEqual(stats.concurrencyLimit, 5);
    });
  });

  void describe('isComplete()', () => {
    void it('returns true when no operations are active or queued', () => {
      const throttle = new Throttle({ concurrencyLimit: 2 });

      const isComplete = throttle.isComplete();

      strictEqual(isComplete, true, 'Should be complete initially');
    });
  });
});
