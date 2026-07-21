/**
 * Paginator Exhaustion Unit Tests
 *
 * Verifies a `nextCursor` of `{ exhausted: true }` marks the source
 * exhausted, hasNext() becomes false, and receiving a further page after
 * exhaustion throws. Also verifies a `TCursor` whose value space includes
 * `undefined` can be received mid-stream as a legitimate (non-exhausting)
 * cursor.
 */

import { deepStrictEqual, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { Paginator } from '../../../src/index.js';

it('becomes exhausted when the first page carries an exhausted cursor signal', () => {
  const paginator = Paginator.create<string, number>();

  paginator.next('page-1', { 'exhausted': true });

  strictEqual(paginator.hasNext(), false);
  deepStrictEqual(paginator.pages, ['page-1']);
});

it('becomes exhausted when a later page carries an exhausted cursor signal', () => {
  const paginator = Paginator.create<string, number>();

  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });
  paginator.next('page-2', { 'exhausted': true });

  strictEqual(paginator.hasNext(), false);
  deepStrictEqual(paginator.pages, ['page-1', 'page-2']);
});

it('throws when next() is called after exhaustion', () => {
  const paginator = Paginator.create<string, number>();

  paginator.next('page-1', { 'exhausted': true });

  throws(() => { paginator.next('page-2', { 'exhausted': true }); }, Error);
});

it('does not treat a legitimate undefined cursor mid-stream as exhaustion', () => {
  const paginator = Paginator.create<string, string | undefined>();

  paginator.next('page-1', { 'cursor': undefined, 'exhausted': false });

  strictEqual(paginator.hasNext(), true);

  paginator.next('page-2', { 'cursor': 'cursor-2', 'exhausted': false });

  strictEqual(paginator.hasNext(), true);
  deepStrictEqual(paginator.pages, ['page-1', 'page-2']);
});
