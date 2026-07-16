/**
 * VisibleRange onRangeChange Hook Unit Tests
 *
 * Verifies onRangeChange fires only when the computed range differs from
 * the previously computed range: the very first call always "changes"
 * from an undefined prior state, and repeated getRange() calls with no
 * state change in between fire the hook once, not twice.
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import type { VisibleRangeEntity } from '../../../src/index.js';

import { VisibleRange } from '../../../src/index.js';

class TrackingVisibleRange extends VisibleRange {
  readonly changes: VisibleRangeEntity.Type[] = [];

  protected override onRangeChange(range: VisibleRangeEntity.Type): void {
    this.changes.push(range);
  }
}

it('fires on the first getRange() call', () => {
  const range = TrackingVisibleRange.create({ 'count': 1000, 'itemSize': 50 }) as TrackingVisibleRange;

  range.setScrollOffset(0);
  range.setViewportSize(100);
  range.getRange();

  strictEqual(range.changes.length, 1);
});

it('fires only once when getRange() is called twice with no state change', () => {
  const range = TrackingVisibleRange.create({ 'count': 1000, 'itemSize': 50 }) as TrackingVisibleRange;

  range.setScrollOffset(0);
  range.setViewportSize(100);

  range.getRange();
  range.getRange();

  strictEqual(range.changes.length, 1);
});

it('fires again when the scroll offset moves the range', () => {
  const range = TrackingVisibleRange.create({ 'count': 1000, 'itemSize': 50 }) as TrackingVisibleRange;

  range.setScrollOffset(0);
  range.setViewportSize(100);
  range.getRange();

  range.setScrollOffset(1000);
  const second = range.getRange();

  strictEqual(range.changes.length, 2);
  deepStrictEqual(range.changes[1], second);
});

it('a throwing onRangeChange hook does not replace getRange()', () => {
  class ThrowingVisibleRange extends VisibleRange {
    protected override onRangeChange(): void {
      throw new Error('onRangeChange boom');
    }
  }

  const range = ThrowingVisibleRange.create({ 'count': 1000, 'itemSize': 50 });
  range.setScrollOffset(0);
  range.setViewportSize(100);

  deepStrictEqual(range.getRange(), { 'end': 2, 'start': 0 });
});
