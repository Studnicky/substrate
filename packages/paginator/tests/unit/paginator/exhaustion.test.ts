/**
 * Paginator Exhaustion Unit Tests
 *
 * Verifies a `nextCursor` of `undefined` marks the source exhausted,
 * hasNext() becomes false, and receiving a further page after exhaustion
 * throws.
 */

import { deepStrictEqual, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { Paginator } from '../../../src/index.js';

it('becomes exhausted when nextCursor is undefined on the first page', () => {
  const paginator = Paginator.create<string, number>();

  paginator.next('page-1', undefined);

  strictEqual(paginator.hasNext(), false);
  deepStrictEqual(paginator.pages, ['page-1']);
});

it('becomes exhausted when nextCursor is undefined after prior hasMore pages', () => {
  const paginator = Paginator.create<string, number>();

  paginator.next('page-1', 2);
  paginator.next('page-2', undefined);

  strictEqual(paginator.hasNext(), false);
  deepStrictEqual(paginator.pages, ['page-1', 'page-2']);
});

it('throws when next() is called after exhaustion', () => {
  const paginator = Paginator.create<string, number>();

  paginator.next('page-1', undefined);

  throws(() => { paginator.next('page-2', undefined); }, Error);
});
