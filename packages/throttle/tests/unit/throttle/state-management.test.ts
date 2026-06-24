/**
 * Throttle State Management Unit Tests
 *
 * Tests for state inspection methods without async operations
 */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Throttle } from '../../../src/throttle/index.js';

// ── getStats() ────────────────────────────────────────────────────────────────

const initialStatsScenarios: Array<{ description: string }> = [
  { description: 'returns correct initial stats' },
  { description: 'returns stats with no operations' },
];

for (const { description } of initialStatsScenarios) {
  void it(description, () => {
    const throttle = Throttle.create({ concurrencyLimit: 5 });
    const stats = throttle.getStats();

    strictEqual(stats.activeCount, 0);
    strictEqual(stats.queuedCount, 0);
    strictEqual(stats.totalExecuted, 0);
    strictEqual(stats.concurrencyLimit, 5);
  });
}

// ── isComplete() ──────────────────────────────────────────────────────────────

void it('returns true when no operations are active or queued', () => {
  const throttle = Throttle.create({ concurrencyLimit: 2 });

  const isComplete = throttle.isComplete();

  strictEqual(isComplete, true, 'Should be complete initially');
});
