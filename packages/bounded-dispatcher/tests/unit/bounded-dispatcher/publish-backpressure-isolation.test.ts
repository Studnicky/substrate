/**
 * Proves dispatch()'s Semaphore permit hold tracks fn()'s own execution time, not
 * however long the composed EventBus takes to accept the 'dispatch' lifecycle
 * publishes. A slow/blocked 'dispatch' subscriber must not throttle the configured
 * concurrency bound: with permits=3 and a subscriber that never lets its queue
 * drain, 3 concurrent dispatch() calls must all reach their fn body concurrently.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BoundedDispatcher } from '../../../src/index.js';

const flushMicrotasks = (): Promise<void> => new Promise((resolve) => { setImmediate(resolve); });

void describe('BoundedDispatcher#dispatch() permit isolation from bus backpressure', () => {
  void it('runs `permits` fn bodies concurrently even while the dispatch subscriber is stalled', async () => {
    const gate = new Promise<void>(() => { /* never resolves for the lifetime of this test */ });

    const dispatcher = BoundedDispatcher.create({
      'bus': { 'highWaterMark': 1 },
      'permits': 3
    });

    dispatcher.getBus().subscribe('dispatch', async () => { await gate; });

    let concurrentCount = 0;
    let maxConcurrentObserved = 0;
    const releasers: Array<() => void> = [];

    const trackedTask = (): Promise<void> => {
      return dispatcher.dispatch(async () => {
        concurrentCount += 1;
        maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrentCount);
        await new Promise<void>((resolve) => { releasers.push(resolve); });
        concurrentCount -= 1;
      });
    };

    const pending = [trackedTask(), trackedTask(), trackedTask()];

    // Let all three dispatch() calls reach their fn body. If the permit hold were
    // still coupled to awaiting the 'dispatch' bus publish (which is stalled by
    // the never-resolving subscriber above), fewer than 3 would ever get here.
    for (let attempt = 0; attempt < 25 && releasers.length < 3; attempt += 1) {
      await flushMicrotasks();
    }

    assert.equal(releasers.length, 3, 'expected all 3 dispatch() calls to reach fn concurrently, unblocked by the stalled subscriber');
    assert.equal(maxConcurrentObserved, 3);

    releasers.forEach((release) => { release(); });
    await Promise.all(pending);
  });
});
