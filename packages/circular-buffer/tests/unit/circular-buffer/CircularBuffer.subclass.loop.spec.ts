import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError, ReentrantHookInvocationError } from '@studnicky/errors';

import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';
import type { CircularBufferOptionsEntity } from '../../../src/entities/CircularBufferOptionsEntity.js';
import scenarioGroups from './CircularBuffer.subclass.scenarios.json';

type ScenarioKind =
  | 'async-rejecting-onPush-guarded'
  | 'base-class-operates-correctly-after-grow'
  | 'create-returns-subclass'
  | 'full-trace-grow'
  | 'full-trace-overwrite'
  | 'grow-mode-all-hooks-active'
  | 'onEvict-called-with-evicted-item'
  | 'onEvict-not-called-below-capacity'
  | 'onEvict-receives-items-FIFO'
  | 'onEvict-receives-oldest-item'
  | 'onGrow-called-once-per-grow-event'
  | 'onGrow-called-when-capacity-exceeded'
  | 'onGrow-not-called-in-overwrite-mode'
  | 'onGrow-receives-correct-old-new-capacity'
  | 'onPush-called-on-each-overwrite-push'
  | 'onPush-called-on-each-push'
  | 'onPush-called-on-grow-trigger'
  | 'onPush-length-already-incremented'
  | 'onShift-called-with-items-before-returned'
  | 'onShift-not-called-when-empty'
  | 'onShift-receives-correct-item'
  | 'onShift-return-value-matches-log'
  | 'reentrant-grow-throws-and-does-not-double-resize'
  | 'reentrant-shift-throws'
  | 'subclass-can-read-protected-state'
  | 'throwing-onEvict'
  | 'throwing-onGrow'
  | 'throwing-onOverflow'
  | 'throwing-onPush'
  | 'throwing-onShift';

type BufferItem = number | string;

type AsyncOperation = {
  method: 'push' | 'unshift';
  value: number;
};

type GrowLogEntry = {
  newCapacity: number;
  oldCapacity: number;
};

type InspectState = {
  capacity: number;
  head: number;
  length: number;
  tail: number;
};

type ScenarioBatch = {
  pushStageCounts?: number[];
  shiftCount?: number;
};

type ScenarioInput = {
  asyncOperations?: AsyncOperation[];
  batch?: ScenarioBatch;
  flushTurns?: number;
  options: CircularBufferOptionsEntity.Type;
  pushItems?: BufferItem[];
  pushValue?: number;
};

type ScenarioExpected = {
  evictItems?: number[];
  evictItemsLength?: number;
  evictLog?: BufferItem[];
  firstShift?: number;
  firstShiftValues?: number[];
  growEventsLength?: number;
  growLog?: GrowLogEntry[];
  growOldCapacitiesFirst?: number[];
  growOldCapacitiesSecond?: number[];
  length?: number;
  lengthAtHook?: number;
  minHookErrors?: number;
  pushCount?: number;
  pushItemsLength?: number;
  rejectionCount?: number;
  result?: number[];
  returned?: string;
  secondShift?: number;
  shiftCount?: number;
  shiftItemsLength?: number;
  shiftLog?: BufferItem[];
  shiftValue?: number;
  shiftValues?: number[];
  state?: InspectState;
};

type ScenarioCase = {
  description: string;
  expected: ScenarioExpected;
  input: ScenarioInput;
  kind: ScenarioKind;
  name: string;
};

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

class GrowLogBuffer<T> extends CircularBuffer<T> {
  readonly growLog: Array<{ oldCapacity: number; newCapacity: number }> = [];

  override onGrow(oldCapacity: number, newCapacity: number): void {
    this.growLog.push({ oldCapacity, newCapacity });
  }
}

class EvictLogBuffer<T> extends CircularBuffer<T> {
  readonly evictLog: T[] = [];

  override onEvict(item: T): void {
    this.evictLog.push(item);
  }
}

class PushCountBuffer<T> extends CircularBuffer<T> {
  pushCount = 0;

  override onPush(_item: T): void {
    this.pushCount += 1;
  }
}

class ShiftLogBuffer<T> extends CircularBuffer<T> {
  readonly shiftLog: T[] = [];

  override onShift(item: T): void {
    this.shiftLog.push(item);
  }
}

class FullTraceBuffer<T> extends CircularBuffer<T> {
  readonly evictItems: T[] = [];
  readonly growEvents: number[] = [];
  readonly pushItems: T[] = [];
  readonly shiftItems: T[] = [];

  override onEvict(item: T): void {
    this.evictItems.push(item);
  }

  override onGrow(_oldCapacity: number, newCapacity: number): void {
    this.growEvents.push(newCapacity);
  }

  override onPush(item: T): void {
    this.pushItems.push(item);
  }

  override onShift(item: T): void {
    this.shiftItems.push(item);
  }
}

class ThrowingPushBuffer<T> extends CircularBuffer<T> {
  override onPush(): void {
    throw new Error('onPush boom');
  }
}

class ThrowingOverflowBuffer<T> extends CircularBuffer<T> {
  override onOverflow(): void {
    throw new Error('onOverflow boom');
  }
}

class ThrowingEvictBuffer<T> extends CircularBuffer<T> {
  override onEvict(): void {
    throw new Error('onEvict boom');
  }
}

class ThrowingGrowBuffer<T> extends CircularBuffer<T> {
  override onGrow(): void {
    throw new Error('onGrow boom');
  }
}

class ThrowingShiftBuffer<T> extends CircularBuffer<T> {
  override onShift(): void {
    throw new Error('onShift boom');
  }
}

class AsyncRejectingPushBuffer<T> extends CircularBuffer<T> {
  readonly #cause: Error;

  constructor(options: CircularBufferOptionsEntity.Type, cause: Error) {
    super(options);
    this.#cause = cause;
  }

  get recordedHookErrors(): readonly HookInvocationError[] {
    return this.hooks.getHookErrors();
  }

  override async onPush(_item: T): Promise<void> {
    await Promise.resolve();
    throw this.#cause;
  }
}

class InspectBuffer<T> extends CircularBuffer<T> {
  inspect(): { capacity: number; head: number; length: number; tail: number } {
    return {
      capacity: this.capacity,
      head: this.head,
      length: this.count,
      tail: this.tail
    };
  }
}

class ReentrantShiftBuffer<T> extends CircularBuffer<T> {
  reentrantError: unknown;
  readonly shiftLog: T[] = [];
  #reentering = false;

  override onShift(item: T): void {
    this.shiftLog.push(item);
    if (this.#reentering) return;
    this.#reentering = true;
    try {
      this.shift();
    } catch (error) {
      this.reentrantError = error;
    } finally {
      this.#reentering = false;
    }
  }
}

class ReentrantGrowBuffer<T> extends CircularBuffer<T> {
  reentrantError: unknown;
  readonly growLog: Array<{ oldCapacity: number; newCapacity: number }> = [];
  #reentering = false;

  override onGrow(oldCapacity: number, newCapacity: number): void {
    this.growLog.push({ oldCapacity, newCapacity });
    if (this.#reentering) return;
    this.#reentering = true;
    try {
      this.growPublicly();
    } catch (error) {
      this.reentrantError = error;
    } finally {
      this.#reentering = false;
    }
  }

  growPublicly(): void {
    this.grow();
  }
}

function pushAll<T>(buffer: { push(value: T): void }, values: readonly T[]): void {
  for (const value of values) {
    buffer.push(value);
  }
}

function shiftMany<T>(buffer: { shift(): T | undefined }, count: number): T[] {
  const values: T[] = [];
  for (let index = 0; index < count; index += 1) {
    const value = buffer.shift();
    if (value !== undefined) {
      values.push(value);
    }
  }
  return values;
}

function requireDefined<T>(value: T | undefined, fieldPath: string): T {
  if (value === undefined) {
    throw new Error(`Missing circular-buffer subclass scenario field: ${fieldPath}`);
  }

  return value;
}

function requireItems(scenarioCase: ScenarioCase): BufferItem[] {
  return requireDefined(scenarioCase.input.pushItems, 'input.pushItems');
}

function requireNumberItems(scenarioCase: ScenarioCase): number[] {
  const items = requireItems(scenarioCase);
  const numbers: number[] = [];
  for (const item of items) {
    if (typeof item !== 'number') {
      throw new Error(`Expected numeric push item in scenario: ${scenarioCase.name}`);
    }
    numbers.push(item);
  }

  return numbers;
}

function requireStringItems(scenarioCase: ScenarioCase): string[] {
  const items = requireItems(scenarioCase);
  const strings: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string') {
      throw new Error(`Expected string push item in scenario: ${scenarioCase.name}`);
    }
    strings.push(item);
  }

  return strings;
}

function shiftAll<T>(buffer: { readonly length: number; shift(): T | undefined }): T[] {
  const values: T[] = [];
  while (buffer.length > 0) {
    const value = buffer.shift();
    if (value !== undefined) {
      values.push(value);
    }
  }

  return values;
}

function assertLastPushThrows<T>(buffer: { push(value: T): void }, values: readonly T[]): void {
  if (values.length === 0) {
    throw new Error('Missing circular-buffer subclass scenario field: input.pushItems');
  }

  const failingIndex = values.length - 1;
  const failingValue = requireDefined(values[failingIndex], 'input.pushItems[last]');
  pushAll(buffer, values.slice(0, failingIndex));
  assert.throws(() => {
    buffer.push(failingValue);
  }, HookInvocationError);
}

function pushStage<T>(
  buffer: { push(value: T): void },
  values: readonly T[],
  startIndex: number,
  count: number
): number {
  const endIndex = startIndex + count;
  const stageItems = values.slice(startIndex, endIndex);
  if (stageItems.length !== count) {
    throw new Error('Circular-buffer subclass push stage exceeds input.pushItems');
  }
  pushAll(buffer, stageItems);

  return endIndex;
}

function waitImmediate(): Promise<void> {
  return new Promise((resolve) => { setImmediate(resolve); });
}

const asyncOperationMap = {
  'push': (buffer: AsyncRejectingPushBuffer<number>, value: number): void => {
    buffer.push(value);
  },
  'unshift': (buffer: AsyncRejectingPushBuffer<number>, value: number): void => {
    buffer.unshift(value);
  }
} satisfies Record<AsyncOperation['method'], (buffer: AsyncRejectingPushBuffer<number>, value: number) => void>;

function applyAsyncOperations(buffer: AsyncRejectingPushBuffer<number>, operations: readonly AsyncOperation[]): void {
  for (const operation of operations) {
    asyncOperationMap[operation.method](buffer, operation.value);
  }
}

function runCreateReturnsSubclass(scenarioCase: ScenarioCase): void {
  const buf: EvictLogBuffer<number> = EvictLogBuffer.create<number, EvictLogBuffer<number>>(scenarioCase.input.options);
  pushAll(buf, requireNumberItems(scenarioCase));
  assert.ok(buf instanceof EvictLogBuffer);
  assert.deepStrictEqual(buf.evictLog, requireDefined(scenarioCase.expected.evictLog, 'expected.evictLog'));
}

function runEvictLog(scenarioCase: ScenarioCase): void {
  const buf = EvictLogBuffer.create<BufferItem>(scenarioCase.input.options);
  pushAll(buf, requireItems(scenarioCase));
  assert.deepStrictEqual(buf.evictLog, requireDefined(scenarioCase.expected.evictLog, 'expected.evictLog'));
}

function runGrowLog(scenarioCase: ScenarioCase): void {
  const buf = GrowLogBuffer.create<number>(scenarioCase.input.options);
  pushAll(buf, requireNumberItems(scenarioCase));
  assert.deepStrictEqual(buf.growLog, requireDefined(scenarioCase.expected.growLog, 'expected.growLog'));
}

function runPushCount(scenarioCase: ScenarioCase): void {
  const buf = PushCountBuffer.create<number>(scenarioCase.input.options);
  pushAll(buf, requireNumberItems(scenarioCase));
  assert.strictEqual(buf.pushCount, requireDefined(scenarioCase.expected.pushCount, 'expected.pushCount'));
}

function runShiftAllLog(scenarioCase: ScenarioCase): void {
  const pushItems = requireNumberItems(scenarioCase);
  const buf = ShiftLogBuffer.create<number>(scenarioCase.input.options);
  pushAll(buf, pushItems);
  shiftMany(buf, pushItems.length);
  assert.deepStrictEqual(buf.shiftLog, requireDefined(scenarioCase.expected.shiftLog, 'expected.shiftLog'));
}

function runShiftEmpty(scenarioCase: ScenarioCase): void {
  const buf = ShiftLogBuffer.create<number>(scenarioCase.input.options);
  shiftMany(buf, requireDefined(scenarioCase.input.batch?.shiftCount, 'input.batch.shiftCount'));
  assert.deepStrictEqual(buf.shiftLog, requireDefined(scenarioCase.expected.shiftLog, 'expected.shiftLog'));
}

function runShiftExpectedLogCount(scenarioCase: ScenarioCase): void {
  const expectedShiftLog = requireDefined(scenarioCase.expected.shiftLog, 'expected.shiftLog');
  const buf = ShiftLogBuffer.create<number>(scenarioCase.input.options);
  pushAll(buf, requireNumberItems(scenarioCase));
  shiftMany(buf, expectedShiftLog.length);
  assert.deepStrictEqual(buf.shiftLog, expectedShiftLog);
}

function runPushLengthAlreadyIncremented(scenarioCase: ScenarioCase): void {
  let lengthAtHook: number | undefined;
  class LengthCheckBuffer extends CircularBuffer<number> {
    override onPush(_item: number): void {
      lengthAtHook = this.count;
    }
  }
  const buf = LengthCheckBuffer.create<number>(scenarioCase.input.options);
  buf.push(requireDefined(scenarioCase.input.pushValue, 'input.pushValue'));
  assert.strictEqual(lengthAtHook, requireDefined(scenarioCase.expected.lengthAtHook, 'expected.lengthAtHook'));
}

function runBaseClassAfterGrow(scenarioCase: ScenarioCase): void {
  const buf = GrowLogBuffer.create<number>(scenarioCase.input.options);
  pushAll(buf, requireNumberItems(scenarioCase));
  assert.deepStrictEqual(
    shiftMany(buf, requireDefined(scenarioCase.expected.shiftCount, 'expected.shiftCount')),
    requireDefined(scenarioCase.expected.shiftValues, 'expected.shiftValues')
  );
}

function runShiftReturnMatchesLog(scenarioCase: ScenarioCase): void {
  const buf = ShiftLogBuffer.create<string>(scenarioCase.input.options);
  pushAll(buf, requireStringItems(scenarioCase));
  assert.strictEqual(buf.shift(), requireDefined(scenarioCase.expected.returned, 'expected.returned'));
  assert.deepStrictEqual(buf.shiftLog, requireDefined(scenarioCase.expected.shiftLog, 'expected.shiftLog'));
}

function runFullTraceGrow(scenarioCase: ScenarioCase): void {
  const buf = FullTraceBuffer.create<number>(scenarioCase.input.options);
  pushAll(buf, requireNumberItems(scenarioCase));
  shiftMany(buf, requireDefined(scenarioCase.input.batch?.shiftCount, 'input.batch.shiftCount'));
  assert.strictEqual(buf.growEvents.length, requireDefined(scenarioCase.expected.growEventsLength, 'expected.growEventsLength'));
  assert.strictEqual(buf.pushItems.length, requireDefined(scenarioCase.expected.pushItemsLength, 'expected.pushItemsLength'));
  assert.strictEqual(buf.shiftItems.length, requireDefined(scenarioCase.expected.shiftItemsLength, 'expected.shiftItemsLength'));
  assert.strictEqual(buf.evictItems.length, requireDefined(scenarioCase.expected.evictItemsLength, 'expected.evictItemsLength'));
}

function runFullTraceOverwrite(scenarioCase: ScenarioCase): void {
  const buf = FullTraceBuffer.create<number>(scenarioCase.input.options);
  pushAll(buf, requireNumberItems(scenarioCase));
  assert.deepStrictEqual(buf.evictItems, requireDefined(scenarioCase.expected.evictItems, 'expected.evictItems'));
  assert.strictEqual(buf.growEvents.length, requireDefined(scenarioCase.expected.growEventsLength, 'expected.growEventsLength'));
  assert.strictEqual(buf.pushItems.length, requireDefined(scenarioCase.expected.pushItemsLength, 'expected.pushItemsLength'));
}

function runGrowModeAllHooksActive(scenarioCase: ScenarioCase): void {
  const buf = FullTraceBuffer.create<number>(scenarioCase.input.options);
  pushAll(buf, requireNumberItems(scenarioCase));
  assert.deepStrictEqual(shiftAll(buf), requireDefined(scenarioCase.expected.result, 'expected.result'));
}

function runThrowingOnPush(scenarioCase: ScenarioCase): void {
  const buf = ThrowingPushBuffer.create<number>(scenarioCase.input.options);
  assert.throws(() => {
    buf.push(requireDefined(scenarioCase.input.pushValue, 'input.pushValue'));
  }, HookInvocationError);
  assert.strictEqual(buf.length, requireDefined(scenarioCase.expected.length, 'expected.length'));
  assert.strictEqual(buf.shift(), requireDefined(scenarioCase.expected.shiftValue, 'expected.shiftValue'));
}

function runThrowingOnOverflow(scenarioCase: ScenarioCase): void {
  const buf = ThrowingOverflowBuffer.create<number>(scenarioCase.input.options);
  assertLastPushThrows(buf, requireNumberItems(scenarioCase));
  assert.strictEqual(buf.length, requireDefined(scenarioCase.expected.length, 'expected.length'));
  assert.deepStrictEqual(shiftMany(buf, requireDefined(scenarioCase.expected.shiftValues, 'expected.shiftValues').length), scenarioCase.expected.shiftValues);
}

function runThrowingOnEvict(scenarioCase: ScenarioCase): void {
  const buf = ThrowingEvictBuffer.create<number>(scenarioCase.input.options);
  assertLastPushThrows(buf, requireNumberItems(scenarioCase));
  assert.strictEqual(buf.length, requireDefined(scenarioCase.expected.length, 'expected.length'));
  assert.deepStrictEqual(shiftMany(buf, requireDefined(scenarioCase.expected.shiftValues, 'expected.shiftValues').length), scenarioCase.expected.shiftValues);
}

function runThrowingOnGrow(scenarioCase: ScenarioCase): void {
  const buf = ThrowingGrowBuffer.create<number>(scenarioCase.input.options);
  assertLastPushThrows(buf, requireNumberItems(scenarioCase));
  assert.strictEqual(buf.length, requireDefined(scenarioCase.expected.length, 'expected.length'));
  assert.deepStrictEqual(shiftMany(buf, requireDefined(scenarioCase.expected.shiftValues, 'expected.shiftValues').length), scenarioCase.expected.shiftValues);
}

function runThrowingOnShift(scenarioCase: ScenarioCase): void {
  const buf = ThrowingShiftBuffer.create<number>(scenarioCase.input.options);
  pushAll(buf, requireNumberItems(scenarioCase));
  assert.throws(() => {
    buf.shift();
  }, HookInvocationError);
  assert.strictEqual(buf.length, requireDefined(scenarioCase.expected.length, 'expected.length'));
}

async function runAsyncRejectingOnPushGuarded(scenarioCase: ScenarioCase): Promise<void> {
  const buf = new AsyncRejectingPushBuffer<number>(scenarioCase.input.options, new Error('async onPush boom'));
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => {
    rejectionEvents.push(reason);
  };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    applyAsyncOperations(buf, requireDefined(scenarioCase.input.asyncOperations, 'input.asyncOperations'));
    assert.strictEqual(buf.length, requireDefined(scenarioCase.expected.length, 'expected.length'));
    for (let index = 0; index < requireDefined(scenarioCase.input.flushTurns, 'input.flushTurns'); index += 1) {
      await waitImmediate();
    }
    assert.strictEqual(rejectionEvents.length, requireDefined(scenarioCase.expected.rejectionCount, 'expected.rejectionCount'));
    assert.deepStrictEqual(shiftMany(buf, requireDefined(scenarioCase.expected.shiftValues, 'expected.shiftValues').length), scenarioCase.expected.shiftValues);
    assert.strictEqual(
      buf.recordedHookErrors.length >= requireDefined(scenarioCase.expected.minHookErrors, 'expected.minHookErrors'),
      true
    );
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
}

function runSubclassProtectedState(scenarioCase: ScenarioCase): void {
  const buf = InspectBuffer.create<number>(scenarioCase.input.options);
  pushAll(buf, requireNumberItems(scenarioCase));
  buf.shift();
  assert.deepStrictEqual(buf.inspect(), requireDefined(scenarioCase.expected.state, 'expected.state'));
}

function runReentrantShift(scenarioCase: ScenarioCase): void {
  const buf = ReentrantShiftBuffer.create<number>(scenarioCase.input.options);
  pushAll(buf, requireNumberItems(scenarioCase));
  assert.strictEqual(buf.shift(), requireDefined(scenarioCase.expected.firstShift, 'expected.firstShift'));
  assert.ok(buf.reentrantError instanceof ReentrantHookInvocationError);
  assert.strictEqual(buf.length, requireDefined(scenarioCase.expected.length, 'expected.length'));
  assert.strictEqual(buf.shift(), requireDefined(scenarioCase.expected.secondShift, 'expected.secondShift'));
}

function runReentrantGrow(scenarioCase: ScenarioCase): void {
  const buf = ReentrantGrowBuffer.create<number>(scenarioCase.input.options);
  const pushItems = requireNumberItems(scenarioCase);
  const pushStageCounts = requireDefined(scenarioCase.input.batch?.pushStageCounts, 'input.batch.pushStageCounts');
  const firstStageCount = requireDefined(pushStageCounts[0], 'input.batch.pushStageCounts[0]');
  const secondStageCount = requireDefined(pushStageCounts[1], 'input.batch.pushStageCounts[1]');
  const thirdStageCount = requireDefined(pushStageCounts[2], 'input.batch.pushStageCounts[2]');

  let nextIndex = pushStage(buf, pushItems, 0, firstStageCount);
  assert.ok(buf.reentrantError instanceof ReentrantHookInvocationError);
  assert.deepStrictEqual(shiftMany(buf, requireDefined(scenarioCase.expected.firstShiftValues, 'expected.firstShiftValues').length), scenarioCase.expected.firstShiftValues);
  nextIndex = pushStage(buf, pushItems, nextIndex, secondStageCount);
  assert.deepStrictEqual(buf.growLog.map((entry) => entry.oldCapacity), scenarioCase.expected.growOldCapacitiesFirst);
  pushStage(buf, pushItems, nextIndex, thirdStageCount);
  assert.deepStrictEqual(buf.growLog.map((entry) => entry.oldCapacity), scenarioCase.expected.growOldCapacitiesSecond);
}

const runnerMap = {
  'async-rejecting-onPush-guarded': runAsyncRejectingOnPushGuarded,
  'base-class-operates-correctly-after-grow': runBaseClassAfterGrow,
  'create-returns-subclass': runCreateReturnsSubclass,
  'full-trace-grow': runFullTraceGrow,
  'full-trace-overwrite': runFullTraceOverwrite,
  'grow-mode-all-hooks-active': runGrowModeAllHooksActive,
  'onEvict-called-with-evicted-item': runEvictLog,
  'onEvict-not-called-below-capacity': runEvictLog,
  'onEvict-receives-items-FIFO': runEvictLog,
  'onEvict-receives-oldest-item': runEvictLog,
  'onGrow-called-once-per-grow-event': runGrowLog,
  'onGrow-called-when-capacity-exceeded': runGrowLog,
  'onGrow-not-called-in-overwrite-mode': runGrowLog,
  'onGrow-receives-correct-old-new-capacity': runGrowLog,
  'onPush-called-on-each-overwrite-push': runPushCount,
  'onPush-called-on-each-push': runPushCount,
  'onPush-called-on-grow-trigger': runPushCount,
  'onPush-length-already-incremented': runPushLengthAlreadyIncremented,
  'onShift-called-with-items-before-returned': runShiftAllLog,
  'onShift-not-called-when-empty': runShiftEmpty,
  'onShift-receives-correct-item': runShiftExpectedLogCount,
  'onShift-return-value-matches-log': runShiftReturnMatchesLog,
  'reentrant-grow-throws-and-does-not-double-resize': runReentrantGrow,
  'reentrant-shift-throws': runReentrantShift,
  'subclass-can-read-protected-state': runSubclassProtectedState,
  'throwing-onEvict': runThrowingOnEvict,
  'throwing-onGrow': runThrowingOnGrow,
  'throwing-onOverflow': runThrowingOnOverflow,
  'throwing-onPush': runThrowingOnPush,
  'throwing-onShift': runThrowingOnShift
} satisfies Record<ScenarioKind, ScenarioRunner>;

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('CircularBuffer subclass', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
