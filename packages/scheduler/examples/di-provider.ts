/**
 * DI provider example — shows the injectable SchedulerProviderInterface pattern and lifecycle
 * hook extension via a LoggingScheduler subclass that records schedule and fire events.
 *
 * Run: npx tsx packages/scheduler/examples/di-provider.ts
 */
import assert from 'node:assert/strict';

import { VirtualTimeCounter } from '../../clock/src/index.js';
import { VirtualScheduler } from '../src/index.js';
import type { SchedulerProviderInterface } from '../src/index.js';

interface SchedulerLogEntry {
  readonly event: 'schedule' | 'fire';
  readonly id: string;
}

/** VirtualScheduler subclass that appends lifecycle events to a log array. */
class LoggingScheduler extends VirtualScheduler {
  public readonly log: SchedulerLogEntry[] = [];

  protected override onSchedule(id: string, _atMs: number, _variant: 'interval' | 'timeout'): void {
    this.log.push({ event: 'schedule', id });
  }

  protected override onFire(id: string): void {
    this.log.push({ event: 'fire', id });
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

const counter = new VirtualTimeCounter(0);
const loggingScheduler = new LoggingScheduler(counter);
const queue = new WorkQueue(loggingScheduler);

queue.enqueue(100, 'alpha');
queue.enqueue(200, 'beta');

// Two tasks should be recorded as scheduled before any advance.
assert.equal(loggingScheduler.log.filter((e) => e.event === 'schedule').length, 2);

loggingScheduler.advance(250);

// Both tasks should have fired.
assert.equal(loggingScheduler.log.filter((e) => e.event === 'fire').length, 2);
assert.deepEqual(queue.processed, ['alpha', 'beta']);

console.log('Scheduler log:', loggingScheduler.log);
console.log('Processed labels:', queue.processed);
