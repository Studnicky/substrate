/**
 * IdempotencyGuard Lifecycle Hooks Unit Tests
 *
 * Verifies a subclass overriding onConflict/onReplay/onExecute/onCoalesce
 * observes the right events at the right times.
 */

import { deepStrictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { IdempotencyConflictError, IdempotencyGuard } from '../../../src/index.js';

class TrackingGuard extends IdempotencyGuard {
  readonly replayed: string[] = [];
  readonly coalesced: string[] = [];
  readonly conflicted: string[] = [];
  readonly executed: string[] = [];

  static tracked(): TrackingGuard {
    return new TrackingGuard({ 'capacity': 10, 'ttlMs': 60_000 });
  }

  protected override onReplay(key: string): void {
    this.replayed.push(key);
  }

  protected override onCoalesce(key: string): void {
    this.coalesced.push(key);
  }

  protected override onConflict(key: string): void {
    this.conflicted.push(key);
  }

  protected override onExecute(key: string): void {
    this.executed.push(key);
  }
}

it('fires onExecute when a key is genuinely new', async () => {
  const guard = TrackingGuard.tracked();

  await guard.run('order-6', { 'amount': 500 }, async () => { return 'ok'; });

  deepStrictEqual(guard.executed, ['order-6']);
  deepStrictEqual(guard.replayed, []);
  deepStrictEqual(guard.conflicted, []);
});

it('fires onReplay (not onExecute) on a repeat call with a matching fingerprint', async () => {
  const guard = TrackingGuard.tracked();

  await guard.run('order-7', { 'amount': 500 }, async () => { return 'ok'; });
  await guard.run('order-7', { 'amount': 500 }, async () => { return 'ok'; });

  deepStrictEqual(guard.executed, ['order-7']);
  deepStrictEqual(guard.replayed, ['order-7']);
});

it('fires onConflict before throwing on a payload mismatch', async () => {
  const guard = TrackingGuard.tracked();

  await guard.run('order-8', { 'amount': 500 }, async () => { return 'ok'; });

  await guard.run('order-8', { 'amount': 999 }, async () => { return 'ok'; }).catch((error: unknown) => {
    if (!(error instanceof IdempotencyConflictError)) { throw error; }
  });

  deepStrictEqual(guard.conflicted, ['order-8']);
});

it('fires onCoalesce for a follower that joins an in-flight leader (which fired onExecute)', async () => {
  const guard = TrackingGuard.tracked();
  let resolveFactory: (value: string) => void = () => {};
  const pending = new Promise<string>((resolve) => { resolveFactory = resolve; });

  const factory = async (): Promise<string> => { const result = await pending; return result; };

  const callA = guard.run('order-9', { 'amount': 500 }, factory);
  const callB = guard.run('order-9', { 'amount': 500 }, factory);

  resolveFactory('shared');
  await Promise.all([callA, callB]);

  deepStrictEqual(guard.executed, ['order-9']);
  deepStrictEqual(guard.coalesced, ['order-9']);
});
