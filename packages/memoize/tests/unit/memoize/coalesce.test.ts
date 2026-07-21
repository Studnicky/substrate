/**
 * Coalesce unit tests
 *
 * Concurrent calls with the same derived key, issued before the first
 * resolves, share one invocation of `fn` and fire `onMemoCoalesced` for the
 * joining caller.
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Memoize } from '../../../src/index.js';

it('shares one fn invocation across concurrent calls with the same key', async () => {
  let calls = 0;
  let resolveFn: (value: string) => void = () => {};
  const pending = new Promise<string>((resolve) => { resolveFn = resolve; });

  const memo = Memoize.create(
    async (id: string) => {
      calls += 1;
      const result = await pending;
      return `${id}:${result}`;
    },
    { 'keyFn': (id: string) => id, 'capacity': 10 }
  );

  const callA = memo.call('x');
  const callB = memo.call('x');

  resolveFn('shared');

  const [resultA, resultB] = await Promise.all([callA, callB]);

  strictEqual(calls, 1);
  deepStrictEqual([resultA, resultB], ['x:shared', 'x:shared']);
});

it('fires onMemoCoalesced for the joining caller and onMemoMiss for the leader', async () => {
  let resolveFn: (value: string) => void = () => {};
  const pending = new Promise<string>((resolve) => { resolveFn = resolve; });
  const events: string[] = [];

  class TrackedMemoize extends Memoize<[string], string> {
    protected override onMemoMiss(key: string): void {
      events.push(`miss:${key}`);
    }

    protected override onMemoCoalesced(key: string): void {
      events.push(`coalesced:${key}`);
    }
  }

  const memo = TrackedMemoize.create(
    async (id: string) => {
      const result = await pending;
      return `${id}:${result}`;
    },
    { 'keyFn': (id: string) => id, 'capacity': 10 }
  );

  const callA = memo.call('x');
  const callB = memo.call('x');

  resolveFn('shared');
  await Promise.all([callA, callB]);

  deepStrictEqual(events, ['miss:x', 'coalesced:x']);
});

it('dispatches leader and joining hooks to the owning subclass instance', async () => {
  class TrackedMemoize extends Memoize<[string, string], string> {
    readonly events: string[] = [];

    protected override onMemoMiss(key: string, args: [string, string]): void {
      this.events.push(`miss:${key}:${args[1]}`);
    }

    protected override onMemoCoalesced(key: string, args: [string, string]): void {
      this.events.push(`coalesced:${key}:${args[1]}`);
    }
  }

  let resolveA: (value: string) => void = () => {};
  let resolveB: (value: string) => void = () => {};
  const pendingA = new Promise<string>((resolve) => { resolveA = resolve; });
  const pendingB = new Promise<string>((resolve) => { resolveB = resolve; });
  const memoA = TrackedMemoize.create(
    async (key: string, caller: string) => `${caller}:${await pendingA}`,
    { 'keyFn': (key: string) => key, 'capacity': 10 }
  );
  const memoB = TrackedMemoize.create(
    async (key: string, caller: string) => `${caller}:${await pendingB}`,
    { 'keyFn': (key: string) => key, 'capacity': 10 }
  );

  const leaderA = memoA.call('shared', 'leader-a');
  const leaderB = memoB.call('shared', 'leader-b');
  const followerA = memoA.call('shared', 'follower-a');
  const followerB = memoB.call('shared', 'follower-b');

  resolveA('result-a');
  resolveB('result-b');

  deepStrictEqual(
    await Promise.all([leaderA, followerA, leaderB, followerB]),
    ['leader-a:result-a', 'leader-a:result-a', 'leader-b:result-b', 'leader-b:result-b']
  );
  deepStrictEqual(memoA.events, ['miss:shared:leader-a', 'coalesced:shared:follower-a']);
  deepStrictEqual(memoB.events, ['miss:shared:leader-b', 'coalesced:shared:follower-b']);
});

it(
  'a throwing onMemoCoalesced hook does not hang the joining caller or a subsequent call for the same key',
  { 'timeout': 5000 },
  async () => {
    let resolveFn: (value: string) => void = () => {};
    const pending = new Promise<string>((resolve) => { resolveFn = resolve; });

    class ThrowingCoalescedMemoize extends Memoize<[string], string> {
      protected override onMemoCoalesced(): void {
        throw new Error('onMemoCoalesced boom');
      }
    }

    const memo = ThrowingCoalescedMemoize.create(
      async (id: string) => {
        const result = await pending;
        return `${id}:${result}`;
      },
      { 'keyFn': (id: string) => id, 'capacity': 10 }
    );

    const callA = memo.call('x');
    const callB = memo.call('x');

    resolveFn('shared');
    const [resultA, resultB] = await Promise.all([callA, callB]);

    deepStrictEqual([resultA, resultB], ['x:shared', 'x:shared']);

    const next = await memo.call('x');
    deepStrictEqual(next, 'x:shared');
  }
);

it('does not cross-contaminate hook args across concurrent calls for distinct keys', async () => {
  let resolveX: (value: string) => void = () => {};
  let resolveY: (value: string) => void = () => {};
  const pendingX = new Promise<string>((resolve) => { resolveX = resolve; });
  const pendingY = new Promise<string>((resolve) => { resolveY = resolve; });
  const missArgsByKey = new Map<string, [string, number]>();
  const coalescedArgsByKey = new Map<string, [string, number]>();

  class TrackedMemoize extends Memoize<[string, number], string> {
    protected override onMemoMiss(key: string, args: [string, number]): void {
      missArgsByKey.set(key, args);
    }

    protected override onMemoCoalesced(key: string, args: [string, number]): void {
      coalescedArgsByKey.set(key, args);
    }
  }

  const memo = TrackedMemoize.create(
    async (id: string, revision: number) => {
      const pending = id === 'x' ? pendingX : pendingY;
      const result = await pending;
      return `${id}@${revision}:${result}`;
    },
    { 'keyFn': (id: string) => id, 'capacity': 10 }
  );

  // Concurrent leader+follower calls for TWO distinct keys, interleaved so
  // each key's follower call is issued while the other key's leader call is
  // still in its synchronous setup — this would corrupt a single shared
  // `pendingArgs` field but must not corrupt the per-key map.
  const leaderX = memo.call('x', 1);
  const leaderY = memo.call('y', 2);
  const followerX = memo.call('x', 100);
  const followerY = memo.call('y', 200);

  resolveX('resolved-x');
  resolveY('resolved-y');

  const [resultX, resultY, resultFollowerX, resultFollowerY] = await Promise.all([
    leaderX,
    leaderY,
    followerX,
    followerY
  ]);

  deepStrictEqual(resultX, 'x@1:resolved-x');
  deepStrictEqual(resultY, 'y@2:resolved-y');
  deepStrictEqual(resultFollowerX, 'x@1:resolved-x');
  deepStrictEqual(resultFollowerY, 'y@2:resolved-y');

  deepStrictEqual(missArgsByKey.get('x'), ['x', 1]);
  deepStrictEqual(missArgsByKey.get('y'), ['y', 2]);
  deepStrictEqual(coalescedArgsByKey.get('x'), ['x', 100]);
  deepStrictEqual(coalescedArgsByKey.get('y'), ['y', 200]);
});

it(
  'an async onMemoCoalesced hook whose returned promise rejects does not hang the joining caller or a subsequent call',
  { 'timeout': 5000 },
  async () => {
    let resolveFn: (value: string) => void = () => {};
    const pending = new Promise<string>((resolve) => { resolveFn = resolve; });

    class RejectingCoalescedMemoize extends Memoize<[string], string> {
      protected override async onMemoCoalesced(): Promise<void> {
        await Promise.resolve();
        throw new Error('onMemoCoalesced async boom');
      }
    }

    const memo = RejectingCoalescedMemoize.create(
      async (id: string) => {
        const result = await pending;
        return `${id}:${result}`;
      },
      { 'keyFn': (id: string) => id, 'capacity': 10 }
    );

    const callA = memo.call('x');
    const callB = memo.call('x');

    resolveFn('shared');
    const [resultA, resultB] = await Promise.all([callA, callB]);

    deepStrictEqual([resultA, resultB], ['x:shared', 'x:shared']);

    const next = await memo.call('x');
    deepStrictEqual(next, 'x:shared');
  }
);
