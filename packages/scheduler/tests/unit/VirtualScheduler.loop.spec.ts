/**
 * Unit tests for `VirtualScheduler`.
 * Requires `@studnicky/clock` — `VirtualTimeCounter` and `VirtualClockProvider`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';
import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import { VirtualScheduler } from '../../src/scheduler/VirtualScheduler.js';
import { MinimumHeap } from '../../src/scheduler/MinimumHeap.js';
import scenarioGroups from './VirtualScheduler.scenarios.json' with { type: 'json' };

class FireRecord {
  public count = 0;

  public record(): void {
    this.count++;
  }
}

type ScenarioInput = {
  batch?: Record<string, unknown>;
  scheduler: Record<string, unknown>;
};
type ScenarioRunnerContext = {
  batch: Record<string, unknown>;
  expected: Record<string, unknown>;
  input: Record<string, unknown>;
};
type ScenarioRunner = (context: ScenarioRunnerContext) => Promise<void> | void;
type ScenarioCase = {
  description: string;
  expected?: Record<string, unknown>;
  input: ScenarioInput;
  shape: string;
  name: string;
};

type HeapTaskFireShape = 'noop';
type HeapTaskVariant = 'interval' | 'timeout';
type MutableHeapTask = {
  atMs: number;
  fire: () => void;
  id: string;
  intervalMs: number;
  variant: HeapTaskVariant;
};
type HeapTaskDescriptor = {
  atMs: number;
  fire: HeapTaskFireShape;
  id: string;
  intervalMs: number;
  mutation?: {
    atMs?: number;
    id?: string;
  };
  variant: HeapTaskVariant;
};

const heapTaskFireDispatch = {
  noop: (): (() => void) => {
    return (): void => { return; };
  }
} satisfies Record<HeapTaskFireShape, () => () => void>;
const heapTaskMutationDispatch = {
  atMs: (task: MutableHeapTask, mutation: NonNullable<HeapTaskDescriptor['mutation']>): void => {
    if (mutation.atMs !== undefined) {
      task.atMs = mutation.atMs;
    }
  },
  id: (task: MutableHeapTask, mutation: NonNullable<HeapTaskDescriptor['mutation']>): void => {
    if (mutation.id !== undefined) {
      task.id = mutation.id;
    }
  }
} satisfies Record<keyof NonNullable<HeapTaskDescriptor['mutation']>, (task: MutableHeapTask, mutation: NonNullable<HeapTaskDescriptor['mutation']>) => void>;

function createCounter(startMs: number): VirtualTimeCounter {
  return VirtualTimeCounter.create({ startMs });
}

function createScheduler(startMs: number): VirtualScheduler {
  return VirtualScheduler.create({ counter: createCounter(startMs) });
}

function numberField(input: Record<string, unknown>, key: string): number {
  const value = input[key];
  if (typeof value !== 'number') {
    throw new Error(`Expected numeric field '${key}'`);
  }
  return value;
}

function materializeHeapTask(descriptor: HeapTaskDescriptor): MutableHeapTask {
  return {
    atMs: descriptor.atMs,
    fire: heapTaskFireDispatch[descriptor.fire](),
    id: descriptor.id,
    intervalMs: descriptor.intervalMs,
    variant: descriptor.variant
  };
}

function applyHeapTaskMutation(task: MutableHeapTask, mutation: HeapTaskDescriptor['mutation'] = {}): void {
  for (const applyMutation of Object.values(heapTaskMutationDispatch)) {
    applyMutation(task, mutation);
  }
}

const scenarioRunners = {
  'virtual-timecounter': ({ expected, input }): void => {
    const counterAdvanceScenarios = input.counterAdvanceScenarios as Array<{ start: number; advances: number[]; expectedNowMs: number }>;
    for (const { start, advances, expectedNowMs } of counterAdvanceScenarios) {
      const counter = VirtualTimeCounter.create({ startMs: start });
      for (const delta of advances) {
        counter.advance(delta);
      }
      assert.strictEqual(counter.nowMs(), expectedNowMs);
    }

    const edgeCases = input.edgeCases as Array<{ advance: number; start: number; expectedNowMs: number }>;
    for (const { advance, start, expectedNowMs } of edgeCases) {
      const counter = VirtualTimeCounter.create({ startMs: start });
      counter.advance(advance);
      assert.strictEqual(counter.nowMs(), expectedNowMs);
    }

    const negativeStartMs = input.negativeStartMs as number;
    assert.throws(() => {
      VirtualTimeCounter.create({ startMs: negativeStartMs });
    });

    const counterInput = input as { finalCounterAdvances: number[]; finalCounterStartMs: number };
    const counter = VirtualTimeCounter.create({ startMs: counterInput.finalCounterStartMs });
    for (const delta of counterInput.finalCounterAdvances) {
      counter.advance(delta);
    }
    assert.strictEqual(counter.nowMs(), expected.finalNowMs as number);
    return;
  },

  'invalid-constructor': (): void => {
    assert.throws(() => {
      VirtualScheduler.create({ counter: null as never });
    });
    assert.throws(() => {
      VirtualScheduler.create({ counter: {} as never });
    });
    return;
  },

  'invalid-interval': ({ input }): void => {
    const invalidIntervalInput = input as { invalidIntervals: number[]; startMs: number };
    const sched = createScheduler(invalidIntervalInput.startMs);
    for (const intervalMs of invalidIntervalInput.invalidIntervals) {
      assert.throws(() => {
        sched.scheduleEvery(intervalMs, () => { return; });
      });
    }
    return;
  },

  'minimum-heap': ({ expected, input }): void => {
    const heapInput = input as { tasks: readonly [HeapTaskDescriptor, HeapTaskDescriptor] };
    const heapExpected = expected as { peekAtMs: number; removedMinimum: Omit<MutableHeapTask, 'fire'>; secondPeekAtMs: number };
    const [firstDescriptor, secondDescriptor] = heapInput.tasks;
    const first = materializeHeapTask(firstDescriptor);
    const second = materializeHeapTask(secondDescriptor);
    const heap = MinimumHeap.create();

    heap.insert(first);
    heap.insert(second);
    applyHeapTaskMutation(first, firstDescriptor.mutation);
    applyHeapTaskMutation(second, secondDescriptor.mutation);

    assert.strictEqual(heap.peekAtMs(), heapExpected.peekAtMs);
    assert.deepStrictEqual(heap.removeMinimum(), {
      atMs: heapExpected.removedMinimum.atMs,
      fire: first.fire,
      id: heapExpected.removedMinimum.id,
      intervalMs: heapExpected.removedMinimum.intervalMs,
      variant: heapExpected.removedMinimum.variant
    });
    assert.strictEqual(heap.peekAtMs(), heapExpected.secondPeekAtMs);
    return;
  },

  'minimum-heap-drain-order': ({ expected, input }): void => {
    const heapInput = input as { tasks: HeapTaskDescriptor[] };
    const heapExpected = expected as { drainedAtMs: number[]; drainedIds: string[]; empty: true };
    const heap = MinimumHeap.create();

    for (const task of heapInput.tasks) {
      heap.insert(materializeHeapTask(task));
    }

    const drainedAtMs: number[] = [];
    const drainedIds: string[] = [];
    let next = heap.removeMinimum();

    while (next !== undefined) {
      drainedAtMs.push(next.atMs);
      drainedIds.push(next.id);
      next = heap.removeMinimum();
    }

    assert.deepStrictEqual(drainedAtMs, heapExpected.drainedAtMs);
    assert.deepStrictEqual(drainedIds, heapExpected.drainedIds);
    assert.strictEqual(heap.peekAtMs() === undefined, heapExpected.empty);
    assert.strictEqual(heap.removeMinimum(), undefined);
    return;
  },

  scheduleAt: ({ expected, input }): void => {
    const scheduleAtInput = input as {
      runs: Array<{ advanceMs: number; atMs: number; counterStartMs: number; expectedKey: string }>;
    };
    const scheduleAtExpected = expected as Record<string, { atMs: number; fired: boolean; idNonEmpty: boolean }>;

    for (const run of scheduleAtInput.runs) {
      const sched = createScheduler(run.counterStartMs);
      let fired = false;
      const task = sched.scheduleAt(run.atMs, () => {
        fired = true;
      });
      sched.advance(run.advanceMs);
      const runExpected = scheduleAtExpected[run.expectedKey];
      assert.ok(runExpected !== undefined, `Missing expected entry for key '${run.expectedKey}'`);
      assert.strictEqual(fired, runExpected.fired);
      assert.strictEqual(task.atMs, runExpected.atMs);
      assert.strictEqual(task.id.length > 0, runExpected.idNonEmpty);
    }
    return;
  },

  scheduleEvery: ({ expected, input }): void => {
    const scheduleEveryInput = input as {
      runs: Array<{ advanceMs: number; counterStartMs: number; expectedKey: string; intervalMs: number }>;
    };
    const scheduleEveryExpected = expected as Record<string, number>;

    for (const run of scheduleEveryInput.runs) {
      const sched = createScheduler(run.counterStartMs);
      let fireCount = 0;
      sched.scheduleEvery(run.intervalMs, () => {
        fireCount++;
      });
      sched.advance(run.advanceMs);
      assert.strictEqual(fireCount, scheduleEveryExpected[run.expectedKey]);
    }
    return;
  },

  'cancelAll-runAll': ({ batch, expected, input }): void => {
    const cancelRunInput = input as {
      cancelAll: { advanceMs: number; atMs: number; counterStartMs: number };
      runAll: { counterStartMs: number; taskStepMs: number };
    };
    const cancelRunExpected = expected as { cancelAllFireCount: number; runAllFireCount: number };
    const cancelSched = createScheduler(cancelRunInput.cancelAll.counterStartMs);
    const rec = new FireRecord();
    for (let index = 0; index < numberField(batch, 'cancelAllTaskCount'); index++) {
      cancelSched.scheduleAt(cancelRunInput.cancelAll.atMs, () => {
        rec.record();
      });
    }
    cancelSched.cancelAll();
    cancelSched.advance(cancelRunInput.cancelAll.advanceMs);
    assert.strictEqual(rec.count, cancelRunExpected.cancelAllFireCount);

    const runAllSched = createScheduler(cancelRunInput.runAll.counterStartMs);
    const runAllRec = new FireRecord();
    for (let index = 0; index < numberField(batch, 'runAllTaskCount'); index++) {
      runAllSched.scheduleAt((index + 1) * cancelRunInput.runAll.taskStepMs, () => {
        runAllRec.record();
      });
    }
    runAllSched.runAll();
    assert.strictEqual(runAllRec.count, cancelRunExpected.runAllFireCount);
    return;
  },

  'edge-cases': ({ batch, expected, input }): void => {
    const edgeInput = input as {
      cancelledAdvanceMs: number;
      cancelledAtMs: number;
      cancelledIntervalFirstAdvanceMs: number;
      cancelledIntervalSecondAdvanceMs: number;
      counterStartMs: number;
      emptyAdvanceMs: number;
      intervalAdvanceMs: number;
      intervalMs: number;
      invalidIntervals: number[];
      runUntilAtMs: number;
      runUntilFirstAtMs: number;
      runUntilSecondAtMs: number;
      stepMs: number;
    };
    const edgeExpected = expected as {
      cancelledFired: boolean;
      cancelledIntervalCount: number;
      cancelledTaskAtMs: number;
      emptyRecordCount: number;
      intervalCount: number;
      invalidIntervalErrorCount: number;
      runUntilFirstFired: boolean;
      runUntilSecondFired: boolean;
      skippedCount: number;
    };
    const sched = createScheduler(edgeInput.counterStartMs);
    let fired = false;
    const task = sched.scheduleAt(edgeInput.cancelledAtMs, () => {
      fired = true;
    });
    task.cancel();
    sched.advance(edgeInput.cancelledAdvanceMs);
    assert.strictEqual(fired, edgeExpected.cancelledFired);
    assert.strictEqual(task.atMs, edgeExpected.cancelledTaskAtMs);
    assert.ok(task.id.length > 0);

    const emptySched = createScheduler(edgeInput.counterStartMs);
    emptySched.cancelAll();
    emptySched.advance(edgeInput.emptyAdvanceMs);

    const skipSched = createScheduler(edgeInput.counterStartMs);
    const rec = new FireRecord();
    const tasks: { readonly cancel: () => void }[] = [];
    for (let index = 0; index < numberField(batch, 'skipCount'); index++) {
      const next = skipSched.scheduleAt((index + 1) * edgeInput.stepMs, () => {
        rec.record();
      });
      tasks.push(next);
    }
    const [first] = tasks;
    first?.cancel();
    skipSched.runAll();
    assert.strictEqual(rec.count, edgeExpected.skippedCount);

    const runAllEmpty = createScheduler(edgeInput.counterStartMs);
    const emptyRecord = new FireRecord();
    runAllEmpty.runAll();
    assert.strictEqual(emptyRecord.count, edgeExpected.emptyRecordCount);

    const runUntilSched = createScheduler(edgeInput.counterStartMs);
    let aFired = false;
    let bFired = false;
    runUntilSched.scheduleAt(edgeInput.runUntilFirstAtMs, () => {
      aFired = true;
    });
    runUntilSched.scheduleAt(edgeInput.runUntilSecondAtMs, () => {
      bFired = true;
    });
    runUntilSched.runUntil(edgeInput.runUntilAtMs);
    assert.strictEqual(aFired, edgeExpected.runUntilFirstFired);
    assert.strictEqual(bFired, edgeExpected.runUntilSecondFired);

    const intervalSched = createScheduler(edgeInput.counterStartMs);
    let count = 0;
    intervalSched.scheduleEvery(edgeInput.intervalMs, () => {
      count++;
    });
    intervalSched.advance(edgeInput.intervalAdvanceMs);
    assert.strictEqual(count, edgeExpected.intervalCount);

    const zeroSched = createScheduler(edgeInput.counterStartMs);
    let invalidIntervalErrorCount = 0;
    for (const intervalMs of edgeInput.invalidIntervals) {
      assert.throws(() => {
        zeroSched.scheduleEvery(intervalMs, () => { return; });
      });
      invalidIntervalErrorCount++;
    }
    assert.strictEqual(invalidIntervalErrorCount, edgeExpected.invalidIntervalErrorCount);

    const cancelledIntervalSched = createScheduler(edgeInput.counterStartMs);
    let intervalCount = 0;
    const intervalTask = cancelledIntervalSched.scheduleEvery(edgeInput.intervalMs, () => {
      intervalCount++;
    });
    cancelledIntervalSched.advance(edgeInput.cancelledIntervalFirstAdvanceMs);
    intervalTask.cancel();
    cancelledIntervalSched.advance(edgeInput.cancelledIntervalSecondAdvanceMs);
    assert.strictEqual(intervalCount, edgeExpected.cancelledIntervalCount);
    return;
  },

  'unhappy-path': async ({ expected, input }): Promise<void> => {
    const unhappyInput = input as {
      advanceCounterStartMs: number;
      advanceDeltas: number[];
      advanceFiredAtMs: number;
      cancelledCounterStartMs: number;
      cancelAtMs: number;
      providerNowMs: number;
      runAllCounterStartMs: number;
      runAllRejectAtMs: number;
      runUntilAdvanceMs: number;
      runUntilCounterStartMs: number;
      runUntilRejectAtMs: number;
    };
    const unhappyExpected = expected as {
      advanceCounterNowMs: number;
      advanceFired: boolean;
      cancelledFired: boolean;
      providerNowMs: number;
    };
    const cancelledSched = createScheduler(unhappyInput.cancelledCounterStartMs);
    let fired = false;
    const task = cancelledSched.scheduleAt(unhappyInput.cancelAtMs, () => {
      fired = true;
    });
    task.cancel();
    cancelledSched.runAll();
    assert.strictEqual(fired, unhappyExpected.cancelledFired);

    const advanceCounter = createCounter(unhappyInput.advanceCounterStartMs);
    const advanceSched = VirtualScheduler.create({ counter: advanceCounter });
    let advanceFired = false;
    advanceSched.scheduleAt(unhappyInput.advanceFiredAtMs, () => {
      advanceFired = true;
    });
    for (const deltaMs of unhappyInput.advanceDeltas) {
      advanceSched.advance(deltaMs);
    }
    assert.strictEqual(advanceFired, unhappyExpected.advanceFired);
    assert.strictEqual(advanceCounter.nowMs(), unhappyExpected.advanceCounterNowMs);

    const runUntilCounter = createCounter(unhappyInput.runUntilCounterStartMs);
    const runUntilSched = VirtualScheduler.create({ counter: runUntilCounter });
    runUntilSched.scheduleAt(unhappyInput.runUntilRejectAtMs, async () => {
      await Promise.resolve();
      throw new Error('runUntil-reject');
    });
    runUntilSched.advance(unhappyInput.runUntilAdvanceMs);
    await Promise.resolve();
    await Promise.resolve();

    const runAllCounter = createCounter(unhappyInput.runAllCounterStartMs);
    const runAllSched = VirtualScheduler.create({ counter: runAllCounter });
    runAllSched.scheduleAt(unhappyInput.runAllRejectAtMs, async () => {
      await Promise.resolve();
      throw new Error('runAll-reject');
    });
    runAllSched.runAll();
    await Promise.resolve();
    await Promise.resolve();

    const provider = VirtualClockProvider.create({
      advance: (_delta: number): void => {},
      nowMs: (): number => unhappyInput.providerNowMs
    });
    assert.strictEqual(provider.now(), unhappyExpected.providerNowMs);
    return;
  },

  'virtual-fire-error-loop': async ({ expected, input }): Promise<void> => {
    const fireErrorExpected = expected as { errorsPerScheduler: number; firedAfterIntervalFailure: number };
    const fireErrorInput = input as { atMs: number; counterStartMs: number; intervalAdvanceDeltas: number[]; intervalMs: number };

    class ErrorHookScheduler extends VirtualScheduler {
      public errors: unknown[] = [];
      public fireCount = 0;

      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onFire(_id: string): void {
        this.fireCount++;
      }

      protected override onFireError(_id: string, error: unknown): void {
        this.errors.push(error);
      }
    }

    const runUntilSyncError = new Error('runUntil sync fire failure');
    const runUntilSyncCounter = createCounter(fireErrorInput.counterStartMs);
    const runUntilSync = new ErrorHookScheduler(runUntilSyncCounter);
    runUntilSync.scheduleEvery(fireErrorInput.intervalMs, () => {
      throw runUntilSyncError;
    });
    for (const deltaMs of fireErrorInput.intervalAdvanceDeltas) {
      runUntilSync.advance(deltaMs);
    }
    assert.deepStrictEqual(runUntilSync.errors, [runUntilSyncError]);
    assert.strictEqual(runUntilSync.fireCount, fireErrorExpected.firedAfterIntervalFailure);

    const runUntilAsyncError = new Error('runUntil async fire failure');
    const runUntilAsync = new ErrorHookScheduler(createCounter(fireErrorInput.counterStartMs));
    runUntilAsync.scheduleAt(fireErrorInput.atMs, () => Promise.reject(runUntilAsyncError));
    runUntilAsync.runUntil(fireErrorInput.atMs);
    await Promise.resolve();
    await Promise.resolve();
    assert.deepStrictEqual(runUntilAsync.errors, [runUntilAsyncError]);

    const runAllSyncError = new Error('runAll sync fire failure');
    const runAllSync = new ErrorHookScheduler(createCounter(fireErrorInput.counterStartMs));
    runAllSync.scheduleAt(fireErrorInput.atMs, () => {
      throw runAllSyncError;
    });
    runAllSync.runAll();
    assert.deepStrictEqual(runAllSync.errors, [runAllSyncError]);

    const runAllAsyncError = new Error('runAll async fire failure');
    const runAllAsync = new ErrorHookScheduler(createCounter(fireErrorInput.counterStartMs));
    runAllAsync.scheduleAt(fireErrorInput.atMs, () => Promise.reject(runAllAsyncError));
    runAllAsync.runAll();
    await Promise.resolve();
    await Promise.resolve();
    assert.deepStrictEqual(runAllAsync.errors, [runAllAsyncError]);
    assert.strictEqual(fireErrorExpected.errorsPerScheduler, 1);
    return;
  },

  'subclass-seams': async ({ batch, expected, input }): Promise<void> => {
    class AuditVirtualScheduler extends VirtualScheduler {
      public scheduleCount = 0;
      public fireCount = 0;
      public cancelCount = 0;
      public cancelAllCount = 0;
      public advanceCount = 0;

      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void {
        this.scheduleCount++;
      }

      protected override onFire(_id: string): void {
        this.fireCount++;
      }

      protected override onCancel(_id: string): void {
        this.cancelCount++;
      }

      protected override onCancelAll(): void {
        this.cancelAllCount++;
      }

      protected override onAdvance(_deltaMs: number): void {
        this.advanceCount++;
      }
    }

    type AuditActionName = 'advance' | 'schedule' | 'schedule-and-advance' | 'schedule-and-cancel' | 'schedule-and-cancel-all';
    type AuditCountKey = 'advanceCount' | 'cancelAllCount' | 'cancelCount' | 'fireCount' | 'scheduleCount';
    type AuditScenarioDescriptor = {
      action: AuditActionName;
      advanceMs?: number;
      atMs?: number;
      counterStartMs: number;
      expectedKey: AuditCountKey;
    };
    const subclassInput = input as {
      advanceMs: number;
      auditScenarios: AuditScenarioDescriptor[];
      cancelAfterFireAtMs: number;
      cancelAtMs: number;
      counterStartMs: number;
      fireErrorAtMs: number;
      fireRejectAtMs: number;
      heapAtMs: number;
      idleAdvanceMs: number;
      idleAtMs: number;
      idleSecondAtMs: number;
      intervalMs: number;
      rescheduleAdvanceMs: number;
      scheduleAtMs: number;
    };
    const subclassExpected = expected as Record<AuditCountKey, number> & {
      asyncErrorCount: number;
      cancelAfterFireCancelCount: number;
      cancelAfterFireFireCount: number;
      cancelCheckerCancelled: boolean;
      cancelRepeatCount: number;
      cancelRepeatFireCount: number;
      counterAccessorNowMs: number;
      fireErrorCount: number;
      heapCreatedCount: number;
      heapFired: boolean;
      idleCount: number;
      idlePartialCount: number;
      observedCauseMessage: string;
      observedHookName: string;
      recordedHookNames: string[];
      rejectionEventsLength: number;
      rescheduleAtMs: number[];
      rescheduleCount: number;
      throwingFireErrorCount: number;
      throwingFireFired: boolean;
      throwingRescheduleFireCount: number;
      throwingScheduleIdNonEmpty: boolean;
    };
    const requiredAuditNumber = (value: number | undefined): number => {
      if (value === undefined) {
        throw new Error('Expected a numeric audit field');
      }
      return value;
    };
    const auditActionDispatch = {
      advance: (sched, scenario): void => {
        sched.advance(requiredAuditNumber(scenario.advanceMs));
      },
      schedule: (sched, scenario): void => {
        sched.scheduleAt(requiredAuditNumber(scenario.atMs), () => { return; });
      },
      'schedule-and-advance': (sched, scenario): void => {
        sched.scheduleAt(requiredAuditNumber(scenario.atMs), () => { return; });
        sched.advance(requiredAuditNumber(scenario.advanceMs));
      },
      'schedule-and-cancel': (sched, scenario): void => {
        const task = sched.scheduleAt(requiredAuditNumber(scenario.atMs), () => { return; });
        task.cancel();
      },
      'schedule-and-cancel-all': (sched, scenario): void => {
        sched.scheduleAt(requiredAuditNumber(scenario.atMs), () => { return; });
        sched.cancelAll();
      }
    } satisfies Record<AuditActionName, (sched: AuditVirtualScheduler, scenario: AuditScenarioDescriptor) => void>;
    const auditCountDispatch = {
      advanceCount: (sched): number => sched.advanceCount,
      cancelAllCount: (sched): number => sched.cancelAllCount,
      cancelCount: (sched): number => sched.cancelCount,
      fireCount: (sched): number => sched.fireCount,
      scheduleCount: (sched): number => sched.scheduleCount
    } satisfies Record<AuditCountKey, (sched: AuditVirtualScheduler) => number>;

    for (const scenario of subclassInput.auditScenarios) {
      const counter = createCounter(scenario.counterStartMs);
      const sched = new AuditVirtualScheduler(counter);
      auditActionDispatch[scenario.action](sched, scenario);
      assert.strictEqual(auditCountDispatch[scenario.expectedKey](sched), subclassExpected[scenario.expectedKey]);
    }

    const repeatCounter = createCounter(subclassInput.counterStartMs);
    const repeatSched = new AuditVirtualScheduler(repeatCounter);
    const repeatTask = repeatSched.scheduleAt(subclassInput.cancelAtMs, () => { return; });
    for (let index = 0; index < numberField(batch, 'repeatCancelCount'); index++) {
      repeatTask.cancel();
    }
    repeatSched.advance(subclassInput.advanceMs);
    assert.strictEqual(repeatSched.cancelCount, subclassExpected.cancelRepeatCount);
    assert.strictEqual(repeatSched.fireCount, subclassExpected.cancelRepeatFireCount);

    const cancelAfterFireCounter = createCounter(subclassInput.counterStartMs);
    const cancelAfterFireSched = new AuditVirtualScheduler(cancelAfterFireCounter);
    const cancelAfterFireTask = cancelAfterFireSched.scheduleAt(subclassInput.cancelAfterFireAtMs, () => { return; });
    cancelAfterFireSched.advance(subclassInput.advanceMs);
    for (let index = 0; index < numberField(batch, 'repeatCancelCount'); index++) {
      cancelAfterFireTask.cancel();
    }
    assert.strictEqual(cancelAfterFireSched.fireCount, subclassExpected.cancelAfterFireFireCount);
    assert.strictEqual(cancelAfterFireSched.cancelCount, subclassExpected.cancelAfterFireCancelCount);

    class CounterAccessor extends VirtualScheduler {
      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      public getCounter(): Readonly<VirtualTimeCounter> {
        return this.virtualCounter;
      }
    }
    const counter = createCounter(subclassInput.counterStartMs);
    const accessor = new CounterAccessor(counter);
    assert.strictEqual(accessor.getCounter().nowMs(), subclassExpected.counterAccessorNowMs);

    class CancelChecker extends VirtualScheduler {
      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      public checkCancelled(id: string): boolean {
        return this.isCancelled(id);
      }
    }
    const cancelCounter = createCounter(subclassInput.counterStartMs);
    const cancelChecker = new CancelChecker(cancelCounter);
    const cancelTask = cancelChecker.scheduleAt(subclassInput.cancelAtMs, () => { return; });
    cancelTask.cancel();
    assert.strictEqual(cancelChecker.checkCancelled(cancelTask.id), subclassExpected.cancelCheckerCancelled);

    let heapCreatedCount = 0;
    class SpyHeapScheduler extends VirtualScheduler {
      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override createHeap(): MinimumHeap {
        heapCreatedCount++;
        return MinimumHeap.create();
      }
    }
    const heapCounter = createCounter(subclassInput.counterStartMs);
    const heapSched = new SpyHeapScheduler(heapCounter);
    assert.strictEqual(heapCreatedCount, subclassExpected.heapCreatedCount);
    let fired = false;
    heapSched.scheduleAt(subclassInput.heapAtMs, () => { fired = true; });
    heapSched.advance(subclassInput.advanceMs);
    assert.strictEqual(fired, subclassExpected.heapFired);

    class ErrorHookScheduler extends VirtualScheduler {
      public fireErrorIds: string[] = [];
      public fireErrorValues: unknown[] = [];
      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onFireError(id: string, error: unknown): void {
        this.fireErrorIds.push(id);
        this.fireErrorValues.push(error);
      }
    }
    const errorCounter = createCounter(subclassInput.counterStartMs);
    const errorSched = new ErrorHookScheduler(errorCounter);
    const thrownError = new Error('task boom');
    errorSched.scheduleAt(subclassInput.fireErrorAtMs, () => { throw thrownError; });
    errorSched.runAll();
    assert.strictEqual(errorSched.fireErrorIds.length, subclassExpected.fireErrorCount);
    assert.strictEqual(errorSched.fireErrorValues[0], thrownError);

    const advanceErrorCounter = createCounter(subclassInput.counterStartMs);
    const advanceErrorSched = new ErrorHookScheduler(advanceErrorCounter);
    advanceErrorSched.scheduleAt(subclassInput.fireErrorAtMs, () => { throw new Error('sync throw'); });
    advanceErrorSched.advance(subclassInput.advanceMs);
    assert.strictEqual(advanceErrorSched.fireErrorIds.length, subclassExpected.fireErrorCount);

    class AsyncErrorHookScheduler extends VirtualScheduler {
      public asyncErrorCount = 0;
      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onFireError(_id: string, _error: unknown): void {
        this.asyncErrorCount++;
      }
    }
    const asyncCounter = createCounter(subclassInput.counterStartMs);
    const asyncSched = new AsyncErrorHookScheduler(asyncCounter);
    asyncSched.scheduleAt(subclassInput.fireRejectAtMs, async () => { throw new Error('async reject'); });
    asyncSched.runAll();
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(asyncSched.asyncErrorCount, subclassExpected.asyncErrorCount);

    class RescheduleHookScheduler extends VirtualScheduler {
      public rescheduleIds: string[] = [];
      public rescheduleAtMs: number[] = [];
      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onReschedule(id: string, atMs: number): void {
        this.rescheduleIds.push(id);
        this.rescheduleAtMs.push(atMs);
      }
    }
    const rescheduleCounter = createCounter(subclassInput.counterStartMs);
    const rescheduleSched = new RescheduleHookScheduler(rescheduleCounter);
    rescheduleSched.scheduleEvery(subclassInput.intervalMs, () => { return; });
    rescheduleSched.advance(subclassInput.rescheduleAdvanceMs);
    assert.strictEqual(rescheduleSched.rescheduleIds.length, subclassExpected.rescheduleCount);
    assert.deepStrictEqual(rescheduleSched.rescheduleAtMs, subclassExpected.rescheduleAtMs);

    class IdleHookScheduler extends VirtualScheduler {
      public idleCount = 0;
      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onIdle(): void {
        this.idleCount++;
      }
    }
    const idleCounter = createCounter(subclassInput.counterStartMs);
    const idleSched = new IdleHookScheduler(idleCounter);
    idleSched.scheduleAt(subclassInput.idleAtMs, () => { return; });
    idleSched.runAll();
    assert.strictEqual(idleSched.idleCount, subclassExpected.idleCount);
    const idleAdvanceCounter = createCounter(subclassInput.counterStartMs);
    const idleAdvanceSched = new IdleHookScheduler(idleAdvanceCounter);
    idleAdvanceSched.scheduleAt(subclassInput.idleAtMs, () => { return; });
    idleAdvanceSched.advance(subclassInput.idleAdvanceMs);
    assert.strictEqual(idleAdvanceSched.idleCount, subclassExpected.idleCount);
    const idleCancelCounter = createCounter(subclassInput.counterStartMs);
    const idleCancelSched = new IdleHookScheduler(idleCancelCounter);
    idleCancelSched.scheduleAt(subclassInput.idleAtMs, () => { return; });
    idleCancelSched.cancelAll();
    assert.strictEqual(idleCancelSched.idleCount, subclassExpected.idleCount);
    const idlePartialCounter = createCounter(subclassInput.counterStartMs);
    const idlePartialSched = new IdleHookScheduler(idlePartialCounter);
    idlePartialSched.scheduleAt(subclassInput.idleAtMs, () => { return; });
    idlePartialSched.scheduleAt(subclassInput.idleSecondAtMs, () => { return; });
    idlePartialSched.advance(subclassInput.idleAdvanceMs);
    assert.strictEqual(idlePartialSched.idleCount, subclassExpected.idlePartialCount);

    class ThrowingScheduleScheduler extends VirtualScheduler {
      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onSchedule(): void {
        throw new Error('onSchedule boom');
      }
    }
    const throwingScheduleCounter = createCounter(subclassInput.counterStartMs);
    const throwingSchedule = new ThrowingScheduleScheduler(throwingScheduleCounter);
    assert.strictEqual(throwingSchedule.scheduleAt(subclassInput.scheduleAtMs, () => { return; }).id.length > 0, subclassExpected.throwingScheduleIdNonEmpty);

    class ThrowingFireScheduler extends VirtualScheduler {
      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onFire(): void {
        throw new Error('onFire boom');
      }
    }
    const throwingFireCounter = createCounter(subclassInput.counterStartMs);
    const throwingFire = new ThrowingFireScheduler(throwingFireCounter);
    let firedTask = false;
    throwingFire.scheduleAt(subclassInput.scheduleAtMs, () => {
      firedTask = true;
    });
    throwingFire.advance(subclassInput.advanceMs);
    assert.strictEqual(firedTask, subclassExpected.throwingFireFired);

    let receivedError: HookInvocationError | undefined;
    class RecordingHookInvoker extends HookInvoker {
      protected override onHookError(hookName: string, cause: unknown): void {
        receivedError = new HookInvocationError(hookName, cause);
      }
    }
    class ObservedThrowingFireScheduler extends VirtualScheduler {
      protected override readonly hooks: HookInvoker = new RecordingHookInvoker();

      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onFire(): void {
        throw new Error('onFire boom');
      }
    }
    const observedCounter = createCounter(subclassInput.counterStartMs);
    const observed = new ObservedThrowingFireScheduler(observedCounter);
    observed.scheduleAt(subclassInput.scheduleAtMs, () => { return; });
    observed.advance(subclassInput.advanceMs);
    assert.ok(receivedError instanceof HookInvocationError);
    assert.strictEqual(receivedError?.hookName, subclassExpected.observedHookName);
    assert.ok(receivedError?.cause instanceof Error);
    assert.strictEqual(receivedError?.cause.message, subclassExpected.observedCauseMessage);

    class ThrowingRescheduleScheduler extends VirtualScheduler {
      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onReschedule(): void {
        throw new Error('onReschedule boom');
      }
    }
    const throwingRescheduleCounter = createCounter(subclassInput.counterStartMs);
    const throwingReschedule = new ThrowingRescheduleScheduler(throwingRescheduleCounter);
    let count = 0;
    throwingReschedule.scheduleEvery(subclassInput.intervalMs, () => {
      count++;
    });
    throwingReschedule.advance(subclassInput.rescheduleAdvanceMs);
    assert.strictEqual(count, subclassExpected.throwingRescheduleFireCount);

    class ThrowingFireErrorScheduler extends VirtualScheduler {
      public fireErrorCount = 0;

      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onFireError(): void {
        this.fireErrorCount++;
        throw new Error('onFireError boom');
      }
    }
    const throwingFireErrorCounter = createCounter(subclassInput.counterStartMs);
    const throwingFireError = new ThrowingFireErrorScheduler(throwingFireErrorCounter);
    throwingFireError.scheduleAt(subclassInput.fireErrorAtMs, () => { throw new Error('task boom'); });
    throwingFireError.runAll();
    assert.strictEqual(throwingFireError.fireErrorCount, subclassExpected.throwingFireErrorCount);

    const recordedHookNames: string[] = [];
    const recordedCauses: unknown[] = [];
    class RecordingSwallowingInvoker extends HookInvoker {
      protected override onHookError(hookName: string, cause: unknown): void {
        recordedHookNames.push(hookName);
        recordedCauses.push(cause);
      }
    }
    const rejectionError = new Error('async onFire rejection');
    class AsyncRejectingFireScheduler extends VirtualScheduler {
      protected override readonly hooks: HookInvoker = new RecordingSwallowingInvoker();

      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override async onFire(_id: string): Promise<void> {
        await Promise.resolve();
        throw rejectionError;
      }
    }
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const asyncFireCounter = createCounter(subclassInput.counterStartMs);
      const asyncFire = new AsyncRejectingFireScheduler(asyncFireCounter);
      asyncFire.scheduleAt(subclassInput.scheduleAtMs, () => { return; });
      asyncFire.runAll();
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(rejectionEvents.length, subclassExpected.rejectionEventsLength);
      assert.deepStrictEqual(recordedHookNames, subclassExpected.recordedHookNames);
      assert.strictEqual(recordedCauses[0], rejectionError);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
    return;
  }
} satisfies Record<string, ScenarioRunner>;

type ScenarioShape = keyof typeof scenarioRunners;

function isScenarioShape(shape: string): shape is ScenarioShape {
  return Object.hasOwn(scenarioRunners, shape);
}

function scenarioRunner(shape: string): ScenarioRunner {
  assert.ok(isScenarioShape(shape), `Unknown VirtualScheduler scenario shape: ${shape}`);
  return scenarioRunners[shape];
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const input = scenarioCase.input.scheduler;
  const batch = scenarioCase.input.batch ?? {};
  const expected = scenarioCase.expected ?? {};

  await scenarioRunner(scenarioCase.shape)({ batch, expected, input });
}

void describe('VirtualScheduler', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
