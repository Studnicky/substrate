/**
 * Paginator Accumulation Unit Tests
 *
 * Verifies next() accumulates pages in receipt order across multiple calls,
 * and that hasNext() remains true while a cursor is present.
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Paginator } from '../../../src/index.js';

it('accumulates a single page', () => {
  const paginator = Paginator.create<string, number>();

  paginator.next('page-1', 2);

  deepStrictEqual(paginator.pages, ['page-1']);
  strictEqual(paginator.hasNext(), true);
});

it('accumulates multiple pages in order', () => {
  const paginator = Paginator.create<string, number>();

  paginator.next('page-1', 2);
  paginator.next('page-2', 3);
  paginator.next('page-3', 4);

  deepStrictEqual(paginator.pages, ['page-1', 'page-2', 'page-3']);
  strictEqual(paginator.hasNext(), true);
});
