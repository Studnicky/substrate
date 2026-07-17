/** observedConcurrency — trace hooks for Semaphore, Channel, and Coalesce. Run: npx tsx examples/observedConcurrency.ts */

import assert from 'node:assert/strict';

// #region usage
import { Channel } from '../src/Channel.js';
import { Coalesce } from '../src/Coalesce.js';
import { Semaphore } from '../src/Semaphore.js';

class ObservedSemaphore extends Semaphore {
  readonly acquireEvents: number[] = [];
  readonly acquireWaitEvents: number[] = [];
  readonly contendedEvents: number[] = [];
  readonly releaseEvents: number[] = [];
  readonly releaseDelegatedEvents: number[] = [];

  constructor(permits: number) { super({ 'permits': permits }); }

  protected override onAcquire(permitsBefore: number): void {
    this.acquireEvents.push(permitsBefore);
    console.log(`[concurrency:semaphore] acquire permitsBefore=${permitsBefore}`);
  }
  protected override onAcquireWait(): void {
    this.acquireWaitEvents.push(1);
    console.log('[concurrency:semaphore] acquireWait');
  }
  protected override onContended(queueLength: number): void {
    this.contendedEvents.push(queueLength);
    console.log(`[concurrency:semaphore] contended queueLength=${queueLength}`);
  }
  protected override onRelease(permitsAfter: number): void {
    this.releaseEvents.push(permitsAfter);
    console.log(`[concurrency:semaphore] release permitsAfter=${permitsAfter}`);
  }
  protected override onReleaseDelegated(): void {
    this.releaseDelegatedEvents.push(1);
    console.log('[concurrency:semaphore] releaseDelegated');
  }
}

class ObservedChannel<T> extends Channel<T> {
  readonly dequeueEvents: { 'item': T; 'key': string }[] = [];
  readonly droppedEvents: { 'item': T; 'key': string }[] = [];
  readonly enqueueEvents: { 'item': T; 'key': string }[] = [];
  closeCount = 0;

  constructor() { super(); }

  protected override onDequeue(key: string, item: T): void {
    this.dequeueEvents.push({ 'item': item, 'key': key });
    console.log(`[concurrency:channel] dequeue key=${key} item=${JSON.stringify(item)}`);
  }
  protected override onEnqueue(key: string, item: T): void {
    this.enqueueEvents.push({ 'item': item, 'key': key });
    console.log(`[concurrency:channel] enqueue key=${key} item=${JSON.stringify(item)}`);
  }
  protected override onPublishDropped(key: string, item: T): void {
    this.droppedEvents.push({ 'item': item, 'key': key });
    console.log(`[concurrency:channel] publishDropped key=${key} item=${JSON.stringify(item)}`);
  }
  protected override onClose(): void {
    this.closeCount += 1;
    console.log('[concurrency:channel] close');
  }
}

class ObservedCoalesce<T> extends Coalesce<T> {
  readonly joinEvents: string[] = [];
  readonly settledEvents: { 'key': string; 'success': boolean }[] = [];
  readonly startEvents: string[] = [];

  constructor() { super(); }

  protected override onCoalesceJoin(key: string): void {
    this.joinEvents.push(key);
    console.log(`[concurrency:coalesce] join key=${key}`);
  }
  protected override onCoalesceSettled(key: string, success: boolean): void {
    this.settledEvents.push({ 'key': key, 'success': success });
    console.log(`[concurrency:coalesce] settled key=${key} success=${success}`);
  }
  protected override onCoalesceStart(key: string): void {
    this.startEvents.push(key);
    console.log(`[concurrency:coalesce] start key=${key}`);
  }
}

class ObservedConcurrencyDemo {
  static async runSemaphore(): Promise<ObservedSemaphore> {
    console.log('\n=== Semaphore ===');
    const sem = new ObservedSemaphore(1);

    // First acquire: immediate grant
    const r1 = await sem.acquire();

    // Second acquire: no permits, must wait
    const pendingR2 = sem.acquire();
    // Give microtasks a chance to run the queued waiter registration
    await Promise.resolve();

    // Release first permit: delegates to queued waiter
    await r1();

    // Wait for the second acquire to resolve
    const r2 = await pendingR2;

    // Release the second permit: returns to pool
    await r2();
    return sem;
  }

  static async runChannel(): Promise<ObservedChannel<string>> {
    console.log('\n=== Channel ===');
    const ch: ObservedChannel<string> = new ObservedChannel<string>();
    await ch.publish('events', 'hello');
    await ch.publish('events', 'world');

    const collected: string[] = [];
    const gen: AsyncGenerator<string> = ch.subscribe('events');
    for await (const item of gen) {
      collected.push(item);
      if (collected.length >= 2) { break; }
    }

    await ch.close();
    console.log('Channel received:', collected);
    return ch;
  }

  static async runCoalesce(): Promise<ObservedCoalesce<string>> {
    console.log('\n=== Coalesce ===');
    const coalesce: ObservedCoalesce<string> = new ObservedCoalesce<string>();

    // 3 concurrent calls for same key: 1 leader + 2 joiners
    const factory = (): Promise<string> => {
      return new Promise<string>((resolve) => {
        setImmediate(() => { resolve('v'); });
      });
    };

    await Promise.all([
      coalesce.run('batch', factory),
      coalesce.run('batch', factory),
      coalesce.run('batch', factory)
    ]);

    // Sequential call: new leader
    await coalesce.run('batch', factory);
    return coalesce;
  }
}
// #endregion usage

class ObservedConcurrencyAssertions {
  static async runSemaphore(): Promise<void> {
    const sem = await ObservedConcurrencyDemo.runSemaphore();
    assert.equal(sem.acquireEvents.length, 1, 'acquireEvents: one immediate grant');
    assert.equal(sem.acquireWaitEvents.length, 1, 'acquireWaitEvents: one waiter');
    assert.equal(sem.contendedEvents.length, 1, 'contendedEvents: one contention');
    assert.equal(sem.releaseDelegatedEvents.length, 1, 'releaseDelegatedEvents: one delegation');
    assert.equal(sem.releaseEvents.length, 1, 'releaseEvents: one pool return');
  }

  static async runChannel(): Promise<void> {
    const ch = await ObservedConcurrencyDemo.runChannel();
    assert.equal(ch.enqueueEvents.length, 2, 'enqueueEvents: 2 items enqueued');
    assert.equal(ch.dequeueEvents.length, 2, 'dequeueEvents: 2 items dequeued');
    assert.equal(ch.closeCount, 1, 'closeCount: 1 close');
  }

  static async runCoalesce(): Promise<void> {
    const coalesce = await ObservedConcurrencyDemo.runCoalesce();
    assert.equal(coalesce.startEvents.length, 2, 'startEvents: 2 leaders (one batch, one sequential)');
    assert.equal(coalesce.joinEvents.length, 2, 'joinEvents: 2 joiners in concurrent batch');
    assert.ok(
      coalesce.settledEvents.every((e) => { return e.success === true; }),
      'all settled with success=true'
    );
  }
}

await ObservedConcurrencyAssertions.runSemaphore();
await ObservedConcurrencyAssertions.runChannel();
await ObservedConcurrencyAssertions.runCoalesce();

console.log('observedConcurrency: all assertions passed');
