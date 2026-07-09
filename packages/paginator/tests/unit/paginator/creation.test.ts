/**
 * Paginator Creation Unit Tests
 *
 * Verifies the initial state produced by Paginator.create(): no pages
 * accumulated yet, and hasNext() reflects the idle-is-not-exhausted rule.
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Paginator } from '../../../src/index.js';

it('starts with no pages', () => {
  const paginator = Paginator.create<string, number>();

  deepStrictEqual(paginator.pages, []);
});

it('hasNext() is true before any page has been received', () => {
  const paginator = Paginator.create<string, number>();

  strictEqual(paginator.hasNext(), true);
});
