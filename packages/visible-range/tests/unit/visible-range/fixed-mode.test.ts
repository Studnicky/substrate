/**
 * VisibleRange Fixed-Size Mode Unit Tests
 *
 * Verifies the O(1) division-based range math for `itemSize` mode,
 * including overscan expansion and start/end boundary clamping.
 */

import { deepStrictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { VisibleRange } from '../../../src/index.js';

it('computes the range for a simple scroll-offset/viewport-size/itemSize combination', () => {
  const range = VisibleRange.create({ 'count': 1000, 'itemSize': 50 });

  range.setScrollOffset(500);
  range.setViewportSize(300);

  // 500/50 = 10 .. ceil((500+300)/50) = 16
  deepStrictEqual(range.getRange(), { 'start': 10, 'end': 16 });
});

it('expands the range on both sides when overscan is set', () => {
  const range = VisibleRange.create({ 'count': 1000, 'itemSize': 50, 'overscan': 3 });

  range.setScrollOffset(500);
  range.setViewportSize(300);

  deepStrictEqual(range.getRange(), { 'start': 7, 'end': 19 });
});

it('clamps start at 0 when scroll offset minus overscan would go negative', () => {
  const range = VisibleRange.create({ 'count': 1000, 'itemSize': 50, 'overscan': 5 });

  range.setScrollOffset(0);
  range.setViewportSize(100);

  deepStrictEqual(range.getRange().start, 0);
});

it('clamps end at count - 1 when scroll offset plus overscan would exceed the list', () => {
  const range = VisibleRange.create({ 'count': 10, 'itemSize': 50, 'overscan': 5 });

  range.setScrollOffset(400);
  range.setViewportSize(100);

  deepStrictEqual(range.getRange().end, 9);
});
