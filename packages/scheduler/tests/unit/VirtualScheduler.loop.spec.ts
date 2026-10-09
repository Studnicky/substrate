import { VirtualTimeCounterEntity } from '@studnicky/clock/entities';
import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock/node';
import { HookInvocationError, HookInvoker, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { runInNewContext } from 'node:vm';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { HeapTaskDescriptorEntity } from './entities/HeapTaskDescriptorEntity.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { MinimumHeap } from '../../src/scheduler/MinimumHeap.js';
import { VirtualScheduler } from '../../src/scheduler/VirtualScheduler.js';
import { VirtualSchedulerScenarioCaseEntity } from './entities/VirtualSchedulerScenarioCaseEntity.js';
import scenarioGroups from './VirtualScheduler.scenarios.json' with { 'type': 'json' };

class FixedNowCounter {
  readonly #nowMs: number;

  public constructor(nowMs: number) {
    this.#nowMs = nowMs;
  }

  public advance(_delta: number): void {}

  public nowMs(): number {
    return this.#nowMs;
  }
}

class ForeignThrower {
  static rethrow(value: unknown): void {
    const source = ForeignThrower.suspended();
    source.next();
    source.throw(value);
  }

  private static *suspended(): Generator<number> {
    yield 1;
  }
}

class FireRecord {
  public count = 0;

  public record(): void {
    this.count++;
  }
}

interface MutableHeapTaskInterface {
  'atMs': number;
  'fire': () => void;
  'id': string;
  'intervalMs': number;
  'variant': HeapTaskDescriptorEntity.Type['variant'];
}

class AuditVirtualScheduler extends VirtualScheduler {
  public scheduleCount = 0;
  public fireCount = 0;
  public cancelCount = 0;
  public cancelAllCount = 0;
  public advanceCount = 0;

  public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
    super(injectedCounter);
  }

  public count(key: 'advanceCount' | 'cancelAllCount' | 'cancelCount' | 'fireCount' | 'scheduleCount'): number {
    let total = this.scheduleCount;
    if (key === 'advanceCount') { total = this.advanceCount; }
    if (key === 'cancelAllCount') { total = this.cancelAllCount; }
    if (key === 'cancelCount') { total = this.cancelCount; }
    if (key === 'fireCount') { total = this.fireCount; }
    return total;
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

class CounterAccessor extends VirtualScheduler {
  public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
    super(injectedCounter);
  }

  public getCounter(): Readonly<VirtualTimeCounter> {
    return this.virtualCounter;
  }
}

class CancelChecker extends VirtualScheduler {
  public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
    super(injectedCounter);
  }

  public checkCancelled(id: string): boolean {
    const result = this.isCancelled(id);
    return result;
  }
}

class SpyHeapScheduler extends VirtualScheduler {
  public static heapCreatedCount = 0;

  public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
    super(injectedCounter);
  }

  protected override createHeap(): MinimumHeap {
    SpyHeapScheduler.heapCreatedCount++;
    const result = MinimumHeap.create();
    return result;
  }
}

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

class AsyncErrorHookScheduler extends VirtualScheduler {
  public asyncErrorCount = 0;
  public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
    super(injectedCounter);
  }

  protected override onFireError(_id: string, _error: Error): void {
    this.asyncErrorCount++;
  }
}

class FireCountingErrorScheduler extends VirtualScheduler {
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

class IdleHookScheduler extends VirtualScheduler {
  public idleCount = 0;
  public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
    super(injectedCounter);
  }

  protected override onIdle(): void {
    this.idleCount++;
  }
}

class ThrowingScheduleScheduler extends VirtualScheduler {
  public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
    super(injectedCounter);
  }

  protected override onSchedule(): void {
    throw RuntimeError.create('onSchedule boom');
  }
}

class ThrowingFireScheduler extends VirtualScheduler {
  public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
    super(injectedCounter);
  }

  protected override onFire(): void {
    throw RuntimeError.create('onFire boom');
  }
}

class RecordingHookInvoker extends HookInvoker {
  public receivedError: HookInvocationError | undefined;

  protected override onHookError(hookName: string, cause: Error): void {
    this.receivedError = new HookInvocationError(hookName, cause);
  }
}

class ObservedThrowingFireScheduler extends VirtualScheduler {
  protected override readonly hooks: HookInvoker;

  public constructor(injectedCounter: Readonly<VirtualTimeCounter>, hooks: HookInvoker) {
    super(injectedCounter);
    this.hooks = hooks;
  }

  protected override onFire(): void {
    throw RuntimeError.create('onFire boom');
  }
}

class ThrowingRescheduleScheduler extends VirtualScheduler {
  public constructor(injectedCounter: Readonly<VirtualTimeCounter>) {
    super(injectedCounter);
  }

  protected override onReschedule(): void {
    throw RuntimeError.create('onReschedule boom');
  }
}

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

class RecordingSwallowingInvoker extends HookInvoker {
  public readonly recordedHookNames: string[] = [];
  public readonly recordedCauses: Error[] = [];

  protected override onHookError(hookName: string, cause: Error): void {
    this.recordedHookNames.push(hookName);
    this.recordedCauses.push(cause);
  }
}

class AsyncRejectingFireScheduler extends VirtualScheduler {
  protected override readonly hooks: HookInvoker;

  private constructor(injectedCounter: Readonly<VirtualTimeCounter>, hooks: HookInvoker, rejectionError: RuntimeError) {
    super(injectedCounter);
    this.hooks = hooks;
    this.#rejectionError = rejectionError;
  }

  readonly #rejectionError: RuntimeError;

  public static make(injectedCounter: Readonly<VirtualTimeCounter>, hooks: HookInvoker, rejectionError: RuntimeError): AsyncRejectingFireScheduler {
    return new AsyncRejectingFireScheduler(injectedCounter, hooks, rejectionError);
  }

  protected override async onFire(): Promise<void> {
    await Promise.resolve();
    throw this.#rejectionError;
  }
}

class VirtualSchedulerRunners {
  static 'cancelAll-runAll'(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'cancelAll-runAll'>): void {
    const { expected, input } = scenarioCase;
    const { batch, scheduler } = input;
    const cancelSched = VirtualSchedulerRunners.createScheduler(scheduler.cancelAll.counterStartMs);
    const rec = new FireRecord();
    for (let index = 0; index < batch.cancelAllTaskCount; index++) {
      cancelSched.scheduleAt(scheduler.cancelAll.atMs, () => {
        rec.record();
      });
    }
    cancelSched.cancelAll();
    cancelSched.advance(scheduler.cancelAll.advanceMs);
    assert.strictEqual(rec.count, expected.cancelAllFireCount);

    const runAllSched = VirtualSchedulerRunners.createScheduler(scheduler.runAll.counterStartMs);
    const runAllRec = new FireRecord();
    for (let index = 0; index < batch.runAllTaskCount; index++) {
      runAllSched.scheduleAt((index + 1) * scheduler.runAll.taskStepMs, () => {
        runAllRec.record();
      });
    }
    runAllSched.runAll();
    assert.strictEqual(runAllRec.count, expected.runAllFireCount);
  }

  static 'edge-cases'(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'edge-cases'>): void {
    const { expected, input } = scenarioCase;
    const { batch } = input;
    const edgeInput = input.scheduler;
    const edgeExpected = expected;
    const sched = VirtualSchedulerRunners.createScheduler(edgeInput.counterStartMs);
    let fired = false;
    const task = sched.scheduleAt(edgeInput.cancelledAtMs, () => {
      fired = true;
    });
    task.cancel();
    sched.advance(edgeInput.cancelledAdvanceMs);
    assert.strictEqual(fired, edgeExpected.cancelledFired);
    assert.strictEqual(task.atMs, edgeExpected.cancelledTaskAtMs);
    assert.ok(task.id.length > 0);

    const emptySched = VirtualSchedulerRunners.createScheduler(edgeInput.counterStartMs);
    emptySched.cancelAll();
    emptySched.advance(edgeInput.emptyAdvanceMs);

    const skipSched = VirtualSchedulerRunners.createScheduler(edgeInput.counterStartMs);
    const rec = new FireRecord();
    const tasks: { readonly 'cancel': () => void }[] = [];
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

    const runAllEmpty = VirtualSchedulerRunners.createScheduler(edgeInput.counterStartMs);
    const emptyRecord = new FireRecord();
    runAllEmpty.runAll();
    assert.strictEqual(emptyRecord.count, edgeExpected.emptyRecordCount);

    const runUntilSched = VirtualSchedulerRunners.createScheduler(edgeInput.counterStartMs);
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

    const intervalSched = VirtualSchedulerRunners.createScheduler(edgeInput.counterStartMs);
    let count = 0;
    intervalSched.scheduleEvery(edgeInput.intervalMs, () => {
      count++;
    });
    intervalSched.advance(edgeInput.intervalAdvanceMs);
    assert.strictEqual(count, edgeExpected.intervalCount);

    const zeroSched = VirtualSchedulerRunners.createScheduler(edgeInput.counterStartMs);
    let invalidIntervalErrorCount = 0;
    for (const intervalMs of edgeInput.invalidIntervals) {
      assert.throws(() => {
        zeroSched.scheduleEvery(intervalMs, () => { return; });
      });
      invalidIntervalErrorCount++;
    }
    assert.strictEqual(invalidIntervalErrorCount, edgeExpected.invalidIntervalErrorCount);

    const cancelledIntervalSched = VirtualSchedulerRunners.createScheduler(edgeInput.counterStartMs);
    let intervalCount = 0;
    const intervalTask = cancelledIntervalSched.scheduleEvery(edgeInput.intervalMs, () => {
      intervalCount++;
    });
    cancelledIntervalSched.advance(edgeInput.cancelledIntervalFirstAdvanceMs);
    intervalTask.cancel();
    cancelledIntervalSched.advance(edgeInput.cancelledIntervalSecondAdvanceMs);
    assert.strictEqual(intervalCount, edgeExpected.cancelledIntervalCount);
  }

  static 'invalid-constructor'(_scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'invalid-constructor'>): void {
    assert.strictEqual(VirtualTimeCounterEntity.validate({}), false);
  }

  static 'invalid-interval'(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'invalid-interval'>): void {
    const { scheduler } = scenarioCase.input;
    const sched = VirtualSchedulerRunners.createScheduler(scheduler.startMs);
    for (const intervalMs of scheduler.invalidIntervals) {
      assert.throws(() => {
        sched.scheduleEvery(intervalMs, () => { return; });
      });
    }
  }

  static 'minimum-heap'(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'minimum-heap'>): void {
    const { expected, input } = scenarioCase;
    const [firstDescriptor, secondDescriptor] = input.scheduler.tasks;
    const first = VirtualSchedulerRunners.materializeHeapTask(firstDescriptor);
    const second = VirtualSchedulerRunners.materializeHeapTask(secondDescriptor);
    const heap = MinimumHeap.create();

    heap.insert(first);
    heap.insert(second);
    VirtualSchedulerRunners.applyHeapTaskMutation(first, firstDescriptor.mutation);
    VirtualSchedulerRunners.applyHeapTaskMutation(second, secondDescriptor.mutation);

    assert.strictEqual(heap.peekAtMs(), expected.peekAtMs);
    assert.deepStrictEqual(heap.removeMinimum(), {
      'atMs': expected.removedMinimum.atMs,
      'fire': first.fire,
      'id': expected.removedMinimum.id,
      'intervalMs': expected.removedMinimum.intervalMs,
      'variant': expected.removedMinimum.variant
    });
    assert.strictEqual(heap.peekAtMs(), expected.secondPeekAtMs);
  }

  static 'minimum-heap-drain-order'(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'minimum-heap-drain-order'>): void {
    const { expected, input } = scenarioCase;
    const heap = MinimumHeap.create();

    for (const task of input.scheduler.tasks) {
      heap.insert(VirtualSchedulerRunners.materializeHeapTask(task));
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
  }

  static 'scheduleAt'(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'scheduleAt'>): void {
    const { expected, input } = scenarioCase;
    const scheduleAtExpected = expected;

    for (const run of input.scheduler.runs) {
      const sched = VirtualSchedulerRunners.createScheduler(run.counterStartMs);
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
  }

  static 'scheduleEvery'(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'scheduleEvery'>): void {
    const { expected, input } = scenarioCase;

    for (const run of input.scheduler.runs) {
      const sched = VirtualSchedulerRunners.createScheduler(run.counterStartMs);
      let fireCount = 0;
      sched.scheduleEvery(run.intervalMs, () => {
        fireCount++;
      });
      sched.advance(run.advanceMs);
      assert.strictEqual(fireCount, expected[run.expectedKey]);
    }
  }

  static async 'subclass-seams'(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'subclass-seams'>): Promise<void> {
    VirtualSchedulerRunners.verifyAuditSeams(scenarioCase);
    VirtualSchedulerRunners.verifyAccessorSeams(scenarioCase);
    await VirtualSchedulerRunners.verifyErrorSeams(scenarioCase);
    VirtualSchedulerRunners.verifyIdleAndRescheduleSeams(scenarioCase);
    VirtualSchedulerRunners.verifyThrowingHookSeams(scenarioCase);
    await VirtualSchedulerRunners.verifyAsyncRejectionSeam(scenarioCase);
  }

  static async 'unhappy-path'(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'unhappy-path'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const unhappyInput = input.scheduler;
    const unhappyExpected = expected;
    const cancelledSched = VirtualSchedulerRunners.createScheduler(unhappyInput.cancelledCounterStartMs);
    let fired = false;
    const task = cancelledSched.scheduleAt(unhappyInput.cancelAtMs, () => {
      fired = true;
    });
    task.cancel();
    cancelledSched.runAll();
    assert.strictEqual(fired, unhappyExpected.cancelledFired);

    const advanceCounter = VirtualSchedulerRunners.createCounter(unhappyInput.advanceCounterStartMs);
    const advanceSched = VirtualScheduler.create({ 'counter': advanceCounter });
    let advanceFired = false;
    advanceSched.scheduleAt(unhappyInput.advanceFiredAtMs, () => {
      advanceFired = true;
    });
    for (const deltaMs of unhappyInput.advanceDeltas) {
      advanceSched.advance(deltaMs);
    }
    assert.strictEqual(advanceFired, unhappyExpected.advanceFired);
    assert.strictEqual(advanceCounter.nowMs(), unhappyExpected.advanceCounterNowMs);

    const runUntilCounter = VirtualSchedulerRunners.createCounter(unhappyInput.runUntilCounterStartMs);
    const runUntilSched = VirtualScheduler.create({ 'counter': runUntilCounter });
    runUntilSched.scheduleAt(unhappyInput.runUntilRejectAtMs, async () => {
      await Promise.resolve();
      throw RuntimeError.create('runUntil-reject');
    });
    runUntilSched.advance(unhappyInput.runUntilAdvanceMs);
    await Promise.resolve();
    await Promise.resolve();

    const runAllCounter = VirtualSchedulerRunners.createCounter(unhappyInput.runAllCounterStartMs);
    const runAllSched = VirtualScheduler.create({ 'counter': runAllCounter });
    runAllSched.scheduleAt(unhappyInput.runAllRejectAtMs, async () => {
      await Promise.resolve();
      throw RuntimeError.create('runAll-reject');
    });
    runAllSched.runAll();
    await Promise.resolve();
    await Promise.resolve();

    const provider = VirtualClockProvider.create(new FixedNowCounter(unhappyInput.providerNowMs));
    assert.strictEqual(provider.now(), unhappyExpected.providerNowMs);
  }

  static async 'virtual-fire-error-loop'(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'virtual-fire-error-loop'>): Promise<void> {
    const fireErrorExpected = scenarioCase.expected;
    const fireErrorInput = scenarioCase.input.scheduler;

    const runUntilSyncError = RuntimeError.create('runUntil sync fire failure');
    const runUntilSyncCounter = VirtualSchedulerRunners.createCounter(fireErrorInput.counterStartMs);
    const runUntilSync = new FireCountingErrorScheduler(runUntilSyncCounter);
    runUntilSync.scheduleEvery(fireErrorInput.intervalMs, () => {
      throw runUntilSyncError;
    });
    for (const deltaMs of fireErrorInput.intervalAdvanceDeltas) {
      runUntilSync.advance(deltaMs);
    }
    assert.deepStrictEqual(runUntilSync.errors, [runUntilSyncError]);
    assert.strictEqual(runUntilSync.fireCount, fireErrorExpected.firedAfterIntervalFailure);

    const runUntilAsyncError = RuntimeError.create('runUntil async fire failure');
    const runUntilAsync = new FireCountingErrorScheduler(VirtualSchedulerRunners.createCounter(fireErrorInput.counterStartMs));
    runUntilAsync.scheduleAt(fireErrorInput.atMs, () => {
      const result = Promise.reject(runUntilAsyncError);
      return result;
    });
    runUntilAsync.runUntil(fireErrorInput.atMs);
    await Promise.resolve();
    await Promise.resolve();
    assert.deepStrictEqual(runUntilAsync.errors, [runUntilAsyncError]);

    const runAllSyncError = RuntimeError.create('runAll sync fire failure');
    const runAllSync = new FireCountingErrorScheduler(VirtualSchedulerRunners.createCounter(fireErrorInput.counterStartMs));
    runAllSync.scheduleAt(fireErrorInput.atMs, () => {
      throw runAllSyncError;
    });
    runAllSync.runAll();
    assert.deepStrictEqual(runAllSync.errors, [runAllSyncError]);

    const runAllAsyncError = RuntimeError.create('runAll async fire failure');
    const runAllAsync = new FireCountingErrorScheduler(VirtualSchedulerRunners.createCounter(fireErrorInput.counterStartMs));
    runAllAsync.scheduleAt(fireErrorInput.atMs, () => {
      const result = Promise.reject(runAllAsyncError);
      return result;
    });
    runAllAsync.runAll();
    await Promise.resolve();
    await Promise.resolve();
    assert.deepStrictEqual(runAllAsync.errors, [runAllAsyncError]);
    assert.strictEqual(fireErrorExpected.errorsPerScheduler, 1);
  }

  static 'virtual-timecounter'(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'virtual-timecounter'>): void {
    const { expected, input } = scenarioCase;
    const { scheduler } = input;
    for (const { advances, expectedNowMs, start } of scheduler.counterAdvanceScenarios) {
      const counter = VirtualTimeCounter.create({ 'startMs': start });
      for (const delta of advances) {
        counter.advance(delta);
      }
      assert.strictEqual(counter.nowMs(), expectedNowMs);
    }

    for (const { advance, expectedNowMs, start } of scheduler.edgeCases) {
      const counter = VirtualTimeCounter.create({ 'startMs': start });
      counter.advance(advance);
      assert.strictEqual(counter.nowMs(), expectedNowMs);
    }

    assert.throws(() => {
      VirtualTimeCounter.create({ 'startMs': scheduler.negativeStartMs });
    });

    const counter = VirtualTimeCounter.create({ 'startMs': scheduler.finalCounterStartMs });
    for (const delta of scheduler.finalCounterAdvances) {
      counter.advance(delta);
    }
    assert.strictEqual(counter.nowMs(), expected.finalNowMs);
  }

  static declaresExtraTests(): void {
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

      const error: unknown = runInNewContext('new Error("foreign worker failure")');
      const scheduler = new CrossRealmErrorScheduler(VirtualSchedulerRunners.createCounter(0));
      scheduler.scheduleAt(0, (): void => { ForeignThrower.rethrow(error); });
      scheduler.runAll();

      assert.strictEqual(scheduler.errors[0], error);
    });
  }

  private static verifyAuditSeams(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'subclass-seams'>): void {
    const { expected, input } = scenarioCase;
    const { batch } = input;
    const subclassInput = input.scheduler;
    const auditScenarios = subclassInput.auditScenarios;
    for (let index = 0; index < auditScenarios.length; index += 1) {
      const scenario = auditScenarios[index];
      assert.ok(scenario !== undefined);
      const sched = new AuditVirtualScheduler(VirtualSchedulerRunners.createCounter(scenario.counterStartMs));
      VirtualSchedulerRunners.performAuditAction(sched, scenario);
      assert.strictEqual(sched.count(scenario.expectedKey), expected[scenario.expectedKey]);
    }

    const repeatSched = new AuditVirtualScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    const repeatTask = repeatSched.scheduleAt(subclassInput.cancelAtMs, () => { return; });
    for (let index = 0; index < batch.repeatCancelCount; index++) {
      repeatTask.cancel();
    }
    repeatSched.advance(subclassInput.advanceMs);
    assert.strictEqual(repeatSched.cancelCount, expected.cancelRepeatCount);
    assert.strictEqual(repeatSched.fireCount, expected.cancelRepeatFireCount);

    const cancelAfterFireSched = new AuditVirtualScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    const cancelAfterFireTask = cancelAfterFireSched.scheduleAt(subclassInput.cancelAfterFireAtMs, () => { return; });
    cancelAfterFireSched.advance(subclassInput.advanceMs);
    for (let index = 0; index < batch.repeatCancelCount; index++) {
      cancelAfterFireTask.cancel();
    }
    assert.strictEqual(cancelAfterFireSched.fireCount, expected.cancelAfterFireFireCount);
    assert.strictEqual(cancelAfterFireSched.cancelCount, expected.cancelAfterFireCancelCount);
  }

  private static performAuditAction(
    sched: AuditVirtualScheduler,
    scenario: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'subclass-seams'>['input']['scheduler']['auditScenarios'][number]
  ): void {
    if (scenario.action === 'advance') {
      sched.advance(VirtualSchedulerRunners.requiredAuditNumber(scenario.advanceMs));
    }
    if (scenario.action === 'schedule') {
      sched.scheduleAt(VirtualSchedulerRunners.requiredAuditNumber(scenario.atMs), () => { return; });
    }
    if (scenario.action === 'schedule-and-advance') {
      sched.scheduleAt(VirtualSchedulerRunners.requiredAuditNumber(scenario.atMs), () => { return; });
      sched.advance(VirtualSchedulerRunners.requiredAuditNumber(scenario.advanceMs));
    }
    if (scenario.action === 'schedule-and-cancel') {
      const task = sched.scheduleAt(VirtualSchedulerRunners.requiredAuditNumber(scenario.atMs), () => { return; });
      task.cancel();
    }
    if (scenario.action === 'schedule-and-cancel-all') {
      sched.scheduleAt(VirtualSchedulerRunners.requiredAuditNumber(scenario.atMs), () => { return; });
      sched.cancelAll();
    }
  }

  private static verifyAccessorSeams(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'subclass-seams'>): void {
    const { expected, input } = scenarioCase;
    const subclassInput = input.scheduler;
    const accessor = new CounterAccessor(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    assert.strictEqual(accessor.getCounter().nowMs(), expected.counterAccessorNowMs);

    const cancelChecker = new CancelChecker(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    const cancelTask = cancelChecker.scheduleAt(subclassInput.cancelAtMs, () => { return; });
    cancelTask.cancel();
    assert.strictEqual(cancelChecker.checkCancelled(cancelTask.id), expected.cancelCheckerCancelled);

    SpyHeapScheduler.heapCreatedCount = 0;
    const heapSched = new SpyHeapScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    assert.strictEqual(SpyHeapScheduler.heapCreatedCount, expected.heapCreatedCount);
    let fired = false;
    heapSched.scheduleAt(subclassInput.heapAtMs, () => { fired = true; });
    heapSched.advance(subclassInput.advanceMs);
    assert.strictEqual(fired, expected.heapFired);
  }

  private static async verifyErrorSeams(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'subclass-seams'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const subclassInput = input.scheduler;
    const errorSched = new ErrorHookScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    const thrownError = RuntimeError.create('task boom');
    errorSched.scheduleAt(subclassInput.fireErrorAtMs, () => { throw thrownError; });
    errorSched.runAll();
    assert.strictEqual(errorSched.fireErrorIds.length, expected.fireErrorCount);
    assert.strictEqual(errorSched.fireErrorValues[0], thrownError);

    const advanceErrorSched = new ErrorHookScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    advanceErrorSched.scheduleAt(subclassInput.fireErrorAtMs, () => { throw RuntimeError.create('sync throw'); });
    advanceErrorSched.advance(subclassInput.advanceMs);
    assert.strictEqual(advanceErrorSched.fireErrorIds.length, expected.fireErrorCount);

    const asyncSched = new AsyncErrorHookScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    asyncSched.scheduleAt(subclassInput.fireRejectAtMs, async () => { return await Promise.reject(RuntimeError.create('async reject')); });
    asyncSched.runAll();
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(asyncSched.asyncErrorCount, expected.asyncErrorCount);
  }

  private static verifyIdleAndRescheduleSeams(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'subclass-seams'>): void {
    const { expected, input } = scenarioCase;
    const subclassInput = input.scheduler;
    const rescheduleSched = new RescheduleHookScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    rescheduleSched.scheduleEvery(subclassInput.intervalMs, () => { return; });
    rescheduleSched.advance(subclassInput.rescheduleAdvanceMs);
    assert.strictEqual(rescheduleSched.rescheduleIds.length, expected.rescheduleCount);
    assert.deepStrictEqual(rescheduleSched.rescheduleAtMs, expected.rescheduleAtMs);

    const idleSched = new IdleHookScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    idleSched.scheduleAt(subclassInput.idleAtMs, () => { return; });
    idleSched.runAll();
    assert.strictEqual(idleSched.idleCount, expected.idleCount);
    const idleAdvanceSched = new IdleHookScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    idleAdvanceSched.scheduleAt(subclassInput.idleAtMs, () => { return; });
    idleAdvanceSched.advance(subclassInput.idleAdvanceMs);
    assert.strictEqual(idleAdvanceSched.idleCount, expected.idleCount);
    const idleCancelSched = new IdleHookScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    idleCancelSched.scheduleAt(subclassInput.idleAtMs, () => { return; });
    idleCancelSched.cancelAll();
    assert.strictEqual(idleCancelSched.idleCount, expected.idleCount);
    const idlePartialSched = new IdleHookScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    idlePartialSched.scheduleAt(subclassInput.idleAtMs, () => { return; });
    idlePartialSched.scheduleAt(subclassInput.idleSecondAtMs, () => { return; });
    idlePartialSched.advance(subclassInput.idleAdvanceMs);
    assert.strictEqual(idlePartialSched.idleCount, expected.idlePartialCount);
  }

  private static verifyThrowingHookSeams(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'subclass-seams'>): void {
    const { expected, input } = scenarioCase;
    const subclassInput = input.scheduler;
    const throwingSchedule = new ThrowingScheduleScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    assert.strictEqual(throwingSchedule.scheduleAt(subclassInput.scheduleAtMs, () => { return; }).id.length > 0, expected.throwingScheduleIdNonEmpty);

    const throwingFire = new ThrowingFireScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    let firedTask = false;
    throwingFire.scheduleAt(subclassInput.scheduleAtMs, () => {
      firedTask = true;
    });
    throwingFire.advance(subclassInput.advanceMs);
    assert.strictEqual(firedTask, expected.throwingFireFired);

    const recordingInvoker = new RecordingHookInvoker();
    const observed = new ObservedThrowingFireScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs), recordingInvoker);
    observed.scheduleAt(subclassInput.scheduleAtMs, () => { return; });
    observed.advance(subclassInput.advanceMs);
    const receivedError = recordingInvoker.receivedError;
    assert.ok(receivedError instanceof HookInvocationError);
    assert.strictEqual(receivedError.hookName, expected.observedHookName);
    assert.ok(receivedError.cause instanceof Error);
    assert.strictEqual(receivedError.cause.message, expected.observedCauseMessage);

    const throwingReschedule = new ThrowingRescheduleScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    let count = 0;
    throwingReschedule.scheduleEvery(subclassInput.intervalMs, () => {
      count++;
    });
    throwingReschedule.advance(subclassInput.rescheduleAdvanceMs);
    assert.strictEqual(count, expected.throwingRescheduleFireCount);

    const throwingFireError = new ThrowingFireErrorScheduler(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs));
    throwingFireError.scheduleAt(subclassInput.fireErrorAtMs, () => { throw RuntimeError.create('task boom'); });
    throwingFireError.runAll();
    assert.strictEqual(throwingFireError.fireErrorCount, expected.throwingFireErrorCount);
  }

  private static async verifyAsyncRejectionSeam(scenarioCase: ScenarioCaseOfType<VirtualSchedulerScenarioCaseEntity.Type, 'subclass-seams'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const subclassInput = input.scheduler;
    const invoker = new RecordingSwallowingInvoker();
    const rejectionError = RuntimeError.create('async onFire rejection');
    let rejectionEvents = 0;
    const onUnhandledRejection = (): void => {
      rejectionEvents++;
    };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const asyncFire = AsyncRejectingFireScheduler.make(VirtualSchedulerRunners.createCounter(subclassInput.counterStartMs), invoker, rejectionError);
      asyncFire.scheduleAt(subclassInput.scheduleAtMs, () => { return; });
      asyncFire.runAll();
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(rejectionEvents, expected.rejectionEventsLength);
      assert.deepStrictEqual(invoker.recordedHookNames, expected.recordedHookNames);
      assert.strictEqual(invoker.recordedCauses[0], rejectionError);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  private static requiredAuditNumber(value: number | undefined): number {
    if (value === undefined) {
      throw RuntimeError.create('Expected a numeric audit field');
    }
    return value;
  }

  private static createCounter(startMs: number): VirtualTimeCounter {
    const result = VirtualTimeCounter.create({ 'startMs': startMs });
    return result;
  }

  private static createScheduler(startMs: number): VirtualScheduler {
    const result = VirtualScheduler.create({ 'counter': VirtualSchedulerRunners.createCounter(startMs) });
    return result;
  }

  private static materializeHeapTask(descriptor: HeapTaskDescriptorEntity.Type): MutableHeapTaskInterface {
    const task: MutableHeapTaskInterface = {
      'atMs': descriptor.atMs,
      'fire': (): void => { return; },
      'id': descriptor.id,
      'intervalMs': descriptor.intervalMs,
      'variant': descriptor.variant
    };
    return task;
  }

  private static applyHeapTaskMutation(task: MutableHeapTaskInterface, mutation: HeapTaskDescriptorEntity.Type['mutation']): void {
    if (mutation?.atMs !== undefined) {
      task.atMs = mutation.atMs;
    }
    if (mutation?.id !== undefined) {
      task.id = mutation.id;
    }
  }
}

ScenarioSuite.register({
  'entity': VirtualSchedulerScenarioCaseEntity,
  'extraTests': VirtualSchedulerRunners.declaresExtraTests,
  'file': scenarioGroups,
  'name': 'VirtualScheduler',
  'runners': VirtualSchedulerRunners
});
