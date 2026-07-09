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
