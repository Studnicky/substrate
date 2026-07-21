/** observedBoundedDispatcher — direct composition of BoundedDispatcher over a bounded
 * Semaphore, an EventBus tuned with a highWaterMark, and a RealTimeScheduler, with
 * dispatch observation through the composed bus. Run:
 * npx tsx examples/observedBoundedDispatcher.ts */

import assert from 'node:assert/strict';

// #region usage
import { BoundedDispatcher } from '../src/index.js';

const report = { 'completed': 0, 'failed': 0 };
// #endregion usage

class ObservedBoundedDispatcherExample {
  static async run(): Promise<void> {
    // --- Scenario A: bounded concurrency — permits=2 means at most 2 of 5 dispatched tasks
    // run at once, the rest queue on the Semaphore. ---

    const dispatcher = BoundedDispatcher.create({ 'bus': { 'highWaterMark': 4 }, 'permits': 2 });
    dispatcher.getBus().subscribe('dispatch', (payload) => {
      if (payload.phase === 'success') { report.completed += 1; }
      if (payload.phase === 'error') { report.failed += 1; }
    });

    let concurrentCount = 0;
    let maxConcurrentObserved = 0;

    class TrackedTask {
      static run(label: string): Promise<string> {
        const result = dispatcher.dispatch(async () => {
          concurrentCount += 1;
          maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrentCount);
          await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
          concurrentCount -= 1;
          return `done-${label}`;
        });
        return result;
      }
    }

    const boundedResults = await Promise.all(['a', 'b', 'c', 'd', 'e'].map((label) => { const result = TrackedTask.run(label); return result; }));

    console.log('Bounded dispatch results:', boundedResults, 'max concurrent observed:', maxConcurrentObserved);
    assert.deepEqual(boundedResults, ['done-a', 'done-b', 'done-c', 'done-d', 'done-e']);
    assert.ok(maxConcurrentObserved <= 2, `expected at most 2 concurrent tasks, observed ${maxConcurrentObserved}`);

    // --- Scenario B: one failing dispatch is tracked distinctly from the successful ones,
    // via the 'dispatch' subscription. ---

    await dispatcher.dispatch(() => { throw new Error('boom'); }).catch(() => { /* expected */ });
    await dispatcher.getBus().drain();

    console.log('Report:', report);
    assert.equal(report.completed, 5);
    assert.equal(report.failed, 1);

    // --- Scenario C: scheduleDispatch delays a dispatch through the scheduler instead of
    // running it immediately. ---

    const scheduleStartedAt = Date.now();

    const scheduledElapsedMs = await new Promise<number>((resolve) => {
      dispatcher.scheduleDispatch(Date.now() + 30, () => {
        resolve(Date.now() - scheduleStartedAt);
      });
    });

    console.log('Scheduled dispatch fired after ms:', scheduledElapsedMs);
    assert.ok(scheduledElapsedMs >= 25, 'scheduled dispatch must not fire before its scheduled delay');

    await dispatcher.getBus().close();

    console.log('observedBoundedDispatcher: all assertions passed');
  }
}

await ObservedBoundedDispatcherExample.run();
