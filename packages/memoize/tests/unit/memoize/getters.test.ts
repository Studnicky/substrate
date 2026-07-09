/**
 * Getter unit tests
 *
 * `getCache()`/`getCoalesce()` return the exact composed instances (Layer
 * Transparency Rule), not copies or wrappers.
 */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Coalesce } from '@studnicky/concurrency';
import { LruCache } from '@studnicky/cache';

import { Memoize } from '../../../src/index.js';

it('getCache() returns the composed LruCache and reflects call() writes', async () => {
  const memo = Memoize.create((id: string) => `value:${id}`, { 'keyFn': (id: string) => id, 'capacity': 10 });

  await memo.call('a');

  const cache = memo.getCache();
  strictEqual(cache instanceof LruCache, true);
  strictEqual(cache.size, 1);
  strictEqual(cache.get('a'), 'value:a');
});

it('getCoalesce() returns the composed Coalesce instance', () => {
  const memo = Memoize.create((id: string) => `value:${id}`, { 'keyFn': (id: string) => id, 'capacity': 10 });

  const coalesce = memo.getCoalesce();
  strictEqual(coalesce instanceof Coalesce, true);
  strictEqual(coalesce.isInflight('a'), false);
});

it('getCache() and getCoalesce() return the exact same instance across calls', () => {
  const memo = Memoize.create((id: string) => `value:${id}`, { 'keyFn': (id: string) => id, 'capacity': 10 });

  strictEqual(memo.getCache(), memo.getCache());
  strictEqual(memo.getCoalesce(), memo.getCoalesce());
});
