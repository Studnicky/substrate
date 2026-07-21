/**
 * IdempotencyGuard Lifecycle Hooks Unit Tests
 *
 * Verifies a subclass overriding onConflict/onReplay/onExecute/onCoalesce
 * observes the right events at the right times.
 */

import { deepStrictEqual, rejects, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { IdempotencyConflictError, IdempotencyGuard } from '../../../src/index.js';

class TrackingGuard extends IdempotencyGuard<string> {
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

it('fires onExecute before invoking the factory for a genuinely new key', async () => {
  const events: string[] = [];

  class OrderedGuard extends IdempotencyGuard<string> {
    static tracked(): OrderedGuard {
      return new OrderedGuard({ 'capacity': 10, 'ttlMs': 60_000 });
    }

    protected override onExecute(): void {
      events.push('execute');
    }
  }

  const guard = OrderedGuard.tracked();

  await guard.run('order-ordered', { 'amount': 500 }, async () => {
    events.push('factory');
    return 'ok';
  });

  deepStrictEqual(events, ['execute', 'factory']);
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

it('dispatches leader and join hooks to each owning subclass instance in order', async () => {
  class IsolatedTrackingGuard extends IdempotencyGuard<string> {
    readonly events: string[] = [];

    static tracked(): IsolatedTrackingGuard {
      return new IsolatedTrackingGuard({ 'capacity': 10, 'ttlMs': 60_000 });
    }

    protected override onExecute(key: string): void {
      this.events.push(`execute:${key}`);
    }

    protected override onCoalesce(key: string): void {
      this.events.push(`coalesce:${key}`);
    }
  }

  const first = IsolatedTrackingGuard.tracked();
  const second = IsolatedTrackingGuard.tracked();
  let firstFactoryCalls = 0;
  let secondFactoryCalls = 0;
  let resolveFirst: (value: string) => void = () => {};
  let resolveSecond: (value: string) => void = () => {};
  const firstPending = new Promise<string>((resolve) => { resolveFirst = resolve; });
  const secondPending = new Promise<string>((resolve) => { resolveSecond = resolve; });
  const firstFactory = async (): Promise<string> => {
    firstFactoryCalls += 1;
    return await firstPending;
  };
  const secondFactory = async (): Promise<string> => {
    secondFactoryCalls += 1;
    return await secondPending;
  };

  const firstLeader = first.run('shared-key', { 'amount': 500 }, firstFactory);
  const secondLeader = second.run('shared-key', { 'amount': 500 }, secondFactory);
  const firstFollower = first.run('shared-key', { 'amount': 500 }, firstFactory);
  const secondFollower = second.run('shared-key', { 'amount': 500 }, secondFactory);

  deepStrictEqual(first.events, ['execute:shared-key', 'coalesce:shared-key']);
  deepStrictEqual(second.events, ['execute:shared-key', 'coalesce:shared-key']);
  strictEqual(firstFactoryCalls, 0);
  strictEqual(secondFactoryCalls, 0);

  resolveFirst('first-result');
  resolveSecond('second-result');

  deepStrictEqual(
    await Promise.all([firstLeader, firstFollower, secondLeader, secondFollower]),
    ['first-result', 'first-result', 'second-result', 'second-result']
  );
  strictEqual(firstFactoryCalls, 1);
  strictEqual(secondFactoryCalls, 1);
});

it('a throwing onReplay hook does not replace the cached result', async () => {
  class ThrowingReplayGuard extends IdempotencyGuard<string> {
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
  class ThrowingConflictGuard extends IdempotencyGuard<string> {
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
  class ThrowingExecuteGuard extends IdempotencyGuard<string> {
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

it('a synchronous onReplay failure is swallowed by the hook invoker and does not propagate from run()', async () => {
  class ThrowingReplayGuard extends IdempotencyGuard<string> {
    static tracked(): ThrowingReplayGuard {
      return new ThrowingReplayGuard({ 'capacity': 10, 'ttlMs': 60_000 });
    }

    protected override onReplay(): void {
      throw new Error('onReplay boom (post-HookInvoking-migration)');
    }
  }

  const guard = ThrowingReplayGuard.tracked();

  await guard.run('order-14', { 'amount': 500 }, async () => 'ok');
  const result = await guard.run('order-14', { 'amount': 500 }, async () => 'wrong');

  strictEqual(result, 'ok');
});

it('an async onReplay override that rejects is routed safely with no unhandled rejection', async () => {
  class AsyncRejectingReplayGuard extends IdempotencyGuard<string> {
    static tracked(): AsyncRejectingReplayGuard {
      return new AsyncRejectingReplayGuard({ 'capacity': 10, 'ttlMs': 60_000 });
    }

    protected override async onReplay(_key: string): Promise<void> {
      await Promise.resolve();
      throw new Error('async onReplay boom');
    }
  }

  const guard = AsyncRejectingReplayGuard.tracked();
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    await guard.run('order-15', { 'amount': 500 }, async () => 'ok');
    const result = await guard.run('order-15', { 'amount': 500 }, async () => 'wrong');

    strictEqual(result, 'ok');

    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });

    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

it('a throwing onCoalesce hook does not replace the shared follower result', async () => {
  class ThrowingCoalesceGuard extends IdempotencyGuard<string> {
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

it('unexpected async lifecycle overrides preserve execute, coalesce, replay, and conflict outcomes without unhandled rejections', async () => {
  const events: string[] = [];
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  class AsyncRejectingHooksGuard extends IdempotencyGuard<string> {
    static tracked(): AsyncRejectingHooksGuard {
      return new AsyncRejectingHooksGuard({ 'capacity': 10, 'ttlMs': 60_000 });
    }

    protected override async onExecute(): Promise<void> {
      events.push('execute');
      await Promise.resolve();
      throw new Error('onExecute async boom');
    }

    protected override async onCoalesce(): Promise<void> {
      events.push('coalesce');
      await Promise.resolve();
      throw new Error('onCoalesce async boom');
    }

    protected override async onReplay(): Promise<void> {
      events.push('replay');
      await Promise.resolve();
      throw new Error('onReplay async boom');
    }

    protected override async onConflict(): Promise<void> {
      events.push('conflict');
      await Promise.resolve();
      throw new Error('onConflict async boom');
    }
  }

  const guard = AsyncRejectingHooksGuard.tracked();
  let resolveFactory: (value: string) => void = () => {};
  const pending = new Promise<string>((resolve) => { resolveFactory = resolve; });
  const factory = async (): Promise<string> => pending;

  try {
    const leader = guard.run('order-16', { 'amount': 500 }, factory);
    const follower = guard.run('order-16', { 'amount': 500 }, factory);
    resolveFactory('shared');

    const [leaderResult, followerResult] = await Promise.all([leader, follower]);
    strictEqual(leaderResult, 'shared');
    strictEqual(followerResult, 'shared');
    strictEqual(await guard.run('order-16', { 'amount': 500 }, async () => 'wrong'), 'shared');
    await rejects(
      () => guard.run('order-16', { 'amount': 999 }, async () => 'wrong'),
      IdempotencyConflictError
    );

    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });

    deepStrictEqual(events, ['execute', 'coalesce', 'replay', 'conflict']);
    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});
