/**
 * invalidate()/clear() unit tests
 *
 * `invalidate()` forces the next call for the same args to re-invoke `fn`.
 * `clear()` forces ALL subsequent calls to re-invoke `fn`.
 */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Memoize } from '../../../src/index.js';

it('invalidate() forces the next matching call to re-invoke fn', async () => {
  let calls = 0;
  const memo = Memoize.create(
    (id: string) => {
      calls += 1;
      return `value:${id}:${calls}`;
    },
    { 'keyFn': (id: string) => id, 'capacity': 10 }
  );

  const first = await memo.call('a');
  memo.invalidate('a');
  const second = await memo.call('a');

  strictEqual(first, 'value:a:1');
  strictEqual(second, 'value:a:2');
  strictEqual(calls, 2);
});

it('invalidate() leaves other keys cached', async () => {
  let calls = 0;
  const memo = Memoize.create(
    (id: string) => {
      calls += 1;
      return `value:${id}`;
    },
    { 'keyFn': (id: string) => id, 'capacity': 10 }
  );

  await memo.call('a');
  await memo.call('b');
  memo.invalidate('a');
  await memo.call('b');

  strictEqual(calls, 2);
});

it('clear() forces every subsequent call to re-invoke fn', async () => {
  let calls = 0;
  const memo = Memoize.create(
    (id: string) => {
      calls += 1;
      return `value:${id}:${calls}`;
    },
    { 'keyFn': (id: string) => id, 'capacity': 10 }
  );

  await memo.call('a');
  await memo.call('b');
  memo.clear();
  await memo.call('a');
  await memo.call('b');

  strictEqual(calls, 4);
});
