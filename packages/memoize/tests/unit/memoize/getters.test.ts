/** Memoization behavior at the owned cache and coalescing boundaries. */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Memoize } from '../../../src/index.js';

it('replays a successful result without re-invoking the wrapped function', async () => {
  let calls = 0;
  const memo = Memoize.create((id: string) => {
    calls += 1;
    return `value:${id}`;
  }, { 'keyFn': (id: string) => id, 'capacity': 10 });

  strictEqual(await memo.call('a'), 'value:a');
  strictEqual(await memo.call('a'), 'value:a');

  strictEqual(calls, 1);
});

it('coalesces concurrent calls sharing a derived key', async () => {
  let calls = 0;
  const memo = Memoize.create(async (id: string) => {
    calls += 1;
    await Promise.resolve();
    return `value:${id}`;
  }, { 'keyFn': (id: string) => id, 'capacity': 10 });

  const results = await Promise.all([memo.call('a'), memo.call('a')]);

  strictEqual(results[0], 'value:a');
  strictEqual(results[1], 'value:a');
  strictEqual(calls, 1);
});

it('invalidate and clear cause subsequent calls to recompute', async () => {
  let calls = 0;
  const memo = Memoize.create((id: string) => {
    calls += 1;
    return `value:${id}:${calls}`;
  }, { 'keyFn': (id: string) => id, 'capacity': 10 });

  strictEqual(await memo.call('a'), 'value:a:1');
  memo.invalidate('a');
  strictEqual(await memo.call('a'), 'value:a:2');
  strictEqual(await memo.call('b'), 'value:b:3');
  memo.clear();
  strictEqual(await memo.call('b'), 'value:b:4');

  strictEqual(calls, 4);
});
