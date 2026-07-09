/**
 * IdempotencyGuard Lifecycle Hooks Unit Tests
 *
 * Verifies a subclass overriding onConflict/onReplay/onExecute/onCoalesce
 * observes the right events at the right times.
 */

import { deepStrictEqual, rejects, strictEqual } from 'node:assert/strict';
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

it('a throwing onReplay hook does not replace the cached result', async () => {
  class ThrowingReplayGuard extends IdempotencyGuard {
    static tracked(): ThrowingReplayGuard {
      return new ThrowingReplayGuard({ 'capacity': 10, 'ttlMs': 60_000 });
    }

    protected override onReplay(): void {
      throw new Error('onReplay boom');
    }
  }

  const guard = ThrowingReplayGuard.tracked();

  await guard.run('order-10', { 'amount': 500 }, async () => 'ok');
  const result = await guard.run('order-10', { 'amount': 500 }, async () => 'wrong');

  strictEqual(result, 'ok');
});

it('a throwing onConflict hook does not replace IdempotencyConflictError', async () => {
  class ThrowingConflictGuard extends IdempotencyGuard {
    static tracked(): ThrowingConflictGuard {
      return new ThrowingConflictGuard({ 'capacity': 10, 'ttlMs': 60_000 });
    }

    protected override onConflict(): void {
      throw new Error('onConflict boom');
    }
  }

  const guard = ThrowingConflictGuard.tracked();

  await guard.run('order-11', { 'amount': 500 }, async () => 'ok');

  await rejects(
    () => guard.run('order-11', { 'amount': 999 }, async () => 'wrong'),
    IdempotencyConflictError
  );
});

it('a throwing onExecute hook does not replace the leader result', async () => {
  class ThrowingExecuteGuard extends IdempotencyGuard {
    static tracked(): ThrowingExecuteGuard {
      return new ThrowingExecuteGuard({ 'capacity': 10, 'ttlMs': 60_000 });
    }

    protected override onExecute(): void {
      throw new Error('onExecute boom');
    }
  }

  const guard = ThrowingExecuteGuard.tracked();
  const result = await guard.run('order-12', { 'amount': 500 }, async () => 'ok');

  strictEqual(result, 'ok');
});

it('a throwing onCoalesce hook does not replace the shared follower result', async () => {
  class ThrowingCoalesceGuard extends IdempotencyGuard {
    static tracked(): ThrowingCoalesceGuard {
      return new ThrowingCoalesceGuard({ 'capacity': 10, 'ttlMs': 60_000 });
    }

    protected override onCoalesce(): void {
      throw new Error('onCoalesce boom');
    }
  }

  const guard = ThrowingCoalesceGuard.tracked();
  let resolveFactory: (value: string) => void = () => {};
  const pending = new Promise<string>((resolve) => { resolveFactory = resolve; });

  const factory = async (): Promise<string> => pending;
  const leader = guard.run('order-13', { 'amount': 500 }, factory);
  const follower = guard.run('order-13', { 'amount': 500 }, factory);

  resolveFactory('shared');
  const [leaderResult, followerResult] = await Promise.all([leader, follower]);

  strictEqual(leaderResult, 'shared');
  strictEqual(followerResult, 'shared');
});
