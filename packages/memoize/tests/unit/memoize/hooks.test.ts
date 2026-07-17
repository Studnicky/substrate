/**
 * Hook unit tests
 *
 * `onMemoHit`/`onMemoMiss` fire on the expected path with the derived key
 * and the original call arguments.
 */

import { deepStrictEqual } from 'node:assert/strict';
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
  ) as TrackedMemoize;

  await memo.call('order-1', 3);
  await memo.call('order-1', 3);

  deepStrictEqual(events, [
    'miss:order-1:3:["order-1",3]',
    'hit:order-1:3:["order-1",3]'
  ]);
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
  ) as ThrowingHitMemoize;

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
    ) as ThrowingMissMemoize;

    const first = await memo.call('a');
    deepStrictEqual(first, 'value:a');

    const second = await memo.call('a');
    deepStrictEqual(second, 'value:a');
  }
);

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
    ) as RejectingMissMemoize;

    const first = await memo.call('a');
    deepStrictEqual(first, 'value:a');

    const second = await memo.call('a');
    deepStrictEqual(second, 'value:a');
  }
);
