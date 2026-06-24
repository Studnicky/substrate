/**
 * di-provider — injectable SchedulerProviderType pattern and lifecycle hook extension.
 * Shows a LoggingScheduler subclass that records schedule and fire events, and a
 * WorkQueue that accepts any SchedulerProviderType (real or virtual) for easy test swap.
 *
 * Run: npx tsx packages/scheduler/examples/di-provider.ts
 */
import assert from 'node:assert/strict';

// #region usage
import type { SchedulerProviderType } from '../src/index.js';

import { VirtualTimeCounter } from '../../clock/src/index.js';
import { VirtualScheduler } from '../src/index.js';

type SchedulerLogEntryType = {
  readonly 'event': 'schedule' | 'fire';
  readonly 'id': string;
};

/** VirtualScheduler subclass that appends lifecycle events to a log array. */
class LoggingScheduler extends VirtualScheduler {
  public readonly log: SchedulerLogEntryType[] = [];

  public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }

  protected override onSchedule(id: string, _atMs: number, _variant: 'interval' | 'timeout'): void {
    this.log.push({ 'event': 'schedule', 'id': id });
  }

  protected override onFire(id: string): void {
    this.log.push({ 'event': 'fire', 'id': id });
  }
}

/** Accepts any SchedulerProviderType — injectable for production/test swap. */
class WorkQueue {
  readonly #scheduler: SchedulerProviderType;
  public readonly processed: string[] = [];

  public constructor(scheduler: SchedulerProviderType) {
    this.#scheduler = scheduler;
  }

  public enqueue(atMs: number, label: string): void {
    this.#scheduler.scheduleAt(atMs, () => { this.processed.push(label); });
  }
}

const counter = VirtualTimeCounter.create({ 'startMs': 0 });
const loggingScheduler = new LoggingScheduler(counter);
const queue = new WorkQueue(loggingScheduler);

queue.enqueue(100, 'alpha');
queue.enqueue(200, 'beta');

loggingScheduler.advance(250);

console.log('Scheduler log:', loggingScheduler.log);
console.log('Processed labels:', queue.processed);
// #endregion usage

assert.equal(loggingScheduler.log.filter((e) => { return e.event === 'schedule'; }).length, 2);
assert.equal(loggingScheduler.log.filter((e) => { return e.event === 'fire'; }).length, 2);
assert.deepEqual(queue.processed, ['alpha', 'beta']);

console.log('di-provider: all assertions passed');
