/**
 * Paginator Reset Unit Tests
 *
 * Verifies reset() returns to the initial idle state, discarding pages and
 * the cursor, from hasMore, from exhausted, and as a no-op from idle.
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Paginator } from '../../../src/index.js';

it('reset() from idle stays idle', () => {
  const paginator = Paginator.create<string, number>();

  paginator.reset();

  deepStrictEqual(paginator.pages, []);
  strictEqual(paginator.hasNext(), true);
});

it('reset() from hasMore discards pages and cursor', () => {
  const paginator = Paginator.create<string, number>();

  paginator.next('page-1', 2);
  paginator.next('page-2', 3);
  paginator.reset();

  deepStrictEqual(paginator.pages, []);
  strictEqual(paginator.hasNext(), true);
});

it('reset() from exhausted returns to idle and allows receiving pages again', () => {
  const paginator = Paginator.create<string, number>();

  paginator.next('page-1', undefined);
  strictEqual(paginator.hasNext(), false);

  paginator.reset();

  deepStrictEqual(paginator.pages, []);
  strictEqual(paginator.hasNext(), true);

  paginator.next('page-1-again', 2);
  deepStrictEqual(paginator.pages, ['page-1-again']);
});
