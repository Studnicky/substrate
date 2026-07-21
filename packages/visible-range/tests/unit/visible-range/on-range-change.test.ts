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

it('fires on the first getRange() call', () => {
  const changes: VisibleRangeEntity.Type[] = [];
  class TrackingVisibleRange extends VisibleRange {
    protected override onRangeChange(range: VisibleRangeEntity.Type): void {
      changes.push(range);
    }
  }
  const range = TrackingVisibleRange.create({ 'count': 1000, 'itemSize': 50 });

  range.setScrollOffset(0);
  range.setViewportSize(100);
  range.getRange();

  strictEqual(changes.length, 1);
});

it('fires only once when getRange() is called twice with no state change', () => {
  const changes: VisibleRangeEntity.Type[] = [];
  class TrackingVisibleRange extends VisibleRange {
    protected override onRangeChange(range: VisibleRangeEntity.Type): void {
      changes.push(range);
    }
  }
  const range = TrackingVisibleRange.create({ 'count': 1000, 'itemSize': 50 });

  range.setScrollOffset(0);
  range.setViewportSize(100);

  range.getRange();
  range.getRange();

  strictEqual(changes.length, 1);
});

it('fires again when the scroll offset moves the range', () => {
  const changes: VisibleRangeEntity.Type[] = [];
  class TrackingVisibleRange extends VisibleRange {
    protected override onRangeChange(range: VisibleRangeEntity.Type): void {
      changes.push(range);
    }
  }
  const range = TrackingVisibleRange.create({ 'count': 1000, 'itemSize': 50 });

  range.setScrollOffset(0);
  range.setViewportSize(100);
  range.getRange();

  range.setScrollOffset(1000);
  const second = range.getRange();

  strictEqual(changes.length, 2);
  deepStrictEqual(changes[1], second);
});

it('isolates returned and observed ranges from retained comparison state', () => {
  const changes: VisibleRangeEntity.Type[] = [];
  class MutatingVisibleRange extends VisibleRange {
    protected override onRangeChange(range: VisibleRangeEntity.Type): void {
      changes.push({ 'end': range.end, 'start': range.start });
      range.start = 999;
    }
  }
  const range = MutatingVisibleRange.create({ 'count': 1000, 'itemSize': 50 });
  range.setViewportSize(100);

  const first = range.getRange();
  first.end = 999;
  const second = range.getRange();

  deepStrictEqual(second, { 'end': 2, 'start': 0 });
  deepStrictEqual(changes, [{ 'end': 2, 'start': 0 }]);
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
