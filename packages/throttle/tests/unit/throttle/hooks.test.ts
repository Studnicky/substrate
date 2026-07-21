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
  rejects,
  strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { HookInvocationError } from '@studnicky/errors';

import type { ThrottleStateEntity } from '../../../src/entities/ThrottleStateEntity.js';

import { Throttle } from '../../../src/throttle/index.js';

// ── Recording subclass ────────────────────────────────────────────────────────

type HookEvent =
  | { 'args': [number]; 'name': 'onAbortStart' }
  | { 'args': [number, number]; 'name': 'onAcquire' }
  | { 'args': [number]; 'name': 'onAcquireWait' }
  | { 'args': [number, number]; 'name': 'onAdaptiveAdjust' }
  | { 'args': [number, number]; 'name': 'onContended' }
  | { 'args': [number]; 'name': 'onDrainComplete' }
  | { 'args': [number, number]; 'name': 'onDrainStart' }
  | { 'args': [ThrottleStateEntity.Type, ThrottleStateEntity.Type]; 'name': 'onEnter' }
  | { 'args': [unknown]; 'name': 'onReject' }
  | { 'args': [number, number]; 'name': 'onRelease' }
  | { 'args': [number, number]; 'name': 'onWindowSlide' };

class RecordingThrottle extends Throttle {
  readonly events: HookEvent[] = [];

  public constructor(config?: Parameters<typeof Throttle.create>[0]) {
    super(config);
  }

  protected override onEnter(to: ThrottleStateEntity.Type, from: ThrottleStateEntity.Type): void {
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

function eventsNamed<Name extends HookEvent['name']>(
  t: RecordingThrottle,
  name: Name
): Extract<HookEvent, { 'name': Name }>[] {
  return t.events.filter((event): event is Extract<HookEvent, { 'name': Name }> => {
    return event.name === name;
  });
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

void it('a synchronous onAcquireWait failure removes its waiter without leaking capacity', async () => {
  const boom = new Error('onAcquireWait boom');

  class ThrowingAcquireWaitThrottle extends Throttle {
    protected override onAcquireWait(): void {
      throw boom;
    }
  }

  let releaseHolder: () => void = () => {};
  const holderGate = new Promise<void>((resolve) => { releaseHolder = resolve; });
  const throttle = new ThrowingAcquireWaitThrottle({ 'concurrencyLimit': 1 });
  const holder = throttle.execute(async () => { await holderGate; return 'holder'; });
  await Promise.resolve();

  await rejects(
    throttle.execute(async () => 'rejected-waiter'),
    (error: unknown) => {
      ok(error instanceof HookInvocationError);
      strictEqual(error.hookName, 'onAcquireWait');
      strictEqual(error.cause, boom);
      return true;
    }
  );

  strictEqual(throttle.getStats().activeCount, 1);
  strictEqual(throttle.getStats().queuedCount, 0);

  releaseHolder();
  strictEqual(await holder, 'holder');
  strictEqual(throttle.getStats().activeCount, 0);
  strictEqual(throttle.getStats().queuedCount, 0);
  strictEqual(await throttle.execute(async () => 'later'), 'later');
  strictEqual(throttle.getStats().activeCount, 0);
});

void it('an async-rejecting onAcquireWait removes its waiter without an unhandled rejection or capacity leak', async () => {
  const boom = new Error('onAcquireWait async boom');
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  class AsyncRejectingAcquireWaitThrottle extends Throttle {
    protected override async onAcquireWait(): Promise<void> {
      await Promise.resolve();
      throw boom;
    }
  }

  let releaseHolder: () => void = () => {};
  const holderGate = new Promise<void>((resolve) => { releaseHolder = resolve; });
  const throttle = new AsyncRejectingAcquireWaitThrottle({ 'concurrencyLimit': 1 });

  try {
    const holder = throttle.execute(async () => { await holderGate; return 'holder'; });
    await Promise.resolve();

    await rejects(
      throttle.execute(async () => 'rejected-waiter'),
      (error: unknown) => {
        ok(error instanceof HookInvocationError);
        strictEqual(error.hookName, 'onAcquireWait');
        strictEqual(error.cause, boom);
        return true;
      }
    );

    strictEqual(throttle.getStats().activeCount, 1);
    strictEqual(throttle.getStats().queuedCount, 0);

    releaseHolder();
    strictEqual(await holder, 'holder');
    strictEqual(throttle.getStats().activeCount, 0);
    strictEqual(throttle.getStats().queuedCount, 0);
    strictEqual(await throttle.execute(async () => 'later'), 'later');
    strictEqual(throttle.getStats().activeCount, 0);

    await setTimeout(0);
    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
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
    const args = e.args;
    return args[0] === 'active' && args[1] === 'idle';
  });
  const activeToIdle = enters.find((e) => {
    const args = e.args;
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

void it('a throwing onAcquire hook surfaces a HookInvocationError instead of the successful execute() result', async () => {
  const boom = new Error('onAcquire boom');

  class ThrowingAcquireThrottle extends Throttle {
    protected override onAcquire(): void {
      throw boom;
    }
  }

  const t = new ThrowingAcquireThrottle({ 'concurrencyLimit': 1 });

  await rejects(
    t.execute(async () => 'ok'),
    (error: unknown) => {
      ok(error instanceof HookInvocationError);
      strictEqual(error.hookName, 'onAcquire');
      strictEqual(error.cause, boom);

      return true;
    }
  );

  // The slot is rolled back, not leaked, when the hook fails.
  strictEqual(t.getStats().activeCount, 0);
});

void it('a throwing onReject hook surfaces a HookInvocationError instead of the original operation error', async () => {
  const boom = new Error('onReject boom');

  class ThrowingRejectThrottle extends Throttle {
    protected override onReject(): void {
      throw boom;
    }
  }

  const t = new ThrowingRejectThrottle({ 'concurrencyLimit': 1 });

  await rejects(
    t.execute(async () => { throw new Error('boom'); }),
    (error: unknown) => {
      ok(error instanceof HookInvocationError);
      strictEqual(error.hookName, 'onReject');
      strictEqual(error.cause, boom);

      return true;
    }
  );

  strictEqual(t.getStats().activeCount, 0, 'the failed hook does not leak the operation slot');
  strictEqual(await t.execute(async () => 'next'), 'next', 'later operations can acquire the released slot');
});

void it('a release hook failure takes precedence over an onReject failure after slot cleanup', async () => {
  const rejectBoom = new Error('onReject boom');
  const releaseBoom = new Error('onRelease boom');
  let remainingReleaseFailures = 1;

  class ThrowingRejectAndReleaseThrottle extends Throttle {
    protected override onReject(): void {
      throw rejectBoom;
    }

    protected override onRelease(): void {
      if (remainingReleaseFailures > 0) {
        remainingReleaseFailures--;
        throw releaseBoom;
      }
    }
  }

  const t = new ThrowingRejectAndReleaseThrottle({ 'concurrencyLimit': 1 });

  await rejects(
    t.execute(async () => { throw new Error('operation boom'); }),
    (error: unknown) => {
      ok(error instanceof HookInvocationError);
      strictEqual(error.hookName, 'onRelease');
      strictEqual(error.cause, releaseBoom);

      return true;
    }
  );

  strictEqual(t.getStats().activeCount, 0, 'the slot is released before the cleanup failure propagates');
  strictEqual(await t.execute(async () => 'next'), 'next', 'the cleaned-up throttle remains usable');
});

void it('a throwing onDrainStart hook surfaces a HookInvocationError from drain()', async () => {
  const boom = new Error('onDrainStart boom');

  class ThrowingDrainThrottle extends Throttle {
    protected override onDrainStart(): void {
      throw boom;
    }
  }

  const t = new ThrowingDrainThrottle({ 'concurrencyLimit': 1 });

  await rejects(
    t.drain(),
    (error: unknown) => {
      ok(error instanceof HookInvocationError);
      strictEqual(error.hookName, 'onDrainStart');
      strictEqual(error.cause, boom);

      return true;
    }
  );
});

void it('a throwing onAbortStart hook surfaces a HookInvocationError from abort()', async () => {
  const boom = new Error('onAbortStart boom');

  class ThrowingAbortThrottle extends Throttle {
    protected override onAbortStart(): void {
      throw boom;
    }
  }

  const t = new ThrowingAbortThrottle({ 'concurrencyLimit': 1 });

  await rejects(
    t.abort(),
    (error: unknown) => {
      ok(error instanceof HookInvocationError);
      strictEqual(error.hookName, 'onAbortStart');
      strictEqual(error.cause, boom);

      return true;
    }
  );
});

void it('a throwing onAbortStart hook still cancels a queued caller (execute() settles, does not hang)', async () => {
  const boom = new Error('onAbortStart boom');

  class ThrowingAbortThrottle extends Throttle {
    protected override onAbortStart(): void {
      throw boom;
    }
  }

  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });

  const t = new ThrowingAbortThrottle({ 'concurrencyLimit': 1 });
  const first = t.execute(async () => { await blocker; return 'a'; });
  await Promise.resolve();
  const second = t.execute(async () => { return 'b'; });

  const abortResult = t.abort().catch((error: unknown) => { return { 'errored': true, error }; });
  const timeout = setTimeout(2000).then(() => { return 'TIMEOUT'; });

  const secondOutcome = await Promise.race([second, timeout]);
  ok(secondOutcome !== 'TIMEOUT', 'the queued caller must settle, not hang, even though onAbortStart threw');

  const abortOutcome = await abortResult;
  ok(typeof abortOutcome === 'object' && abortOutcome !== null && 'errored' in abortOutcome, 'abort() still surfaces the hook failure');
  ok(
    (abortOutcome as { 'error': unknown }).error instanceof HookInvocationError,
    'abort() rejects with a HookInvocationError'
  );
  strictEqual((abortOutcome as { 'error': HookInvocationError }).error.hookName, 'onAbortStart');

  unblock();
  await first.catch(() => {/* discarded on abort */});
});

void it('a throwing onRelease hook still unblocks a pending drain() call (drain settles, does not hang)', async () => {
  const boom = new Error('onRelease boom');

  class ThrowingReleaseThrottle extends Throttle {
    protected override onRelease(): void {
      throw boom;
    }
  }

  const t = new ThrowingReleaseThrottle({ 'concurrencyLimit': 1 });
  const op = t.execute(async () => 'done').catch((error: unknown) => { return { 'errored': true, error }; });
  await Promise.resolve();

  const drainPromise = t.drain().catch((error: unknown) => { return { 'errored': true, error }; });
  const timeout = setTimeout(2000).then(() => { return 'TIMEOUT'; });

  const drainOutcome = await Promise.race([drainPromise, timeout]);
  ok(drainOutcome !== 'TIMEOUT', 'drain() must settle, not hang, even though onRelease threw');

  const opOutcome = await op;
  ok(typeof opOutcome === 'object' && opOutcome !== null && 'errored' in opOutcome, 'the operation itself still surfaces the hook failure');
  ok((opOutcome as { 'error': unknown }).error instanceof HookInvocationError);
  strictEqual((opOutcome as { 'error': HookInvocationError }).error.hookName, 'onRelease');
  strictEqual(t.getStats().isDraining, false, 'release cleanup transitions the throttle out of draining');
});

void it('a drain-complete failure takes precedence over a release failure after all waiters are notified', async () => {
  const releaseBoom = new Error('onRelease boom');
  const drainCompleteBoom = new Error('onDrainComplete boom');

  class ThrowingReleaseAndDrainCompleteThrottle extends Throttle {
    protected override onRelease(): void {
      throw releaseBoom;
    }

    protected override onDrainComplete(): void {
      throw drainCompleteBoom;
    }
  }

  let releaseOperation: () => void = () => {};
  const operationGate = new Promise<void>((resolve) => { releaseOperation = resolve; });
  const t = new ThrowingReleaseAndDrainCompleteThrottle({ 'concurrencyLimit': 1 });
  const operation = t.execute(async () => { await operationGate; return 'done'; });
  const operationFailure = rejects(
    operation,
    (error: unknown) => {
      ok(error instanceof HookInvocationError);
      strictEqual(error.hookName, 'onDrainComplete');
      strictEqual(error.cause, drainCompleteBoom);

      return true;
    }
  );
  await Promise.resolve();

  const drainA = t.drain();
  const drainB = t.drain();
  releaseOperation();

  const drainOutcome = await Promise.race([
    Promise.all([drainA, drainB]).then(() => 'SETTLED'),
    setTimeout(2000).then(() => 'TIMEOUT'),
  ]);

  strictEqual(drainOutcome, 'SETTLED', 'both drain waiters settle before the hook failure propagates');
  await operationFailure;
  strictEqual(t.getStats().activeCount, 0);
  strictEqual(t.getStats().isDraining, false);
  strictEqual(t.isComplete(), true);
});

void it('a throwing onDrainComplete hook still transitions the FSM out of draining and unblocks other drain() waiters', async () => {
  const boom = new Error('onDrainComplete boom');

  class ThrowingDrainCompleteThrottle extends Throttle {
    protected override onDrainComplete(): void {
      throw boom;
    }
  }

  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });

  const t = new ThrowingDrainCompleteThrottle({ 'concurrencyLimit': 1 });
  const op = t.execute(async () => { await blocker; return 'done'; })
    .catch((error: unknown) => { return { 'errored': true, error }; });
  await Promise.resolve();

  // drain() transitions to 'draining'; the operation is still in flight, so
  // both drain() callers register as waiters via waitForCompletion().
  const drainA = t.drain().catch((error: unknown) => { return { 'errored': true, error }; });
  const drainB = t.drain().catch((error: unknown) => { return { 'errored': true, error }; });
  await Promise.resolve();

  unblock();

  const timeout = setTimeout(2000).then(() => { return 'TIMEOUT'; });

  const [outcomeA, outcomeB] = await Promise.race([
    Promise.all([drainA, drainB]),
    timeout.then((marker) => { return [marker, marker]; }),
  ]);

  ok(outcomeA !== 'TIMEOUT' && outcomeB !== 'TIMEOUT', 'both drain() waiters must settle, not hang, even though onDrainComplete threw');
  strictEqual(t.getStats().isDraining, false, 'the FSM transitions out of draining even though onDrainComplete threw');

  await op;
});

void it('a throwing onEnter hook on the draining→idle transition still unblocks pending drain() waiters', async () => {
  const boom = new Error('onEnter boom');

  class ThrowingIdleEnterThrottle extends Throttle {
    protected override onEnter(to: ThrottleStateEntity.Type, from: ThrottleStateEntity.Type): void {
      if (to === 'idle' && from === 'draining') {
        throw boom;
      }
    }
  }

  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });

  const t = new ThrowingIdleEnterThrottle({ 'concurrencyLimit': 1 });
  const op = t.execute(async () => { await blocker; return 'done'; })
    .catch((error: unknown) => { return { 'errored': true, error }; });
  await Promise.resolve();

  const drainA = t.drain().catch((error: unknown) => { return { 'errored': true, error }; });
  const drainB = t.drain().catch((error: unknown) => { return { 'errored': true, error }; });
  await Promise.resolve();

  unblock();

  const timeout = setTimeout(2000).then(() => { return 'TIMEOUT'; });

  const [outcomeA, outcomeB] = await Promise.race([
    Promise.all([drainA, drainB]),
    timeout.then((marker) => { return [marker, marker]; }),
  ]);

  ok(outcomeA !== 'TIMEOUT' && outcomeB !== 'TIMEOUT', 'both drain() waiters must settle, not hang, even though onEnter threw on the draining→idle transition');
  strictEqual(t.getStats().isDraining, false, 'the FSM state is idle (transition() sets #state before onEnter runs)');

  await op;
});

void it('an async onAcquire override that rejects is routed through onHookError instead of becoming an unhandled rejection', async () => {
  const boom = new Error('onAcquire async boom');
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  class AsyncRejectingAcquireThrottle extends Throttle {
    protected override async onAcquire(): Promise<void> {
      await Promise.resolve();
      throw boom;
    }
  }

  const t = new AsyncRejectingAcquireThrottle({ 'concurrencyLimit': 1 });

  try {
    await rejects(
      t.execute(async () => 'ok'),
      (error: unknown) => {
        ok(error instanceof HookInvocationError);
        strictEqual(error.hookName, 'onAcquire');
        strictEqual(error.cause, boom);

        return true;
      }
    );

    // The slot is rolled back, not leaked, when the async hook rejects.
    strictEqual(t.getStats().activeCount, 0);

    await setTimeout(0);
    strictEqual(rejectionEvents.length, 0, 'the rejection must be routed through invoke(), never left unhandled');
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

void it('an async onDrainStart override that rejects is routed through invoke() instead of becoming an unhandled rejection', async () => {
  const boom = new Error('onDrainStart async boom');
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  class AsyncRejectingDrainStartThrottle extends Throttle {
    protected override async onDrainStart(): Promise<void> {
      await Promise.resolve();
      throw boom;
    }
  }

  const t = new AsyncRejectingDrainStartThrottle({ 'concurrencyLimit': 1 });

  try {
    await rejects(
      t.drain(),
      (error: unknown) => {
        ok(error instanceof HookInvocationError);
        strictEqual(error.hookName, 'onDrainStart');
        strictEqual(error.cause, boom);

        return true;
      }
    );

    await setTimeout(0);
    strictEqual(rejectionEvents.length, 0, 'the rejection must be routed through invoke(), never left unhandled');
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

void it('runtime async overrides on synchronous transition and queue hooks preserve FIFO completion without unhandled rejections', async () => {
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  class AsyncRejectingLifecycleThrottle extends Throttle {
    readonly enteredHooks = new Set<string>();

    protected override onEnter(): Promise<void> {
      return this.rejectAfterEntry('onEnter');
    }

    protected override onContended(): Promise<void> {
      return this.rejectAfterEntry('onContended');
    }

    protected override onWindowSlide(): Promise<void> {
      return this.rejectAfterEntry('onWindowSlide');
    }

    protected override onRelease(): Promise<void> {
      return this.rejectAfterEntry('onRelease');
    }

    private async rejectAfterEntry(hookName: string): Promise<void> {
      this.enteredHooks.add(hookName);
      await Promise.resolve();
      throw new Error(`${hookName} async boom`);
    }
  }

  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });
  const t = new AsyncRejectingLifecycleThrottle({ 'concurrencyLimit': 1 });

  try {
    const first = t.execute(async () => { await blocker; return 'first'; });
    await Promise.resolve();
    const second = t.execute(async () => 'second');

    unblock();

    const [firstResult, secondResult] = await Promise.all([first, second]);
    strictEqual(firstResult, 'first');
    strictEqual(secondResult, 'second');
    ok(t.enteredHooks.has('onEnter'));
    ok(t.enteredHooks.has('onContended'));
    ok(t.enteredHooks.has('onWindowSlide'));
    ok(t.enteredHooks.has('onRelease'));
    strictEqual(t.getStats().activeCount, 0);
    strictEqual(t.getStats().queuedCount, 0);

    await setTimeout(0);
    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

void it('a runtime async onReject override preserves the operation error and releases its slot', async () => {
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  class AsyncRejectingRejectThrottle extends Throttle {
    protected override async onReject(): Promise<void> {
      await Promise.resolve();
      throw new Error('onReject async boom');
    }
  }

  const t = new AsyncRejectingRejectThrottle({ 'concurrencyLimit': 1 });
  const operationError = new Error('operation boom');

  try {
    await rejects(
      t.execute(async () => { throw operationError; }),
      (error: unknown) => {
        strictEqual(error, operationError);
        return true;
      }
    );

    strictEqual(t.getStats().activeCount, 0);
    strictEqual(await t.execute(async () => 'next'), 'next');

    await setTimeout(0);
    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

void it('a runtime async onDrainComplete override preserves idle transition and waiter cleanup', async () => {
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  class AsyncRejectingDrainCompleteThrottle extends Throttle {
    enteredDrainComplete = false;

    protected override async onDrainComplete(): Promise<void> {
      this.enteredDrainComplete = true;
      await Promise.resolve();
      throw new Error('onDrainComplete async boom');
    }
  }

  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });
  const t = new AsyncRejectingDrainCompleteThrottle({ 'concurrencyLimit': 1 });

  try {
    const operation = t.execute(async () => { await blocker; return 'done'; });
    await Promise.resolve();
    const firstDrain = t.drain();
    const secondDrain = t.drain();

    unblock();

    strictEqual(await operation, 'done');
    await Promise.all([firstDrain, secondDrain]);
    strictEqual(t.enteredDrainComplete, true);
    strictEqual(t.getStats().isDraining, false);
    strictEqual(t.isComplete(), true);

    await setTimeout(0);
    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

void it('a runtime async onAdaptiveAdjust override preserves the committed limit adjustment', async () => {
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  class AsyncRejectingAdaptiveThrottle extends Throttle {
    adjustmentEntries = 0;

    protected override async onAdaptiveAdjust(): Promise<void> {
      this.adjustmentEntries++;
      await Promise.resolve();
      throw new Error('onAdaptiveAdjust async boom');
    }
  }

  const t = new AsyncRejectingAdaptiveThrottle({
    'adaptive': {
      'adjustmentInterval': 100,
      'enabled': true,
      'maxConcurrency': 20,
      'minConcurrency': 1,
      'sampleWindow': 10,
      'scaleDownThreshold': 2,
      'scaleUpThreshold': 0.5,
      'stepSize': 1,
      'targetLatencyMs': 5000
    },
    'concurrencyLimit': 5
  });

  try {
    await Promise.all(Array.from({ 'length': 10 }, () => { return t.execute(async () => true); }));
    await setTimeout(150);
    strictEqual(await t.execute(async () => true), true);

    const adaptive = t.getStats().adaptive;
    ok(adaptive !== undefined);
    ok(adaptive.adjustmentCount > 0);
    ok(t.adjustmentEntries > 0);

    await setTimeout(0);
    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

void it('a synchronous onWindowSlide failure rejects only the dequeued waiter after slot rollback', async () => {
  const boom = new Error('onWindowSlide boom');

  class ThrowingWindowSlideThrottle extends Throttle {
    protected override onWindowSlide(): void {
      throw boom;
    }
  }

  let unblock!: () => void;
  const blocker = new Promise<void>((resolve) => { unblock = resolve; });
  const t = new ThrowingWindowSlideThrottle({ 'concurrencyLimit': 1 });
  const first = t.execute(async () => { await blocker; return 'first'; });
  await Promise.resolve();
  const second = t.execute(async () => 'second');

  unblock();

  strictEqual(await first, 'first');
  await rejects(
    second,
    (error: unknown) => {
      ok(error instanceof HookInvocationError);
      strictEqual(error.hookName, 'onWindowSlide');
      strictEqual(error.cause, boom);
      return true;
    }
  );
  strictEqual(t.getStats().activeCount, 0);
  strictEqual(t.getStats().queuedCount, 0);
  strictEqual(await t.execute(async () => 'later'), 'later');
  strictEqual(t.getStats().activeCount, 0);
});

// ── HookInvocationError regression ───────────────────────────────────────────

void it('a throwing lifecycle hook produces a HookInvocationError carrying the hook name and original cause', async () => {
  const cause = new Error('onEnter boom');

  class ThrowingEnterThrottle extends Throttle {
    protected override onEnter(): void {
      throw cause;
    }
  }

  const t = new ThrowingEnterThrottle({ 'concurrencyLimit': 1 });

  await rejects(
    t.execute(async () => 'ok'),
    (error: unknown) => {
      ok(error instanceof HookInvocationError, 'error is a HookInvocationError');
      strictEqual(error.hookName, 'onEnter', 'hookName identifies the failing hook');
      strictEqual(error.cause, cause, 'cause is the original thrown error');

      return true;
    }
  );
});
