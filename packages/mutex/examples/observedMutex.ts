/** observedMutex — trace all Mutex lifecycle hooks in a two-caller contention race. Run: npx tsx examples/observedMutex.ts */

import assert from 'node:assert/strict';

// #region usage
import type { AcquireWaitEventEntity } from '../src/entities/AcquireWaitEventEntity.js';
import type { QueueDrainEventEntity } from '../src/entities/QueueDrainEventEntity.js';
import type { ReleaseEventEntity } from '../src/entities/ReleaseEventEntity.js';

import { Mutex } from '../src/index.js';

class TracingMutex extends Mutex<string> {
  readonly acquireWaitEvents: AcquireWaitEventEntity.Type[] = [];
  readonly queueDrainEvents: QueueDrainEventEntity.Type[] = [];
  readonly releaseEvents: ReleaseEventEntity.Type[] = [];

  protected override beforeAcquire(key: string): void {
    console.log(`[mutex] beforeAcquire key=${key}`);
  }

  protected override afterAcquire(key: string, waitTimeMs: number): void {
    console.log(`[mutex] afterAcquire key=${key} waitTimeMs=${waitTimeMs}`);
  }

  protected override onAcquireWait(key: string, waitTimeMs: number): void {
    console.log(`[mutex] onAcquireWait key=${key} waitTimeMs=${waitTimeMs}`);
    this.acquireWaitEvents.push({ 'key': key, 'waitTimeMs': waitTimeMs });
  }

  protected override onContended(key: string, queueSize: number): void {
    console.log(`[mutex] onContended key=${key} queueSize=${queueSize}`);
  }

  protected override onRelease(key: string): void {
    console.log(`[mutex] onRelease key=${key}`);
    this.releaseEvents.push({ 'key': key });
  }

  protected override beforeRelease(key: string, holdTimeMs: number): void {
    console.log(`[mutex] beforeRelease key=${key} holdTimeMs=${holdTimeMs}`);
  }

  protected override afterRelease(key: string): void {
    console.log(`[mutex] afterRelease key=${key}`);
  }

  protected override onQueueDrain(key: string): void {
    console.log(`[mutex] onQueueDrain key=${key}`);
    this.queueDrainEvents.push({ 'key': key });
  }

  protected override onTimeout(key: string, timeoutMs: number): void {
    console.log(`[mutex] onTimeout key=${key} timeoutMs=${timeoutMs}`);
  }
}

// Runs the contention scenario end-to-end so the module ends up with a single
// top-level `mutex` binding instead of one per intermediate step.
class MutexDemoRunner {
  static async run(mutex: TracingMutex): Promise<void> {
    // Caller 1 grabs the lock
    const release1 = await mutex.acquire('account-42');

    // Caller 2 enqueues (runs concurrently, not awaited yet)
    const pending2 = mutex.acquire('account-42');

    // Simulate holder doing work
    await new Promise<void>((resolve) => { setTimeout(resolve, 10); });

    // Release — hands lock to caller 2
    release1();

    // Caller 2 now gets the lock
    const release2 = await pending2;

    release2();

    // Caller 3 — different key, immediate acquisition, no contention
    const accountBalances: number[] = [];
    await mutex.runExclusive('account-99', () => {
      accountBalances.push(42);
    });
  }
}

const mutex = TracingMutex.create<string>();
await MutexDemoRunner.run(mutex);
// #endregion usage

assert.strictEqual(mutex.acquireWaitEvents.length, 1, `Expected 1 acquireWait event, got ${mutex.acquireWaitEvents.length}`);
assert.strictEqual(mutex.releaseEvents.length, 3, `Expected 3 release events, got ${mutex.releaseEvents.length}`);
assert.strictEqual(mutex.queueDrainEvents.length, 1, `Expected 1 queueDrain event, got ${mutex.queueDrainEvents.length}`);

console.log('observedMutex: all assertions passed');
