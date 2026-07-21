/**
 * di-provider — injectable SchedulerProviderInterface pattern and lifecycle hook extension.
 * Shows a LoggingScheduler subclass that records schedule and fire events, and a
 * WorkQueue that accepts any SchedulerProviderInterface (real or virtual) for easy test swap.
 *
 * Run: npx tsx packages/scheduler/examples/di-provider.ts
 */
import { VirtualTimeCounter } from '@studnicky/clock';
import assert from 'node:assert/strict';

import type { SchedulerLogEntryEntity, SchedulerProviderInterface } from '../src/index.js';

import { VirtualScheduler } from '../src/index.js';

// #region usage

/** VirtualScheduler subclass that appends lifecycle events to a log array. */
class LoggingScheduler extends VirtualScheduler {
  public readonly log: SchedulerLogEntryEntity.Type[] = [];

  public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }

  protected override onSchedule(id: string, _atMs: number, _variant: 'interval' | 'timeout'): void {
    this.log.push({ 'event': 'schedule', 'id': id });
  }

  protected override onFire(id: string): void {
    this.log.push({ 'event': 'fire', 'id': id });
  }
}

/** Accepts any SchedulerProviderInterface — injectable for production/test swap. */
class WorkQueue {
  readonly #scheduler: SchedulerProviderInterface;
  public readonly processed: string[] = [];

  public constructor(scheduler: SchedulerProviderInterface) {
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
