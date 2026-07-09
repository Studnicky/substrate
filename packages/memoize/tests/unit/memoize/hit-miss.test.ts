/**
 * Hit/miss unit tests
 *
 * Repeated calls whose args derive the same key return the cached result
 * without re-invoking `fn`; calls whose args derive different keys invoke
 * `fn` independently.
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Memoize } from '../../../src/index.js';

it('returns the cached result without re-invoking fn for a repeat key', async () => {
  let calls = 0;
  const memo = Memoize.create(
    (id: string) => {
      calls += 1;
      return `value:${id}`;
    },
    { 'keyFn': (id: string) => id, 'capacity': 10 }
  );

  const first = await memo.call('a');
  const second = await memo.call('a');

  strictEqual(first, 'value:a');
  strictEqual(second, 'value:a');
  strictEqual(calls, 1);
});

it('invokes fn independently for args that derive different keys', async () => {
  let calls = 0;
  const memo = Memoize.create(
    (id: string) => {
      calls += 1;
      return `value:${id}`;
    },
    { 'keyFn': (id: string) => id, 'capacity': 10 }
  );

  const a = await memo.call('a');
  const b = await memo.call('b');

  deepStrictEqual([a, b], ['value:a', 'value:b']);
  strictEqual(calls, 2);
});

it('memoizes a synchronous (non-Promise-returning) fn correctly', async () => {
  let calls = 0;
  const memo = Memoize.create(
    (n: number) => {
      calls += 1;
      return n * 2;
    },
    { 'keyFn': (n: number) => String(n), 'capacity': 10 }
  );

  const first = await memo.call(21);
  const second = await memo.call(21);

  strictEqual(first, 42);
  strictEqual(second, 42);
  strictEqual(calls, 1);
});
