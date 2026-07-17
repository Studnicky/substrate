/**
 * VisibleRange onRangeChange Hook Unit Tests
 *
 * Verifies onRangeChange fires only when the computed range differs from
 * the previously computed range: the very first call always "changes"
 * from an undefined prior state, and repeated getRange() calls with no
 * state change in between fire the hook once, not twice.
 */

import { deepStrictEqual, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

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

it('a throwing onRangeChange hook surfaces as a HookInvocationError', () => {
  class ThrowingVisibleRange extends VisibleRange {
    protected override onRangeChange(): void {
      throw new Error('onRangeChange boom');
    }
  }

  const range = ThrowingVisibleRange.create({ 'count': 1000, 'itemSize': 50 });
  range.setScrollOffset(0);
  range.setViewportSize(100);

  throws(() => {
    range.getRange();
  }, HookInvocationError);
});

it('an async-rejecting onRangeChange override is routed through the hook\'s safety net without producing an unhandled rejection', async () => {
  const original = new Error('async onRangeChange boom');

  class AsyncRejectingVisibleRange extends VisibleRange {
    protected override async onRangeChange(): Promise<void> {
      await Promise.resolve();
      throw original;
    }
  }

  const range = AsyncRejectingVisibleRange.create({ 'count': 1000, 'itemSize': 50 });
  range.setScrollOffset(0);
  range.setViewportSize(100);

  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    // getRange() itself only returns the computed range synchronously — the
    // hook's own promise is not awaited by the call site (mirroring real
    // fire-and-forget callers). If `onRangeChange`'s return value were
    // discarded by the invoke() call site, this rejection would surface as
    // an unhandled rejection instead of being routed to onHookError.
    range.getRange();

    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });

    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});
