/**
 * Coalesce Unit Tests
 *
 * Concurrent calls with the same key and same payload, issued before the
 * first resolves, share one execution — the factory is called exactly once.
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { IdempotencyGuard } from '../../../src/index.js';

it('shares one execution across concurrent calls with the same key and payload', async () => {
  const guard = IdempotencyGuard.create<string>({ 'capacity': 10, 'ttlMs': 60_000 });
  let calls = 0;
  let resolveFactory: (value: string) => void = () => {};
  const pending = new Promise<string>((resolve) => { resolveFactory = resolve; });

  const factory = async (): Promise<string> => {
    calls += 1;
    const result = await pending;
    return result;
  };

  const callA = guard.run('order-5', { 'amount': 500 }, factory);
  const callB = guard.run('order-5', { 'amount': 500 }, factory);

  resolveFactory('shared-result');

  const [resultA, resultB] = await Promise.all([callA, callB]);

  strictEqual(calls, 1);
  deepStrictEqual([resultA, resultB], ['shared-result', 'shared-result']);
});
