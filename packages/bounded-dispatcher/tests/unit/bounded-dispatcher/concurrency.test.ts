/**
 * Proves dispatch() respects the composed Semaphore's concurrency bound: with
 * permits=2, at most 2 of 5 concurrently-issued dispatch() calls run their fn
 * at once, the rest queue on the semaphore.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BoundedDispatcher } from '../../../src/index.js';

void describe('BoundedDispatcher#dispatch() concurrency bound', () => {
  void it('never runs more than `permits` fn bodies concurrently', async () => {
    const dispatcher = BoundedDispatcher.create({ 'permits': 2 });

    let concurrentCount = 0;
    let maxConcurrentObserved = 0;

    const trackedTask = (label: string): Promise<string> => {
      return dispatcher.dispatch(async () => {
        concurrentCount += 1;
        maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrentCount);
        await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
        concurrentCount -= 1;
        return `done-${label}`;
      });
    };

    const results = await Promise.all(['a', 'b', 'c', 'd', 'e'].map((label) => trackedTask(label)));

    assert.deepEqual(results, ['done-a', 'done-b', 'done-c', 'done-d', 'done-e']);
    assert.ok(maxConcurrentObserved <= 2, `expected at most 2 concurrent dispatches, observed ${maxConcurrentObserved}`);
    assert.ok(maxConcurrentObserved >= 1, 'expected at least 1 concurrent dispatch to have run');
  });

  void it('serializes fn bodies entirely when permits=1', async () => {
    const dispatcher = BoundedDispatcher.create({ 'permits': 1 });

    let concurrentCount = 0;
    let maxConcurrentObserved = 0;

    const trackedTask = (): Promise<void> => {
      return dispatcher.dispatch(async () => {
        concurrentCount += 1;
        maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrentCount);
        await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
        concurrentCount -= 1;
      });
    };

    await Promise.all([trackedTask(), trackedTask(), trackedTask()]);

    assert.equal(maxConcurrentObserved, 1);
  });
});
