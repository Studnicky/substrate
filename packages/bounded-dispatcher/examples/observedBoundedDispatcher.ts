/** observedBoundedDispatcher — direct composition of BoundedDispatcher over a bounded
 * Semaphore, an EventBus tuned with a highWaterMark, and a RealTimeScheduler, plus an
 * extension subclass reaching composed instances via getters. Run:
 * npx tsx examples/observedBoundedDispatcher.ts */

import assert from 'node:assert/strict';

// #region usage
import type { BoundedDispatcherEventType } from '../src/index.js';

import { BoundedDispatcher } from '../src/index.js';

/**
 * Advanced extension: BoundedDispatcher has no hooks of its own — dispatch-level
 * observability is the `'dispatch'` topic on the composed `EventBus`, reachable
 * through `getBus()`. A subclass can still add convenience behavior by reaching
 * the composed instances through the getters.
 */
class ReportingBoundedDispatcher extends BoundedDispatcher {
  readonly #completedCount = { 'value': 0 };
  readonly #failedCount = { 'value': 0 };

  // `this.create(...)` (not `BoundedDispatcher.create(...)`) so the inherited factory's
  // `new this(...)` binds to ReportingBoundedDispatcher — same `new this()` polymorphism
  // Semaphore/EventBus/RealTimeScheduler use for their own subclass factories.
  static tracked(permits: number): ReportingBoundedDispatcher {
    const result = this.create({ 'bus': { 'highWaterMark': 4 }, 'permits': permits }) as ReportingBoundedDispatcher;
    result.getBus().subscribe('dispatch', (payload) => { result.#record(payload); });
    return result;
  }

  report(): { 'completed': number; 'failed': number } {
    return { 'completed': this.#completedCount.value, 'failed': this.#failedCount.value };
  }

  #record(payload: BoundedDispatcherEventType): void {
    if (payload.phase === 'success') { this.#completedCount.value += 1; }
    if (payload.phase === 'error') { this.#failedCount.value += 1; }
  }
}
// #endregion usage

class ObservedBoundedDispatcherExample {
  static async run(): Promise<void> {
    // --- Scenario A: bounded concurrency — permits=2 means at most 2 of 5 dispatched tasks
    // run at once, the rest queue on the Semaphore. ---

    const dispatcher = ReportingBoundedDispatcher.tracked(2);

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
    // via the subclass's 'dispatch' subscription. ---

    await dispatcher.dispatch(() => { throw new Error('boom'); }).catch(() => { /* expected */ });
    await dispatcher.getBus().drain();

    console.log('Report:', dispatcher.report());
    assert.equal(dispatcher.report().completed, 5);
    assert.equal(dispatcher.report().failed, 1);

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
