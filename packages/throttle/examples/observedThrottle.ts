/** observedThrottle — subclass Throttle and override hooks to emit trace logs; saturate the window so callers queue and then drain. Run: npx tsx examples/observedThrottle.ts */

import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import type { ThrottleStateType } from '../src/types/ThrottleStateType.js';

import { Throttle } from '../src/index.js';

// #region usage

class TracingThrottle extends Throttle {
  static override create(config?: Parameters<typeof Throttle.create>[0]): TracingThrottle {
    return new TracingThrottle(config);
  }

  public constructor(config?: Parameters<typeof Throttle.create>[0]) {
    super(config);
  }

  readonly acquireEvents: { 'activeCount': number; 'queuedCount': number }[] = [];
  readonly contendedEvents: { 'activeCount': number; 'queuedCount': number }[] = [];
  readonly acquireWaitEvents: { 'queuedCount': number }[] = [];
  readonly windowSlideEvents: { 'activeCount': number; 'queuedCount': number }[] = [];
  readonly releaseEvents: { 'activeCount': number; 'totalExecuted': number }[] = [];
  readonly drainStartEvents: { 'activeCount': number; 'queuedCount': number }[] = [];
  readonly drainCompleteEvents: { 'totalExecuted': number }[] = [];

  protected override onEnter(to: ThrottleStateType, from: ThrottleStateType): void {
    console.log(`[throttle] fsm transition: ${from} → ${to}`);
  }

  protected override onAcquire(activeCount: number, queuedCount: number): void {
    console.log(`[throttle] onAcquire activeCount=${activeCount} queuedCount=${queuedCount}`);
    this.acquireEvents.push({ 'activeCount': activeCount, 'queuedCount': queuedCount });
  }

  protected override onContended(activeCount: number, queuedCount: number): void {
    console.log(`[throttle] onContended (window saturated) activeCount=${activeCount} queuedCount=${queuedCount}`);
    this.contendedEvents.push({ 'activeCount': activeCount, 'queuedCount': queuedCount });
  }

  protected override onAcquireWait(queuedCount: number): void {
    console.log(`[throttle] onAcquireWait (caller queued) queuedCount=${queuedCount}`);
    this.acquireWaitEvents.push({ 'queuedCount': queuedCount });
  }

  protected override onWindowSlide(activeCount: number, queuedCount: number): void {
    console.log(`[throttle] onWindowSlide (slot freed, waiter promoted) activeCount=${activeCount} queuedCount=${queuedCount}`);
    this.windowSlideEvents.push({ 'activeCount': activeCount, 'queuedCount': queuedCount });
  }

  protected override onRelease(activeCount: number, totalExecuted: number): void {
    console.log(`[throttle] onRelease activeCount=${activeCount} totalExecuted=${totalExecuted}`);
    this.releaseEvents.push({ 'activeCount': activeCount, 'totalExecuted': totalExecuted });
  }

  protected override onDrainStart(activeCount: number, queuedCount: number): void {
    console.log(`[throttle] onDrainStart activeCount=${activeCount} queuedCount=${queuedCount}`);
    this.drainStartEvents.push({ 'activeCount': activeCount, 'queuedCount': queuedCount });
  }

  protected override onDrainComplete(totalExecuted: number): void {
    console.log(`[throttle] onDrainComplete totalExecuted=${totalExecuted}`);
    this.drainCompleteEvents.push({ 'totalExecuted': totalExecuted });
  }
}

// Concurrency limit of 2; we submit 4 ops so 2 queue immediately.
const throttle = TracingThrottle.create({ 'concurrencyLimit': 2 });

// Submit 4 ops. Ops 0-1 acquire immediately; ops 2-3 contend and wait.
const ops: Promise<number | undefined>[] = [];
for (let i = 0; i < 4; i++) {
  ops.push(throttle.execute(async () => {
    await setTimeout(5);
    return i;
  }));
}

// Initiate a graceful drain — no new ops accepted; wait for the 4 to finish.
const drainPromise = throttle.drain();

await Promise.all([...ops, drainPromise]);

console.log('acquireEvents:', throttle.acquireEvents);
console.log('contendedEvents:', throttle.contendedEvents);
console.log('acquireWaitEvents:', throttle.acquireWaitEvents);
console.log('windowSlideEvents:', throttle.windowSlideEvents);
console.log('releaseEvents:', throttle.releaseEvents);
console.log('drainStartEvents:', throttle.drainStartEvents);
console.log('drainCompleteEvents:', throttle.drainCompleteEvents);
console.log('stats:', throttle.getStats());

// #endregion usage

// ── Assertions ────────────────────────────────────────────────────────────────

// 4 ops submitted, concurrencyLimit=2 → 2 immediate acquires, 2 contended/queued
assert.equal(throttle.acquireEvents.length, 2, 'Expected 2 immediate acquire events');
assert.equal(throttle.contendedEvents.length, 2, 'Expected 2 contention events (ops 2 and 3 hit a saturated window)');
assert.equal(throttle.acquireWaitEvents.length, 2, 'Expected 2 enqueue events');

// Queue depths at enqueue time: first waiter sees depth 1, second sees depth 2
assert.equal(throttle.acquireWaitEvents[0]!.queuedCount, 1, 'First waiter: queue depth 1');
assert.equal(throttle.acquireWaitEvents[1]!.queuedCount, 2, 'Second waiter: queue depth 2');

// 2 queued ops each get promoted via a window slide
assert.equal(throttle.windowSlideEvents.length, 2, 'Expected 2 window-slide events (one per dequeued waiter)');

// 4 ops complete → 4 total releases (including the mid-queue releases)
assert.ok(throttle.releaseEvents.length >= 4, 'Expected at least 4 release events');

// drain was called once → drainStart fires once
assert.equal(throttle.drainStartEvents.length, 1, 'Expected 1 drainStart event');

// drain finished with real ops in flight → drainComplete fires once
assert.equal(throttle.drainCompleteEvents.length, 1, 'Expected 1 drainComplete event');
assert.equal(throttle.drainCompleteEvents[0]!.totalExecuted, 4, 'totalExecuted is 4 at drain complete');

// All 4 ops completed
assert.equal(throttle.getStats().totalExecuted, 4, 'All 4 ops completed');

console.log('observedThrottle: all assertions passed');
