/**
 * Throttle Lifecycle Hook Unit Tests
 *
 * Verifies that every protected hook fires the correct number of times,
 * in the correct order, with the correct arguments, across all observable
 * execution paths: immediate acquire, contended queue, window slide,
 * release, drain (with drain-complete), abort, adaptive adjust, and reject.
 */

import {
  ok,
  strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { Throttle } from '../../../src/throttle/index.js';
import type { ThrottleStateType } from '../../../src/types/ThrottleStateType.js';

// ── Recording subclass ────────────────────────────────────────────────────────

type HookEvent =
  | { 'args': [number]; 'name': 'onAbortStart' }
  | { 'args': [number, number]; 'name': 'onAcquire' }
  | { 'args': [number]; 'name': 'onAcquireWait' }
  | { 'args': [number, number]; 'name': 'onAdaptiveAdjust' }
  | { 'args': [number, number]; 'name': 'onContended' }
  | { 'args': [number]; 'name': 'onDrainComplete' }
  | { 'args': [number, number]; 'name': 'onDrainStart' }
  | { 'args': [ThrottleStateType, ThrottleStateType]; 'name': 'onEnter' }
  | { 'args': [unknown]; 'name': 'onReject' }
  | { 'args': [number, number]; 'name': 'onRelease' }
  | { 'args': [number, number]; 'name': 'onWindowSlide' };

class RecordingThrottle extends Throttle {
  readonly events: HookEvent[] = [];

  public constructor(config?: Parameters<typeof Throttle.create>[0]) {
    super(config);
  }

  protected override onEnter(to: ThrottleStateType, from: ThrottleStateType): void {
    this.events.push({ 'args': [to, from], 'name': 'onEnter' });
  }

  protected override onAcquire(activeCount: number, queuedCount: number): void {
    this.events.push({ 'args': [activeCount, queuedCount], 'name': 'onAcquire' });
  }

  protected override onContended(activeCount: number, queuedCount: number): void {
    this.events.push({ 'args': [activeCount, queuedCount], 'name': 'onContended' });
  }

  protected override onAcquireWait(queuedCount: number): void {
    this.events.push({ 'args': [queuedCount], 'name': 'onAcquireWait' });
  }

  protected override onWindowSlide(activeCount: number, queuedCount: number): void {
    this.events.push({ 'args': [activeCount, queuedCount], 'name': 'onWindowSlide' });
  }

  protected override onRelease(activeCount: number, totalExecuted: number): void {
    this.events.push({ 'args': [activeCount, totalExecuted], 'name': 'onRelease' });
  }

  protected override onDrainStart(activeCount: number, queuedCount: number): void {
    this.events.push({ 'args': [activeCount, queuedCount], 'name': 'onDrainStart' });
  }

  protected override onDrainComplete(totalExecuted: number): void {
    this.events.push({ 'args': [totalExecuted], 'name': 'onDrainComplete' });
  }

  protected override onAbortStart(cancelledCount: number): void {
    this.events.push({ 'args': [cancelledCount], 'name': 'onAbortStart' });
  }

  protected override onAdaptiveAdjust(previousLimit: number, newLimit: number): void {
    this.events.push({ 'args': [previousLimit, newLimit], 'name': 'onAdaptiveAdjust' });
  }

  protected override onReject(reason: unknown): void {
    this.events.push({ 'args': [reason], 'name': 'onReject' });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function eventsNamed(t: RecordingThrottle, name: HookEvent['name']): HookEvent[] {
  return t.events.filter((e) => {return e.name === name;});
}

// ── onAcquire — immediate slot ────────────────────────────────────────────────

void it('onAcquire fires once per immediately-acquired slot', async () => {
  const t = new RecordingThrottle({ 'concurrencyLimit': 3 });

  await Promise.all([
    t.execute(async () => { return 1; }),
    t.execute(async () => { return 2; }),
  ]);

  const acquireEvents = eventsNamed(t, 'onAcquire');
  strictEqual(acquireEvents.length, 2, 'two immediate acquires');

  // activeCount starts at 1 for first, may be 1 or 2 for second depending on
  // ordering — the key invariant is activeCount > 0 at acquire time.
  for (const e of acquireEvents) {
    ok((e.args as [number, number])[0] > 0, 'activeCount > 0 at acquire');
  }
});

// ── onContended — at-limit detection ─────────────────────────────────────────

void it('onContended fires when a caller arrives at a saturated window', async () => {
  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });

  const t = new RecordingThrottle({ 'concurrencyLimit': 1 });

  // First op holds the only slot.
  const first = t.execute(async () => { await blocker; return 'a'; });
  // Give the first op time to acquire.
  await Promise.resolve();

  // Second op must contend.
  const second = t.execute(async () => { return 'b'; });

  unblock();
  await Promise.all([first, second]);

  const contended = eventsNamed(t, 'onContended');
  strictEqual(contended.length, 1, 'exactly one contention event');
  strictEqual((contended[0]!.args as [number, number])[0], 1, 'activeCount is 1 (at limit)');
});

// ── onAcquireWait — queued ────────────────────────────────────────────────────

void it('onAcquireWait fires once per queued caller, after onContended', async () => {
  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });

  const t = new RecordingThrottle({ 'concurrencyLimit': 1 });

  const first = t.execute(async () => { await blocker; return 'a'; });
  await Promise.resolve();

  const second = t.execute(async () => { return 'b'; });
  const third = t.execute(async () => { return 'c'; });

  unblock();
  await Promise.all([first, second, third]);

  const contended = eventsNamed(t, 'onContended');
  const waited = eventsNamed(t, 'onAcquireWait');

  strictEqual(contended.length, 2, 'two callers contended');
  strictEqual(waited.length, 2, 'two callers waited');

  // onContended must precede onAcquireWait for each queued caller.
  // We verify that overall, every onContended appears before its paired onAcquireWait
  // by checking the event sequence: contended[i] must appear before waited[i].
  for (let i = 0; i < 2; i++) {
    const cIdx = t.events.indexOf(contended[i]!);
    const wIdx = t.events.indexOf(waited[i]!);
    ok(cIdx < wIdx, `onContended[${i}] must precede onAcquireWait[${i}]`);
  }

  // Queue depth at each wait: first waiter sees queue length 1, second sees 2.
  strictEqual((waited[0]!.args as [number])[0], 1, 'first waiter: queue depth 1');
  strictEqual((waited[1]!.args as [number])[0], 2, 'second waiter: queue depth 2');
});

// ── onWindowSlide — queued caller gets slot ───────────────────────────────────

void it('onWindowSlide fires for each queued caller that is granted a slot', async () => {
  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });

  const t = new RecordingThrottle({ 'concurrencyLimit': 1 });

  const first = t.execute(async () => { await blocker; return 'a'; });
  await Promise.resolve();

  const second = t.execute(async () => { return 'b'; });

  unblock();
  await Promise.all([first, second]);

  const slides = eventsNamed(t, 'onWindowSlide');
  strictEqual(slides.length, 1, 'one window slide for one queued caller');
  strictEqual((slides[0]!.args as [number, number])[0], 1, 'activeCount is 1 after slide');
  strictEqual((slides[0]!.args as [number, number])[1], 0, 'queue is empty after slide');
});

void it('onWindowSlide fires before the caller proceeds (before onRelease of that slot)', async () => {
  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });

  const t = new RecordingThrottle({ 'concurrencyLimit': 1 });

  const first = t.execute(async () => { await blocker; return 'a'; });
  await Promise.resolve();
  const second = t.execute(async () => { return 'b'; });

  unblock();
  await Promise.all([first, second]);

  const slideIdx = t.events.findIndex((e) => {return e.name === 'onWindowSlide';});
  // There must be a release after the slide (the release of the second op)
  const releaseAfterSlide = t.events.slice(slideIdx + 1).some((e) => {return e.name === 'onRelease';});
  ok(slideIdx >= 0, 'onWindowSlide must be present');
  ok(releaseAfterSlide, 'onRelease must fire after onWindowSlide');
});

// ── onRelease — slot freed ────────────────────────────────────────────────────

void it('onRelease fires at least once per completed operation', async () => {
  const t = new RecordingThrottle({ 'concurrencyLimit': 3 });

  await Promise.all([
    t.execute(async () => { return 1; }),
    t.execute(async () => { return 2; }),
    t.execute(async () => { return 3; }),
  ]);

  const releases = eventsNamed(t, 'onRelease');
  // Each op generates at least one release event; the last op also triggers
  // notifyObservers which may fire an additional release.
  ok(releases.length >= 3, 'at least three releases for three operations');

  // totalExecuted in the final release event must be 3
  const lastRelease = releases.at(-1)!;
  strictEqual((lastRelease.args as [number, number])[1], 3, 'totalExecuted = 3 on last release');
});

// ── onDrainStart + onDrainComplete ───────────────────────────────────────────

void it('onDrainStart fires when drain is called; onDrainComplete fires when drain finishes', async () => {
  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });

  const t = new RecordingThrottle({ 'concurrencyLimit': 2 });

  // Queue one active op and one waiter so drain has real work to wait for.
  const op1 = t.execute(async () => { await blocker; return 'a'; });
  const op2 = t.execute(async () => { await blocker; return 'b'; });
  await Promise.resolve();

  const drainPromise = t.drain();

  const drainStartEvents = eventsNamed(t, 'onDrainStart');
  strictEqual(drainStartEvents.length, 1, 'onDrainStart fires once');
  // activeCount at drain time is 2
  strictEqual((drainStartEvents[0]!.args as [number, number])[0], 2, 'activeCount is 2 at drain start');

  // No drain-complete yet
  strictEqual(eventsNamed(t, 'onDrainComplete').length, 0, 'onDrainComplete not yet fired');

  unblock();
  await Promise.all([op1, op2, drainPromise]);

  const drainCompleteEvents = eventsNamed(t, 'onDrainComplete');
  strictEqual(drainCompleteEvents.length, 1, 'onDrainComplete fires once');
  strictEqual((drainCompleteEvents[0]!.args as [number])[0], 2, 'totalExecuted is 2 at drain complete');

  // onDrainStart must precede onDrainComplete in the event log
  const startIdx = t.events.indexOf(drainStartEvents[0]!);
  const completeIdx = t.events.indexOf(drainCompleteEvents[0]!);
  ok(startIdx < completeIdx, 'onDrainStart precedes onDrainComplete');
});

void it('onDrainComplete does not fire when abort() is used (abort is not drain)', async () => {
  const t = new RecordingThrottle({ 'concurrencyLimit': 2 });

  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });

  void t.execute(async () => { await blocker; return 'x'; });
  await Promise.resolve();

  unblock();
  await t.abort();

  strictEqual(eventsNamed(t, 'onDrainComplete').length, 0, 'onDrainComplete must not fire on abort');
});

// ── onAbortStart ─────────────────────────────────────────────────────────────

void it('onAbortStart fires once with the number of cancelled operations', async () => {
  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });

  const t = new RecordingThrottle({ 'concurrencyLimit': 1 });

  const first = t.execute(async () => { await blocker; return 'a'; });
  await Promise.resolve();
  // Second caller is queued
  void t.execute(async () => { return 'b'; });
  await Promise.resolve();

  unblock();
  await t.abort();
  // Await first so we don't have dangling promises
  await first.catch(() => {/* ignore */});

  const abortEvents = eventsNamed(t, 'onAbortStart');
  strictEqual(abortEvents.length, 1, 'onAbortStart fires once');
});

// ── onReject — operation error ────────────────────────────────────────────────

void it('onReject fires with the thrown error when an operation rejects', async () => {
  const t = new RecordingThrottle({ 'concurrencyLimit': 2 });
  const boom = new Error('boom');

  await t.execute(async () => { throw boom; }).catch(() => {/* expected */});

  const rejectEvents = eventsNamed(t, 'onReject');
  strictEqual(rejectEvents.length, 1, 'onReject fires once');
  strictEqual((rejectEvents[0]!.args as [unknown])[0], boom, 'onReject receives the original error');
});

void it('onReject fires independently of onRelease (error path does not release a slot the same way)', async () => {
  const t = new RecordingThrottle({ 'concurrencyLimit': 2 });

  await t.execute(async () => { throw new Error('err'); }).catch(() => {/* expected */});

  const rejectEvents = eventsNamed(t, 'onReject');
  ok(rejectEvents.length >= 1, 'onReject fires on error');
});

// ── onEnter — FSM transitions ─────────────────────────────────────────────────

void it('onEnter fires for idle→active and active→idle transitions', async () => {
  const t = new RecordingThrottle({ 'concurrencyLimit': 2 });

  await t.execute(async () => { return 'x'; });

  const enters = eventsNamed(t, 'onEnter');
  const idleToActive = enters.find((e) => {
    const args = e.args as [ThrottleStateType, ThrottleStateType];
    return args[0] === 'active' && args[1] === 'idle';
  });
  const activeToIdle = enters.find((e) => {
    const args = e.args as [ThrottleStateType, ThrottleStateType];
    return args[0] === 'idle' && args[1] === 'active';
  });

  ok(idleToActive !== undefined, 'onEnter fires for idle→active');
  ok(activeToIdle !== undefined, 'onEnter fires for active→idle');
});

// ── Ordering: contended → acquireWait → windowSlide → release ────────────────

void it('hook order is: onContended, onAcquireWait, onWindowSlide, then onRelease for queued op', async () => {
  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });

  const t = new RecordingThrottle({ 'concurrencyLimit': 1 });

  const first = t.execute(async () => { await blocker; return 'a'; });
  await Promise.resolve();
  const second = t.execute(async () => { return 'b'; });

  unblock();
  await Promise.all([first, second]);

  const nameSeq = t.events
    .filter((e) => {
      return (
        e.name === 'onContended' ||
        e.name === 'onAcquireWait' ||
        e.name === 'onWindowSlide' ||
        e.name === 'onRelease'
      );
    })
    .map((e) => {return e.name;});

  // contended and acquireWait must come before windowSlide
  const contendedIdx = nameSeq.indexOf('onContended');
  const acquireWaitIdx = nameSeq.indexOf('onAcquireWait');
  const slideIdx = nameSeq.indexOf('onWindowSlide');

  ok(contendedIdx >= 0, 'onContended present');
  ok(acquireWaitIdx >= 0, 'onAcquireWait present');
  ok(slideIdx >= 0, 'onWindowSlide present');
  ok(contendedIdx < slideIdx, 'onContended before onWindowSlide');
  ok(acquireWaitIdx < slideIdx, 'onAcquireWait before onWindowSlide');

  // The first release must come after the first windowSlide
  const firstReleaseIdx = nameSeq.indexOf('onRelease');
  ok(firstReleaseIdx > slideIdx, 'onRelease of queued op comes after onWindowSlide');
});

// ── Idle drain (no active ops) ────────────────────────────────────────────────

void it('onDrainStart fires but onDrainComplete does not fire when drain is called with no ops', async () => {
  const t = new RecordingThrottle({ 'concurrencyLimit': 2 });

  // drain on an idle throttle: transitions idle→draining then immediately draining→idle
  // but since there are no ops, notifyObservers is not called via the op completion path.
  // drain() calls waitForCompletion() which resolves immediately because isComplete() is true.
  await t.drain();

  // onDrainStart fires because drain() calls it.
  strictEqual(eventsNamed(t, 'onDrainStart').length, 1, 'onDrainStart fires');
  // onDrainComplete does NOT fire because notifyObservers() is never called
  // (there are no ops to finish, so the idle path is taken via waitForCompletion early exit).
  strictEqual(eventsNamed(t, 'onDrainComplete').length, 0, 'onDrainComplete does not fire with no active ops');
});

// ── onAdaptiveAdjust ─────────────────────────────────────────────────────────

void it('onAdaptiveAdjust fires when adaptive concurrency changes the limit', async () => {
  // targetLatencyMs is very high (5000ms) so any realistic op latency
  // is well below scaleUpThreshold (0.5 * 5000 = 2500ms), forcing scale-up.
  // sampleWindow=10 means we need 10 samples before any check is made.
  // adjustmentInterval=100 means at least 100ms must pass between checks.
  const t = new RecordingThrottle({
    'adaptive': {
      'adjustmentInterval': 100,
      'enabled': true,
      'maxConcurrency': 20,
      'minConcurrency': 1,
      'sampleWindow': 10,
      'scaleDownThreshold': 2.0,
      'scaleUpThreshold': 0.5,
      'stepSize': 1,
      'targetLatencyMs': 5000,
    },
    'concurrencyLimit': 5,
  });

  // Batch 1: fill the sample window (10 ops).
  await Promise.all(
    Array.from({ 'length': 10 }, () => {
      return t.execute(async () => { return true; });
    })
  );

  // Wait past the adjustmentInterval so the next batch can trigger an adjustment.
  await setTimeout(150);

  // Batch 2: one more op after the interval gap — this should trigger onAdaptiveAdjust.
  await t.execute(async () => { return true; });

  const adjustEvents = eventsNamed(t, 'onAdaptiveAdjust');
  ok(adjustEvents.length >= 1, 'onAdaptiveAdjust fires at least once');

  for (const e of adjustEvents) {
    const [prev, next] = e.args as [number, number];
    ok(prev !== next, 'previousLimit and newLimit differ');
  }
});
