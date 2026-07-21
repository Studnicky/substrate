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

  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });

  deepStrictEqual(paginator.pages, ['page-1']);
  strictEqual(paginator.hasNext(), true);
});

it('accumulates multiple pages in order', () => {
  const paginator = Paginator.create<string, number>();

  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });
  paginator.next('page-2', { 'cursor': 3, 'exhausted': false });
  paginator.next('page-3', { 'cursor': 4, 'exhausted': false });

  deepStrictEqual(paginator.pages, ['page-1', 'page-2', 'page-3']);
  strictEqual(paginator.hasNext(), true);
});

it('pages returns a defensive snapshot', () => {
  const paginator = Paginator.create<string, number>();
  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });
  const snapshot = paginator.pages;

  Reflect.set(snapshot, 0, 'tampered');

  deepStrictEqual(paginator.pages, ['page-1']);
});

it('snapshots nested pages on retention and returns deeply detached pages', () => {
  const paginator = Paginator.create<{ 'items': { 'name': string }[] }, number>();
  const page = { 'items': [{ 'name': 'original' }] };

  paginator.next(page, { 'cursor': 10, 'exhausted': false });
  page.items[0] = { 'name': 'caller mutation' };

  const snapshot = paginator.pages;
  const firstPage = snapshot[0];
  strictEqual(firstPage?.items[0]?.name, 'original');
  if (firstPage !== undefined) {
    firstPage.items[0] = { 'name': 'returned mutation' };
  }

  deepStrictEqual(paginator.pages, [{ 'items': [{ 'name': 'original' }] }]);
});

it('accumulates many pages in receipt order without dropping or reordering entries', () => {
  const paginator = Paginator.create<string, number>();

  const pageCount = 25;

  for (let index = 0; index < pageCount; index += 1) {
    paginator.next(`page-${index}`, { 'cursor': index, 'exhausted': false });
  }

  deepStrictEqual(paginator.pages, Array.from({ 'length': pageCount }, (_, index) => `page-${index}`));
  strictEqual(paginator.pages.length, pageCount);
});
