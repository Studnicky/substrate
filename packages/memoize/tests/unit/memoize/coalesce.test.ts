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
  ) as TrackedMemoize;

  const callA = memo.call('x');
  const callB = memo.call('x');

  resolveFn('shared');
  await Promise.all([callA, callB]);

  deepStrictEqual(events, ['miss:x', 'coalesced:x']);
});
