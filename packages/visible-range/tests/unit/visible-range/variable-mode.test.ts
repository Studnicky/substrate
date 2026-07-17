/**
 * VisibleRange Variable-Size Mode Unit Tests
 *
 * Verifies the binary-search cumulative-offset range math for
 * `estimateSize` mode, and that measureItem() corrections change
 * subsequent getRange() results.
 */

import { deepStrictEqual, notDeepStrictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { VisibleRange } from '../../../src/index.js';

it('computes an initial range using estimateSize', () => {
  const range = VisibleRange.create({ 'count': 100, 'estimateSize': () => 40 });

  range.setScrollOffset(400);
  range.setViewportSize(200);

  // Every item estimated at 40: offset 400 is item 10, offset 600 is item 15.
  deepStrictEqual(range.getRange(), { 'start': 10, 'end': 15 });
});

it('measureItem corrections change subsequent getRange() results', () => {
  const range = VisibleRange.create({ 'count': 100, 'estimateSize': () => 40 });

  range.setScrollOffset(400);
  range.setViewportSize(200);

  const before = range.getRange();

  // Shrink items 0-9 down to 4px each: items 0-9 now occupy only 40px
  // instead of 400px, so reaching the same 400px scroll offset requires
  // passing many more (still 40px) items, pushing the visible window later.
  for (let i = 0; i < 10; i++) {
    range.measureItem(i, 4);
  }

  const after = range.getRange();

  notDeepStrictEqual(after, before);
  deepStrictEqual(after, { 'start': 19, 'end': 24 });
});

it('applies overscan the same way as fixed mode', () => {
  const range = VisibleRange.create({ 'count': 100, 'estimateSize': () => 40, 'overscan': 2 });

  range.setScrollOffset(400);
  range.setViewportSize(200);

  deepStrictEqual(range.getRange(), { 'start': 8, 'end': 17 });
});

it('measureItem is a no-op in fixed-size mode', () => {
  const range = VisibleRange.create({ 'count': 100, 'itemSize': 40 });

  range.setScrollOffset(400);
  range.setViewportSize(200);

  const before = range.getRange();

  range.measureItem(0, 999);

  const after = range.getRange();

  deepStrictEqual(after, before);
});

it('computes correct final offsets after interleaved out-of-order measureItem corrections', () => {
  const range = VisibleRange.create({ 'count': 20, 'estimateSize': () => 40 });

  range.setScrollOffset(0);
  range.setViewportSize(50);

  // Force an initial offsets build (all items estimated at 40).
  range.getRange();

  // Interleave corrections in non-ascending index order, each forcing a
  // partial rebuild from the earliest-dirtied watermark, with a getRange()
  // call between each to exercise the incremental-repair path.
  range.measureItem(10, 100);
  range.getRange();

  range.measureItem(2, 10);
  range.getRange();

  range.measureItem(5, 60);
  range.getRange();

  // Final sizes: item 2 = 10, item 5 = 60, item 10 = 100, all others = 40.
  // Cumulative offset of item i is the sum of sizes of items [0, i).
  const sizes = Array.from({ 'length': 20 }, (_, i) => (i === 2 ? 10 : i === 5 ? 60 : i === 10 ? 100 : 40));
  const cumulativeAt = (index: number): number => sizes.slice(0, index).reduce((sum, size) => sum + size, 0);

  range.setScrollOffset(cumulativeAt(12));
  range.setViewportSize(1);

  const result = range.getRange();

  deepStrictEqual(result, { 'end': 12, 'start': 12 });
});
