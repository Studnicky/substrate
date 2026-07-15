/** boundedDispatcherComposition — hand-composes concurrency's Semaphore, event-bus's EventBus,
 * and scheduler's RealTimeScheduler into the Coordination Kit's documentation-only
 * BoundedDispatcher recipe (no `@studnicky/bounded-dispatcher` package exists; this
 * composition order IS the deliverable). `dispatch` acquires a Semaphore permit before
 * running work and publishes lifecycle events onto an EventBus tuned with a `highWaterMark`;
 * `scheduleDispatch` adds a `scheduler`-driven delayed dispatch on top. This family was
 * explicitly gated on the `Channel`/`EventBus` Phase 5 primitive fixes landing — `EventBus`
 * forwarding `highWaterMark` into its per-subscriber queues — so that gate is now open and
 * this composition no longer has to work around an untunable bus. Run:
 * npx tsx examples/boundedDispatcherComposition.ts */

import type { ScheduledTaskType } from '@studnicky/scheduler';

// #region usage
import { EventBus } from '@studnicky/event-bus';
import { RealTimeScheduler } from '@studnicky/scheduler';
import assert from 'node:assert/strict';

import { Semaphore } from '../src/index.js';

type DispatchTopicMapType = {
  'dispatch.completed': { 'key': string; 'result': unknown };
  'dispatch.failed': { 'error': unknown; 'key': string; };
  'dispatch.started': { 'key': string };
};

// One Semaphore bounds how many dispatched tasks run at once; one EventBus, tuned with a
// highWaterMark now that EventBus.create() forwards it into every subscriber's BusQueue,
// publishes lifecycle events for whoever wants to observe dispatch without coupling to the
// dispatcher itself; one scheduler drives delayed dispatch.
const semaphore = Semaphore.create({ 'permits': 2 });
const bus = EventBus.create<DispatchTopicMapType>({ 'highWaterMark': 4 });
const scheduler = RealTimeScheduler.create();

class Dispatcher {
  static async dispatch<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const release = await semaphore.acquire();
    try {
      await bus.publish('dispatch.started', { 'key': key });
      const result = await fn();
      await bus.publish('dispatch.completed', { 'key': key, 'result': result });
      return result;
    } catch (error) {
      await bus.publish('dispatch.failed', { 'error': error, 'key': key });
      throw error;
    } finally {
      release();
    }
  }

  static scheduleDispatch<T>(atMs: number, key: string, fn: () => Promise<T>): ScheduledTaskType {
    const task = scheduler.scheduleAt(atMs, () => { void Dispatcher.dispatch(key, fn); });
    return task;
  }
}
// #endregion usage

// --- Scenario A: bounded concurrency — permits=2 means at most 2 of 5 dispatched tasks
// run at once, the rest queue on the semaphore. ---

let concurrentCount = 0;
let maxConcurrentObserved = 0;

class TrackedTask {
  static run(key: string): Promise<string> {
    const result = Dispatcher.dispatch(key, async () => {
      concurrentCount += 1;
      maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrentCount);
      await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
      concurrentCount -= 1;
      return `done-${key}`;
    });
    return result;
  }
}

const boundedResults = await Promise.all(
  ['a', 'b', 'c', 'd', 'e'].map((key) => { const result = TrackedTask.run(key); return result; })
);

console.log('Bounded dispatch results:', boundedResults, 'max concurrent observed:', maxConcurrentObserved);
assert.deepEqual(boundedResults, ['done-a', 'done-b', 'done-c', 'done-d', 'done-e']);
assert.ok(maxConcurrentObserved <= 2, `expected at most 2 concurrent tasks, observed ${maxConcurrentObserved}`);

// --- Scenario B: lifecycle events land on the bus for every dispatched task, independent of
// the caller awaiting dispatch() directly. ---

const startedEvents: string[] = [];
const completedEvents: string[] = [];
const failedEvents: string[] = [];

bus.subscribe('dispatch.started', (payload) => { startedEvents.push(payload.key); });
bus.subscribe('dispatch.completed', (payload) => { completedEvents.push(payload.key); });
bus.subscribe('dispatch.failed', (payload) => { failedEvents.push(payload.key); });

await Dispatcher.dispatch('ok-task', () => { const result = 'fine'; return result; });
await Dispatcher.dispatch('bad-task', () => { throw new Error('boom'); }).catch(() => { /* expected */ });
await bus.drain();

console.log('Lifecycle events — started:', startedEvents, 'completed:', completedEvents, 'failed:', failedEvents);
assert.deepEqual(startedEvents, ['ok-task', 'bad-task']);
assert.deepEqual(completedEvents, ['ok-task']);
assert.deepEqual(failedEvents, ['bad-task']);

// --- Scenario C: scheduleDispatch delays a dispatch through the scheduler instead of
// running it immediately. ---

const scheduledCompletedAt: number[] = [];
const scheduleStartedAt = Date.now();

await new Promise<void>((resolve) => {
  Dispatcher.scheduleDispatch(Date.now() + 30, 'scheduled-task', () => {
    scheduledCompletedAt.push(Date.now() - scheduleStartedAt);
    resolve();
    return 'scheduled-done';
  });
});

console.log('Scheduled dispatch fired after ms:', scheduledCompletedAt[0]);
assert.ok(scheduledCompletedAt[0]! >= 25, 'scheduled dispatch must not fire before its scheduled delay');

await bus.close();

console.log('boundedDispatcherComposition: all assertions passed');
