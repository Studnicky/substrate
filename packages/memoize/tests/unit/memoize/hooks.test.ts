/**
 * Hook unit tests
 *
 * `onMemoHit`/`onMemoMiss` fire on the expected path with the derived key
 * and the original call arguments.
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Memoize } from '../../../src/index.js';

it('fires onMemoMiss then onMemoHit with key and args', async () => {
  const events: string[] = [];

  class TrackedMemoize extends Memoize<[string, number], string> {
    protected override onMemoHit(key: string, args: [string, number]): void {
      events.push(`hit:${key}:${JSON.stringify(args)}`);
    }

    protected override onMemoMiss(key: string, args: [string, number]): void {
      events.push(`miss:${key}:${JSON.stringify(args)}`);
    }
  }

  const memo = TrackedMemoize.create(
    (id: string, revision: number) => `${id}@${revision}`,
    { 'keyFn': (id: string, revision: number) => `${id}:${revision}`, 'capacity': 10 }
  );

  await memo.call('order-1', 3);
  await memo.call('order-1', 3);

  deepStrictEqual(events, [
    'miss:order-1:3:["order-1",3]',
    'hit:order-1:3:["order-1",3]'
  ]);
});

it('fires onMemoMiss before invoking the wrapped function', async () => {
  const events: string[] = [];

  class TrackedMemoize extends Memoize<[string], string> {
    protected override onMemoMiss(): void {
      events.push('miss');
    }
  }

  const memo = TrackedMemoize.create(
    (id: string) => {
      events.push('function');
      return `value:${id}`;
    },
    { 'keyFn': (id: string) => id, 'capacity': 10 }
  );

  await memo.call('a');

  deepStrictEqual(events, ['miss', 'function']);
});

it('a throwing onMemoHit hook does not replace a cached return value', async () => {
  class ThrowingHitMemoize extends Memoize<[string], string> {
    protected override onMemoHit(): void {
      throw new Error('onMemoHit boom');
    }
  }

  const memo = ThrowingHitMemoize.create(
    (id: string) => `value:${id}`,
    { 'keyFn': (id: string) => id, 'capacity': 10 }
  );

  await memo.call('a');
  const value = await memo.call('a');

  deepStrictEqual(value, 'value:a');
});

it(
  'a throwing onMemoMiss hook does not hang the triggering call or a subsequent call for the same key',
  { 'timeout': 5000 },
  async () => {
    class ThrowingMissMemoize extends Memoize<[string], string> {
      protected override onMemoMiss(): void {
        throw new Error('onMemoMiss boom');
      }
    }

    const memo = ThrowingMissMemoize.create(
      (id: string) => `value:${id}`,
      { 'keyFn': (id: string) => id, 'capacity': 10 }
    );

    const first = await memo.call('a');
    deepStrictEqual(first, 'value:a');

    const second = await memo.call('a');
    deepStrictEqual(second, 'value:a');
  }
);

it('unexpected async hit, miss, and coalesced overrides preserve results without unhandled rejections', async () => {
  const events: string[] = [];
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  class AsyncRejectingHooksMemoize extends Memoize<[string], string> {
    protected override async onMemoHit(): Promise<void> {
      events.push('hit');
      await Promise.resolve();
      throw new Error('onMemoHit async boom');
    }

    protected override async onMemoMiss(): Promise<void> {
      events.push('miss');
      await Promise.resolve();
      throw new Error('onMemoMiss async boom');
    }

    protected override async onMemoCoalesced(): Promise<void> {
      events.push('coalesced');
      await Promise.resolve();
      throw new Error('onMemoCoalesced async boom');
    }
  }

  let resolveFactory: (value: string) => void = () => {};
  const pending = new Promise<string>((resolve) => { resolveFactory = resolve; });
  const memo = AsyncRejectingHooksMemoize.create(
    async () => pending,
    { 'keyFn': (id: string) => id, 'capacity': 10 }
  );

  try {
    const leader = memo.call('a');
    const follower = memo.call('a');
    resolveFactory('value:a');

    const [leaderResult, followerResult] = await Promise.all([leader, follower]);
    strictEqual(leaderResult, 'value:a');
    strictEqual(followerResult, 'value:a');
    strictEqual(await memo.call('a'), 'value:a');

    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });

    deepStrictEqual(events, ['miss', 'coalesced', 'hit']);
    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

it(
  'an async onMemoMiss hook whose returned promise rejects does not hang the triggering call or a subsequent call',
  { 'timeout': 5000 },
  async () => {
    class RejectingMissMemoize extends Memoize<[string], string> {
      protected override async onMemoMiss(): Promise<void> {
        await Promise.resolve();
        throw new Error('onMemoMiss async boom');
      }
    }

    const memo = RejectingMissMemoize.create(
      (id: string) => `value:${id}`,
      { 'keyFn': (id: string) => id, 'capacity': 10 }
    );

    const first = await memo.call('a');
    deepStrictEqual(first, 'value:a');

    const second = await memo.call('a');
    deepStrictEqual(second, 'value:a');
  }
);
