/**
 * Replay Unit Tests
 *
 * A repeat call with the SAME key and the SAME payload replays the cached
 * result without re-running the factory.
 */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { IdempotencyGuard } from '../../../src/index.js';

it('replays the cached result for a repeat call with the same key and payload', async () => {
  const guard = IdempotencyGuard.create({ 'capacity': 10, 'ttlMs': 60_000 });
  let calls = 0;

  const first = await guard.run('order-1', { 'amount': 500 }, async () => {
    calls += 1;
    return { 'chargeId': 'ch_1' };
  });

  const second = await guard.run('order-1', { 'amount': 500 }, async () => {
    calls += 1;
    return { 'chargeId': 'ch_2' };
  });

  strictEqual(calls, 1);
  strictEqual(first.chargeId, 'ch_1');
  strictEqual(second.chargeId, 'ch_1');
});

it('runs the factory again once the cached entry expires', async () => {
  const guard = IdempotencyGuard.create({ 'capacity': 10, 'ttlMs': 10 });
  let calls = 0;

  await guard.run('order-2', { 'amount': 500 }, async () => {
    calls += 1;
    return 'first';
  });

  await new Promise((resolve) => { setTimeout(resolve, 30); });

  const second = await guard.run('order-2', { 'amount': 500 }, async () => {
    calls += 1;
    return 'second';
  });

  strictEqual(calls, 2);
  strictEqual(second, 'second');
});
