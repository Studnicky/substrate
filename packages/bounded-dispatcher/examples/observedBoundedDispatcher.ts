// #region usage
import type { OperationFunctionInterface } from '@studnicky/pipeline/interfaces';

import { Semaphore } from '@studnicky/concurrency/node';
import { RuntimeError } from '@studnicky/errors/node';
import { OperationPipeline } from '@studnicky/pipeline/node';
/** observedBoundedDispatcher — direct composition of BoundedDispatcher over a bounded
 * Semaphore, an EventBus tuned with a highWaterMark, and a RealTimeScheduler, with
 * dispatch observation through the composed bus. Run:
 * npx tsx examples/observedBoundedDispatcher.ts */
import assert from 'node:assert/strict';

import type { BoundedDispatcherOperationContextInterface } from '../src/interfaces/index.js';

import { BoundedDispatcher } from '../src/index.js';

const report = { 'completed': 0, 'failed': 0, 'policyCompleted': 0, 'policyStarted': 0 };
const semaphore = Semaphore.create({ 'maximumQueueSize': 4, 'permits': 2 });
class DispatchPolicy {
  static async observe<T>(
    context: BoundedDispatcherOperationContextInterface,
    next: OperationFunctionInterface<BoundedDispatcherOperationContextInterface, T>
  ): Promise<T> {
    report.policyStarted += 1;
    const result = await next(context);
    report.policyCompleted += 1;
    return result;
  }
}

const dispatcher = BoundedDispatcher.create({
  'bus': { 'highWaterMark': 4 },
  'pipeline': OperationPipeline.create([DispatchPolicy.observe]),
  'semaphore': semaphore
});
// #endregion usage

class ObservedBoundedDispatcherExample {
  static async run(): Promise<void> {
    // --- Scenario A: bounded concurrency — semaphore permits=2 means at most 2 of 5 dispatched tasks
    // run at once, the rest queue on the Semaphore. ---
    dispatcher.getBus().subscribe('dispatch', (payload) => {
      if (payload.phase === 'success') { report.completed += 1; }
      if (payload.phase === 'error') { report.failed += 1; }
    });

    let concurrentCount = 0;
    let highestConcurrentObserved = 0;

    class TrackedTask {
      static create(label: string): () => Promise<string> {
        return async () => {
          concurrentCount += 1;
          highestConcurrentObserved = Math.max(highestConcurrentObserved, concurrentCount);
          await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
          concurrentCount -= 1;
          return `done-${label}`;
        };
      }
    }

    const boundedResults = await Promise.all(['a', 'b', 'c', 'd', 'e'].map((label) => {
      const task = dispatcher.dispatch(TrackedTask.create(label));
      return task;
    }));

    console.log('Bounded dispatch results:', boundedResults, 'max concurrent observed:', highestConcurrentObserved);
    assert.deepEqual(boundedResults, ['done-a', 'done-b', 'done-c', 'done-d', 'done-e']);
    assert.ok(highestConcurrentObserved <= 2, `expected at most 2 concurrent tasks, observed ${highestConcurrentObserved}`);
    assert.equal(report.policyStarted, 5);
    assert.equal(report.policyCompleted, 5);

    // --- Scenario B: one failing dispatch is tracked distinctly from the successful ones,
    // via the 'dispatch' subscription. ---

    await dispatcher.dispatch(() => { throw RuntimeError.create('boom'); }).catch(() => { /* expected */ });
    await dispatcher.getBus().drain();

    console.log('Report:', report);
    assert.equal(report.completed, 5);
    assert.equal(report.failed, 1);
    assert.equal(report.policyStarted, 6);
    assert.equal(report.policyCompleted, 5);

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
