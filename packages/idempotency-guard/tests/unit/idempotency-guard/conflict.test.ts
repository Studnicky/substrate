/**
 * Conflict Unit Tests
 *
 * A repeat call with the SAME key and a DIFFERENT payload throws
 * IdempotencyConflictError and does NOT re-run the factory.
 */

import { rejects, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { IdempotencyConflictError, IdempotencyGuard } from '../../../src/index.js';

it('throws IdempotencyConflictError when the same key is reused with a different payload', async () => {
  const guard = IdempotencyGuard.create<string>({ 'capacity': 10, 'ttlMs': 60_000 });
  let calls = 0;

  await guard.run('order-3', { 'amount': 500 }, async () => {
    calls += 1;
    return 'ok';
  });

  await rejects(
    async () => {
      await guard.run('order-3', { 'amount': 999 }, async () => {
        calls += 1;
        return 'ok';
      });
    },
    IdempotencyConflictError
  );

  strictEqual(calls, 1);
});

it('sets the conflicting key on IdempotencyConflictError', async () => {
  const guard = IdempotencyGuard.create<string>({ 'capacity': 10, 'ttlMs': 60_000 });

  await guard.run('order-4', { 'amount': 500 }, async () => { return 'ok'; });

  try {
    await guard.run('order-4', { 'amount': 999 }, async () => { return 'ok'; });
    throw new Error('expected IdempotencyConflictError to be thrown');
  } catch (error) {
    if (!(error instanceof IdempotencyConflictError)) { throw error; }
    strictEqual(error.key, 'order-4');
    strictEqual(error.code, 'idempotencyGuard.conflict');
  }
});
