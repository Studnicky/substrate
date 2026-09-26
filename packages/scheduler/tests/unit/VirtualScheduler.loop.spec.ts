import { RuntimeError, HookInvocationError, HookInvoker } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
/**
 * Unit tests for `VirtualScheduler`.
 * Requires `@studnicky/clock` — `VirtualTimeCounter` and `VirtualClockProvider`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runInNewContext } from 'node:vm';

import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock/node';

import { VirtualScheduler } from '../../src/scheduler/VirtualScheduler.js';
import { MinimumHeap } from '../../src/scheduler/MinimumHeap.js';
import { VirtualSchedulerScenarioCaseEntity } from './entities/VirtualSchedulerScenarioCaseEntity.js';
import scenarioGroups from './VirtualScheduler.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(VirtualSchedulerScenarioCaseEntity.Schema, VirtualSchedulerScenarioCaseEntity.Node);

type ScenarioCase = VirtualSchedulerScenarioCaseEntity.Type;
type HeapTaskDescriptor = VirtualSchedulerScenarioCaseEntity.HeapTaskDescriptor;
type HeapTaskVariant = HeapTaskDescriptor['variant'];

function requiredAuditNumber(value: number | undefined): number {
  if (value === undefined) {
    throw RuntimeError.create('Expected a numeric audit field');
  }
  return value;
}

class FireRecord {
  public count = 0;

  public record(): void {
    this.count++;
  }
}

type MutableHeapTask = {
  atMs: number;
  fire: () => void;
  id: string;
  intervalMs: number;
  variant: HeapTaskVariant;
};

const heapTaskFireDispatch = {
  noop: (): (() => void) => {
    return (): void => { return; };
  }
} satisfies Record<HeapTaskDescriptor['fire'], () => () => void>;
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

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;
type RunnerMap = Record<ScenarioCase['shape'], ScenarioRunner>;

const runnerMap: RunnerMap = {
  'virtual-timecounter': (scenarioCase): void => {
    if (scenarioCase.shape !== 'virtual-timecounter') { throw RuntimeError.create('unreachable: expected virtual-timecounter shape'); }
    const { expected, input } = scenarioCase;
    const { scheduler } = input;
    for (const { start, advances, expectedNowMs } of scheduler.counterAdvanceScenarios) {
      const counter = VirtualTimeCounter.create({ startMs: start });
      for (const delta of advances) {
        counter.advance(delta);
      }
      assert.strictEqual(counter.nowMs(), expectedNowMs);
    }

    for (const { advance, start, expectedNowMs } of scheduler.edgeCases) {
      const counter = VirtualTimeCounter.create({ startMs: start });
      counter.advance(advance);
      assert.strictEqual(counter.nowMs(), expectedNowMs);
    }

    assert.throws(() => {
      VirtualTimeCounter.create({ startMs: scheduler.negativeStartMs });
    });

    const counter = VirtualTimeCounter.create({ startMs: scheduler.finalCounterStartMs });
    for (const delta of scheduler.finalCounterAdvances) {
      counter.advance(delta);
    }
    assert.strictEqual(counter.nowMs(), expected.finalNowMs);
    return;
  },

  'invalid-constructor': (): void => {
    assert.throws(() => {
      // penitence: as-never — deliberately invalid runtime value exercising VirtualScheduler's
      // constructor guard; TypeScript has no assertion-free way to defeat structural typing here.
      VirtualScheduler.create({ counter: null as never });
    });
    assert.throws(() => {
      VirtualScheduler.create({ counter: {} as never });
    });
    return;
  },

  'invalid-interval': (scenarioCase): void => {
    if (scenarioCase.shape !== 'invalid-interval') { throw RuntimeError.create('unreachable: expected invalid-interval shape'); }
    const { scheduler } = scenarioCase.input;
    const sched = createScheduler(scheduler.startMs);
    for (const intervalMs of scheduler.invalidIntervals) {
      assert.throws(() => {
        sched.scheduleEvery(intervalMs, () => { return; });
      });
    }
    return;
  },

  'minimum-heap': (scenarioCase): void => {
    if (scenarioCase.shape !== 'minimum-heap') { throw RuntimeError.create('unreachable: expected minimum-heap shape'); }
    const { expected, input } = scenarioCase;
    const [firstDescriptor, secondDescriptor] = input.scheduler.tasks;
    const first = materializeHeapTask(firstDescriptor);
    const second = materializeHeapTask(secondDescriptor);
    const heap = MinimumHeap.create();

    heap.insert(first);
    heap.insert(second);
    applyHeapTaskMutation(first, firstDescriptor.mutation);
    applyHeapTaskMutation(second, secondDescriptor.mutation);

    assert.strictEqual(heap.peekAtMs(), expected.peekAtMs);
    assert.deepStrictEqual(heap.removeMinimum(), {
      atMs: expected.removedMinimum.atMs,
      fire: first.fire,
      id: expected.removedMinimum.id,
      intervalMs: expected.removedMinimum.intervalMs,
      variant: expected.removedMinimum.variant
    });
    assert.strictEqual(heap.peekAtMs(), expected.secondPeekAtMs);
    return;
  },

  'minimum-heap-drain-order': (scenarioCase): void => {
    if (scenarioCase.shape !== 'minimum-heap-drain-order') { throw RuntimeError.create('unreachable: expected minimum-heap-drain-order shape'); }
    const { expected, input } = scenarioCase;
    const heap = MinimumHeap.create();

    for (const task of input.scheduler.tasks) {
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

    assert.deepStrictEqual(drainedAtMs, expected.drainedAtMs);
    assert.deepStrictEqual(drainedIds, expected.drainedIds);
    assert.strictEqual(heap.peekAtMs() === undefined, expected.empty);
    assert.strictEqual(heap.removeMinimum(), undefined);
    return;
  },

  scheduleAt: (scenarioCase): void => {
    if (scenarioCase.shape !== 'scheduleAt') { throw RuntimeError.create('unreachable: expected scheduleAt shape'); }
    const { expected, input } = scenarioCase;
    const scheduleAtExpected = expected;

    for (const run of input.scheduler.runs) {
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

  scheduleEvery: (scenarioCase): void => {
    if (scenarioCase.shape !== 'scheduleEvery') { throw RuntimeError.create('unreachable: expected scheduleEvery shape'); }
    const { expected, input } = scenarioCase;

    for (const run of input.scheduler.runs) {
      const sched = createScheduler(run.counterStartMs);
      let fireCount = 0;
      sched.scheduleEvery(run.intervalMs, () => {
        fireCount++;
      });
      sched.advance(run.advanceMs);
      assert.strictEqual(fireCount, expected[run.expectedKey]);
    }
    return;
  },

  'cancelAll-runAll': (scenarioCase): void => {
    if (scenarioCase.shape !== 'cancelAll-runAll') { throw RuntimeError.create('unreachable: expected cancelAll-runAll shape'); }
    const { expected, input } = scenarioCase;
    const { batch, scheduler } = input;
    const cancelSched = createScheduler(scheduler.cancelAll.counterStartMs);
    const rec = new FireRecord();
    for (let index = 0; index < batch.cancelAllTaskCount; index++) {
      cancelSched.scheduleAt(scheduler.cancelAll.atMs, () => {
        rec.record();
      });
    }
    cancelSched.cancelAll();
    cancelSched.advance(scheduler.cancelAll.advanceMs);
    assert.strictEqual(rec.count, expected.cancelAllFireCount);

    const runAllSched = createScheduler(scheduler.runAll.counterStartMs);
    const runAllRec = new FireRecord();
    for (let index = 0; index < batch.runAllTaskCount; index++) {
      runAllSched.scheduleAt((index + 1) * scheduler.runAll.taskStepMs, () => {
        runAllRec.record();
      });
    }
    runAllSched.runAll();
    assert.strictEqual(runAllRec.count, expected.runAllFireCount);
    return;
  },

  'edge-cases': (scenarioCase): void => {
    if (scenarioCase.shape !== 'edge-cases') { throw RuntimeError.create('unreachable: expected edge-cases shape'); }
    const { expected, input } = scenarioCase;
    const { batch } = input;
    const edgeInput = input.scheduler;
    const edgeExpected = expected;
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
    for (let index = 0; index < batch.skipCount; index++) {
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

  'unhappy-path': async (scenarioCase): Promise<void> => {
    if (scenarioCase.shape !== 'unhappy-path') { throw RuntimeError.create('unreachable: expected unhappy-path shape'); }
    const { expected, input } = scenarioCase;
    const unhappyInput = input.scheduler;
    const unhappyExpected = expected;
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
      throw RuntimeError.create('runUntil-reject');
    });
    runUntilSched.advance(unhappyInput.runUntilAdvanceMs);
    await Promise.resolve();
    await Promise.resolve();

    const runAllCounter = createCounter(unhappyInput.runAllCounterStartMs);
    const runAllSched = VirtualScheduler.create({ counter: runAllCounter });
    runAllSched.scheduleAt(unhappyInput.runAllRejectAtMs, async () => {
      await Promise.resolve();
      throw RuntimeError.create('runAll-reject');
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

  'virtual-fire-error-loop': async (scenarioCase): Promise<void> => {
    if (scenarioCase.shape !== 'virtual-fire-error-loop') { throw RuntimeError.create('unreachable: expected virtual-fire-error-loop shape'); }
    const fireErrorExpected = scenarioCase.expected;
    const fireErrorInput = scenarioCase.input.scheduler;

    class ErrorHookScheduler extends VirtualScheduler {
      public errors: Error[] = [];
      public fireCount = 0;

      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
      }

      protected override onFire(_id: string): void {
        this.fireCount++;
      }

      protected override onFireError(_id: string, error: Error): void {
        this.errors.push(error);
      }
    }

    const runUntilSyncError = RuntimeError.create('runUntil sync fire failure');
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

    const runUntilAsyncError = RuntimeError.create('runUntil async fire failure');
    const runUntilAsync = new ErrorHookScheduler(createCounter(fireErrorInput.counterStartMs));
    runUntilAsync.scheduleAt(fireErrorInput.atMs, () => Promise.reject(runUntilAsyncError));
    runUntilAsync.runUntil(fireErrorInput.atMs);
    await Promise.resolve();
    await Promise.resolve();
    assert.deepStrictEqual(runUntilAsync.errors, [runUntilAsyncError]);

    const runAllSyncError = RuntimeError.create('runAll sync fire failure');
    const runAllSync = new ErrorHookScheduler(createCounter(fireErrorInput.counterStartMs));
    runAllSync.scheduleAt(fireErrorInput.atMs, () => {
      throw runAllSyncError;
    });
    runAllSync.runAll();
    assert.deepStrictEqual(runAllSync.errors, [runAllSyncError]);

    const runAllAsyncError = RuntimeError.create('runAll async fire failure');
    const runAllAsync = new ErrorHookScheduler(createCounter(fireErrorInput.counterStartMs));
    runAllAsync.scheduleAt(fireErrorInput.atMs, () => Promise.reject(runAllAsyncError));
    runAllAsync.runAll();
    await Promise.resolve();
    await Promise.resolve();
    assert.deepStrictEqual(runAllAsync.errors, [runAllAsyncError]);
    assert.strictEqual(fireErrorExpected.errorsPerScheduler, 1);
    return;
  },

  'subclass-seams': async (scenarioCase): Promise<void> => {
    if (scenarioCase.shape !== 'subclass-seams') { throw RuntimeError.create('unreachable: expected subclass-seams shape'); }
    const { expected, input } = scenarioCase;
    const { batch } = input;
    class AuditVirtualScheduler extends VirtualScheduler {
      public scheduleCount = 0;
      public fireCount = 0;
      public cancelCount = 0;
      public cancelAllCount = 0;
      public advanceCount = 0;

      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
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

    const subclassInput = input.scheduler;
    const subclassExpected = expected;
    type AuditScenarioDescriptor = (typeof subclassInput)['auditScenarios'][number];
    type AuditActionName = AuditScenarioDescriptor['action'];
    type AuditCountKey = AuditScenarioDescriptor['expectedKey'];
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
    for (let index = 0; index < batch.repeatCancelCount; index++) {
      repeatTask.cancel();
    }
    repeatSched.advance(subclassInput.advanceMs);
    assert.strictEqual(repeatSched.cancelCount, subclassExpected.cancelRepeatCount);
    assert.strictEqual(repeatSched.fireCount, subclassExpected.cancelRepeatFireCount);

    const cancelAfterFireCounter = createCounter(subclassInput.counterStartMs);
    const cancelAfterFireSched = new AuditVirtualScheduler(cancelAfterFireCounter);
    const cancelAfterFireTask = cancelAfterFireSched.scheduleAt(subclassInput.cancelAfterFireAtMs, () => { return; });
    cancelAfterFireSched.advance(subclassInput.advanceMs);
    for (let index = 0; index < batch.repeatCancelCount; index++) {
      cancelAfterFireTask.cancel();
    }
    assert.strictEqual(cancelAfterFireSched.fireCount, subclassExpected.cancelAfterFireFireCount);
    assert.strictEqual(cancelAfterFireSched.cancelCount, subclassExpected.cancelAfterFireCancelCount);

    class CounterAccessor extends VirtualScheduler {
      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
      }

      public getCounter(): Readonly<VirtualTimeCounter> {
        return this.virtualCounter;
      }
    }
    const counter = createCounter(subclassInput.counterStartMs);
    const accessor = new CounterAccessor(counter);
    assert.strictEqual(accessor.getCounter().nowMs(), subclassExpected.counterAccessorNowMs);

    class CancelChecker extends VirtualScheduler {
      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
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
      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
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
      public fireErrorValues: Error[] = [];
      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
      }

      protected override onFireError(id: string, error: Error): void {
        this.fireErrorIds.push(id);
        this.fireErrorValues.push(error);
      }
    }
    const errorCounter = createCounter(subclassInput.counterStartMs);
    const errorSched = new ErrorHookScheduler(errorCounter);
    const thrownError = RuntimeError.create('task boom');
    errorSched.scheduleAt(subclassInput.fireErrorAtMs, () => { throw thrownError; });
    errorSched.runAll();
    assert.strictEqual(errorSched.fireErrorIds.length, subclassExpected.fireErrorCount);
    assert.strictEqual(errorSched.fireErrorValues[0], thrownError);

    const advanceErrorCounter = createCounter(subclassInput.counterStartMs);
    const advanceErrorSched = new ErrorHookScheduler(advanceErrorCounter);
    advanceErrorSched.scheduleAt(subclassInput.fireErrorAtMs, () => { throw RuntimeError.create('sync throw'); });
    advanceErrorSched.advance(subclassInput.advanceMs);
    assert.strictEqual(advanceErrorSched.fireErrorIds.length, subclassExpected.fireErrorCount);

    class AsyncErrorHookScheduler extends VirtualScheduler {
      public asyncErrorCount = 0;
      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
      }

      protected override onFireError(_id: string, _error: Error): void {
        this.asyncErrorCount++;
      }
    }
    const asyncCounter = createCounter(subclassInput.counterStartMs);
    const asyncSched = new AsyncErrorHookScheduler(asyncCounter);
    asyncSched.scheduleAt(subclassInput.fireRejectAtMs, async () => { throw RuntimeError.create('async reject'); });
    asyncSched.runAll();
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(asyncSched.asyncErrorCount, subclassExpected.asyncErrorCount);

    class RescheduleHookScheduler extends VirtualScheduler {
      public rescheduleIds: string[] = [];
      public rescheduleAtMs: number[] = [];
      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
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
      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
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
      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
      }

      protected override onSchedule(): void {
        throw RuntimeError.create('onSchedule boom');
      }
    }
    const throwingScheduleCounter = createCounter(subclassInput.counterStartMs);
    const throwingSchedule = new ThrowingScheduleScheduler(throwingScheduleCounter);
    assert.strictEqual(throwingSchedule.scheduleAt(subclassInput.scheduleAtMs, () => { return; }).id.length > 0, subclassExpected.throwingScheduleIdNonEmpty);

    class ThrowingFireScheduler extends VirtualScheduler {
      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
      }

      protected override onFire(): void {
        throw RuntimeError.create('onFire boom');
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
      protected override onHookError(hookName: string, cause: Error): void {
        receivedError = new HookInvocationError(hookName, cause);
      }
    }
    class ObservedThrowingFireScheduler extends VirtualScheduler {
      protected override readonly hooks: HookInvoker = new RecordingHookInvoker();

      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
      }

      protected override onFire(): void {
        throw RuntimeError.create('onFire boom');
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
      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
      }

      protected override onReschedule(): void {
        throw RuntimeError.create('onReschedule boom');
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

      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
      }

      protected override onFireError(): void {
        this.fireErrorCount++;
        throw RuntimeError.create('onFireError boom');
      }
    }
    const throwingFireErrorCounter = createCounter(subclassInput.counterStartMs);
    const throwingFireError = new ThrowingFireErrorScheduler(throwingFireErrorCounter);
    throwingFireError.scheduleAt(subclassInput.fireErrorAtMs, () => { throw RuntimeError.create('task boom'); });
    throwingFireError.runAll();
    assert.strictEqual(throwingFireError.fireErrorCount, subclassExpected.throwingFireErrorCount);

    const recordedHookNames: string[] = [];
    const recordedCauses: Error[] = [];
    class RecordingSwallowingInvoker extends HookInvoker {
      protected override onHookError(hookName: string, cause: Error): void {
        recordedHookNames.push(hookName);
        recordedCauses.push(cause);
      }
    }
    const rejectionError = RuntimeError.create('async onFire rejection');
    class AsyncRejectingFireScheduler extends VirtualScheduler {
      protected override readonly hooks: HookInvoker = new RecordingSwallowingInvoker();

      public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
        super(injectedCounter);
      }

      protected override async onFire(_id: string): Promise<void> {
        await Promise.resolve();
        throw rejectionError;
      }
    }
    let rejectionEvents = 0;
    const onUnhandledRejection = (): void => {
      rejectionEvents++;
    };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const asyncFireCounter = createCounter(subclassInput.counterStartMs);
      const asyncFire = new AsyncRejectingFireScheduler(asyncFireCounter);
      asyncFire.scheduleAt(subclassInput.scheduleAtMs, () => { return; });
      asyncFire.runAll();
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(rejectionEvents, subclassExpected.rejectionEventsLength);
      assert.deepStrictEqual(recordedHookNames, subclassExpected.recordedHookNames);
      assert.strictEqual(recordedCauses[0], rejectionError);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
    return;
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('VirtualScheduler', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }

  void it('forwards cross-realm task errors to onFireError', () => {
    class CrossRealmErrorScheduler extends VirtualScheduler {
      public readonly errors: Error[] = [];

      public constructor(counter: Readonly<VirtualTimeCounter>) {
        super(counter);
      }

      protected override onFireError(_id: string, error: Error): void {
        this.errors.push(error);
      }
    }

    const error = runInNewContext('new Error("foreign worker failure")');
    const scheduler = new CrossRealmErrorScheduler(createCounter(0));
    scheduler.scheduleAt(0, (): void => { throw error; });
    scheduler.runAll();

    assert.strictEqual(scheduler.errors[0], error);
  });
});
