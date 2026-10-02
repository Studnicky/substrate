import { HookInvocationError, ReentrantHookInvocationError, RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';
import { CircularBufferSubclassScenarioCaseEntity } from '../entities/CircularBufferSubclassScenarioCaseEntity.js';
import { GrowLogBuffer } from '../helpers/GrowLogBuffer.js';
import { PushCountBuffer } from '../helpers/PushCountBuffer.js';
import scenarioGroups from './CircularBuffer.subclass.scenarios.json' with { 'type': 'json' };



class EvictLogBuffer<T> extends CircularBuffer<T> {
  readonly evictLog: T[] = [];

  override onEvict(item: T): void {
    this.evictLog.push(item);
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
    throw RuntimeError.create('onPush boom');
  }
}

class ThrowingOverflowBuffer<T> extends CircularBuffer<T> {
  override onOverflow(): void {
    throw RuntimeError.create('onOverflow boom');
  }
}

class ThrowingEvictBuffer<T> extends CircularBuffer<T> {
  override onEvict(): void {
    throw RuntimeError.create('onEvict boom');
  }
}

class ThrowingGrowBuffer<T> extends CircularBuffer<T> {
  override onGrow(): void {
    throw RuntimeError.create('onGrow boom');
  }
}

class ThrowingShiftBuffer<T> extends CircularBuffer<T> {
  override onShift(): void {
    throw RuntimeError.create('onShift boom');
  }
}

class AsyncRejectingPushBuffer<T> extends CircularBuffer<T> {
  readonly #cause: RuntimeError;

  constructor(options: unknown, cause: RuntimeError) {
    super(options);
    this.#cause = cause;
  }

  get recordedHookErrors(): readonly HookInvocationError[] {
    const result = this.hooks.getHookErrors();
    return result;
  }

  override async onPush(_item: T): Promise<void> {
    await Promise.resolve();
    throw this.#cause;
  }
}

class InspectBuffer<T> extends CircularBuffer<T> {
  inspect(): { 'capacity': number; 'head': number; 'length': number; 'tail': number } {
    const result = {
      'capacity': this.capacity,
      'head': this.head,
      'length': this.count,
      'tail': this.tail
    };
    return result;
  }
}

class ReentrantShiftBuffer<T> extends CircularBuffer<T> {
  reentrantError: unknown;
  readonly shiftLog: T[] = [];
  #reentering = false;

  override onShift(item: T): void {
    this.shiftLog.push(item);
    if (this.#reentering) {return;}
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
  readonly growLog: { 'newCapacity': number; 'oldCapacity': number; }[] = [];
  #reentering = false;

  override onGrow(oldCapacity: number, newCapacity: number): void {
    this.growLog.push({ 'newCapacity': newCapacity, 'oldCapacity': oldCapacity });
    if (this.#reentering) {return;}
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

class CircularBufferSubclassRunners {
  static pushAll<T>(buffer: { push(value: T): void }, values: readonly T[]): void {
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (value !== undefined) {
        buffer.push(value);
      }
    }
  }

  static shiftMany<T>(buffer: { shift(): T | undefined }, count: number): T[] {
    const values: T[] = [];
    for (let index = 0; index < count; index += 1) {
      const value = buffer.shift();
      if (value !== undefined) {
        values.push(value);
      }
    }
    return values;
  }

  static requireDefined<T>(value: T | undefined, fieldPath: string): T {
    if (value === undefined) {
      throw RuntimeError.create(`Missing circular-buffer subclass scenario field: ${fieldPath}`);
    }

    return value;
  }

  static requireItems(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): (number | string)[] {
    const result = CircularBufferSubclassRunners.requireDefined(scenarioCase.input.pushItems, 'input.pushItems');
    return result;
  }

  static requireNumberItems(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): number[] {
    const items = CircularBufferSubclassRunners.requireItems(scenarioCase);
    const numbers: number[] = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (typeof item !== 'number') {
        throw RuntimeError.create(`Expected numeric push item in scenario: ${scenarioCase.name}`);
      }
      numbers.push(item);
    }

    return numbers;
  }

  static requireStringItems(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): string[] {
    const items = CircularBufferSubclassRunners.requireItems(scenarioCase);
    const strings: string[] = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (typeof item !== 'string') {
        throw RuntimeError.create(`Expected string push item in scenario: ${scenarioCase.name}`);
      }
      strings.push(item);
    }

    return strings;
  }

  static shiftAll<T>(buffer: { readonly 'length': number; shift(): T | undefined }): T[] {
    const values: T[] = [];
    while (buffer.length > 0) {
      const value = buffer.shift();
      if (value !== undefined) {
        values.push(value);
      }
    }

    return values;
  }

  static assertLastPushThrows<T>(buffer: { push(value: T): void }, values: readonly T[]): void {
    if (values.length === 0) {
      throw RuntimeError.create('Missing circular-buffer subclass scenario field: input.pushItems');
    }

    const failingIndex = values.length - 1;
    const failingValue = CircularBufferSubclassRunners.requireDefined(values[failingIndex], 'input.pushItems[last]');
    CircularBufferSubclassRunners.pushAll(buffer, values.slice(0, failingIndex));
    assert.throws(() => {
      buffer.push(failingValue);
    }, HookInvocationError);
  }

  static pushStage<T>(buffer: { push(value: T): void }, values: readonly T[], startIndex: number, count: number): number {
    const endIndex = startIndex + count;
    const stageItems = values.slice(startIndex, endIndex);
    if (stageItems.length !== count) {
      throw RuntimeError.create('Circular-buffer subclass push stage exceeds input.pushItems');
    }
    CircularBufferSubclassRunners.pushAll(buffer, stageItems);

    return endIndex;
  }

  static waitImmediate(): Promise<void> {
    const result = new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    return result;
  }

  static applyAsyncOperations(buffer: AsyncRejectingPushBuffer<number>, operations: readonly { 'method': 'push' | 'unshift'; 'value': number }[]): void {
    for (let index = 0; index < operations.length; index += 1) {
      const operation = operations[index];
      if (operation !== undefined) {
        if (operation.method === 'push') {
          buffer.push(operation.value);
        } else {
          buffer.unshift(operation.value);
        }
      }
    }
  }

  static runCreateReturnsSubclass(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer: EvictLogBuffer<number> = EvictLogBuffer.create<number, EvictLogBuffer<number>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    assert.ok(buffer instanceof EvictLogBuffer);
    assert.deepStrictEqual(buffer.evictLog, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.evictLog, 'expected.evictLog'));
  }

  static runEvictLog(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = EvictLogBuffer.create<number | string, EvictLogBuffer<number | string>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireItems(scenarioCase));
    assert.deepStrictEqual(buffer.evictLog, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.evictLog, 'expected.evictLog'));
  }

  static runGrowLog(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = GrowLogBuffer.create<number, GrowLogBuffer<number>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    assert.deepStrictEqual(buffer.growLog, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.growLog, 'expected.growLog'));
  }

  static runPushCount(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = PushCountBuffer.create<number, PushCountBuffer<number>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    assert.strictEqual(buffer.pushCount, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.pushCount, 'expected.pushCount'));
  }

  static runShiftAllLog(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const pushItems = CircularBufferSubclassRunners.requireNumberItems(scenarioCase);
    const buffer = ShiftLogBuffer.create<number, ShiftLogBuffer<number>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, pushItems);
    CircularBufferSubclassRunners.shiftMany(buffer, pushItems.length);
    assert.deepStrictEqual(buffer.shiftLog, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftLog, 'expected.shiftLog'));
  }

  static runShiftEmpty(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = ShiftLogBuffer.create<number, ShiftLogBuffer<number>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.shiftMany(buffer, CircularBufferSubclassRunners.requireDefined(scenarioCase.input.batch?.shiftCount, 'input.batch.shiftCount'));
    assert.deepStrictEqual(buffer.shiftLog, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftLog, 'expected.shiftLog'));
  }

  static runShiftExpectedLogCount(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const expectedShiftLog = CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftLog, 'expected.shiftLog');
    const buffer = ShiftLogBuffer.create<number, ShiftLogBuffer<number>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    CircularBufferSubclassRunners.shiftMany(buffer, expectedShiftLog.length);
    assert.deepStrictEqual(buffer.shiftLog, expectedShiftLog);
  }

  static runPushLengthAlreadyIncremented(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    let lengthAtHook: number | undefined;
    class LengthCheckBuffer extends CircularBuffer<number> {
      override onPush(_item: number): void {
        lengthAtHook = this.count;
      }
    }
    const buffer = LengthCheckBuffer.create<number>(scenarioCase.input.options);
    buffer.push(CircularBufferSubclassRunners.requireDefined(scenarioCase.input.pushValue, 'input.pushValue'));
    assert.strictEqual(lengthAtHook, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.lengthAtHook, 'expected.lengthAtHook'));
  }

  static runBaseClassAfterGrow(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = GrowLogBuffer.create<number>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    assert.deepStrictEqual(
      CircularBufferSubclassRunners.shiftMany(buffer, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftCount, 'expected.shiftCount')),
      CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftValues, 'expected.shiftValues')
    );
  }

  static runShiftReturnMatchesLog(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = ShiftLogBuffer.create<string, ShiftLogBuffer<string>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireStringItems(scenarioCase));
    assert.strictEqual(buffer.shift(), CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.returned, 'expected.returned'));
    assert.deepStrictEqual(buffer.shiftLog, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftLog, 'expected.shiftLog'));
  }

  static runFullTraceGrow(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = FullTraceBuffer.create<number, FullTraceBuffer<number>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    CircularBufferSubclassRunners.shiftMany(buffer, CircularBufferSubclassRunners.requireDefined(scenarioCase.input.batch?.shiftCount, 'input.batch.shiftCount'));
    assert.strictEqual(buffer.growEvents.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.growEventsLength, 'expected.growEventsLength'));
    assert.strictEqual(buffer.pushItems.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.pushItemsLength, 'expected.pushItemsLength'));
    assert.strictEqual(buffer.shiftItems.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftItemsLength, 'expected.shiftItemsLength'));
    assert.strictEqual(buffer.evictItems.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.evictItemsLength, 'expected.evictItemsLength'));
  }

  static runFullTraceOverwrite(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = FullTraceBuffer.create<number, FullTraceBuffer<number>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    assert.deepStrictEqual(buffer.evictItems, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.evictItems, 'expected.evictItems'));
    assert.strictEqual(buffer.growEvents.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.growEventsLength, 'expected.growEventsLength'));
    assert.strictEqual(buffer.pushItems.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.pushItemsLength, 'expected.pushItemsLength'));
  }

  static runGrowModeAllHooksActive(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = FullTraceBuffer.create<number>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    assert.deepStrictEqual(CircularBufferSubclassRunners.shiftAll(buffer), CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.result, 'expected.result'));
  }

  static runThrowingOnPush(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = ThrowingPushBuffer.create<number>(scenarioCase.input.options);
    assert.throws(() => {
      buffer.push(CircularBufferSubclassRunners.requireDefined(scenarioCase.input.pushValue, 'input.pushValue'));
    }, HookInvocationError);
    assert.strictEqual(buffer.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.length, 'expected.length'));
    assert.strictEqual(buffer.shift(), CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftValue, 'expected.shiftValue'));
  }

  static runThrowingOnOverflow(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = ThrowingOverflowBuffer.create<number>(scenarioCase.input.options);
    CircularBufferSubclassRunners.assertLastPushThrows(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    assert.strictEqual(buffer.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.length, 'expected.length'));
    const expectedShiftValues = CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftValues, 'expected.shiftValues');
    assert.deepStrictEqual(CircularBufferSubclassRunners.shiftMany(buffer, expectedShiftValues.length), expectedShiftValues);
  }

  static runThrowingOnEvict(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = ThrowingEvictBuffer.create<number>(scenarioCase.input.options);
    CircularBufferSubclassRunners.assertLastPushThrows(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    assert.strictEqual(buffer.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.length, 'expected.length'));
    const expectedShiftValues = CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftValues, 'expected.shiftValues');
    assert.deepStrictEqual(CircularBufferSubclassRunners.shiftMany(buffer, expectedShiftValues.length), expectedShiftValues);
  }

  static runThrowingOnGrow(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = ThrowingGrowBuffer.create<number>(scenarioCase.input.options);
    CircularBufferSubclassRunners.assertLastPushThrows(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    assert.strictEqual(buffer.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.length, 'expected.length'));
    const expectedShiftValues = CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftValues, 'expected.shiftValues');
    assert.deepStrictEqual(CircularBufferSubclassRunners.shiftMany(buffer, expectedShiftValues.length), expectedShiftValues);
  }

  static runThrowingOnShift(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = ThrowingShiftBuffer.create<number>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    assert.throws(() => {
      buffer.shift();
    }, HookInvocationError);
    assert.strictEqual(buffer.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.length, 'expected.length'));
  }

  static async 'async-rejecting-onPush-guarded'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): Promise<void> {
    const buffer = new AsyncRejectingPushBuffer<number>(scenarioCase.input.options, RuntimeError.create('async onPush boom'));
    let unhandledRejectionCount = 0;
    const onUnhandledRejection = (): void => {
      unhandledRejectionCount += 1;
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      CircularBufferSubclassRunners.applyAsyncOperations(buffer, CircularBufferSubclassRunners.requireDefined(scenarioCase.input.asyncOperations, 'input.asyncOperations'));
      assert.strictEqual(buffer.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.length, 'expected.length'));
      for (let index = 0; index < CircularBufferSubclassRunners.requireDefined(scenarioCase.input.flushTurns, 'input.flushTurns'); index += 1) {
        await CircularBufferSubclassRunners.waitImmediate();
      }
      assert.strictEqual(unhandledRejectionCount, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.rejectionCount, 'expected.rejectionCount'));
      const expectedShiftValues = CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.shiftValues, 'expected.shiftValues');
      assert.deepStrictEqual(CircularBufferSubclassRunners.shiftMany(buffer, expectedShiftValues.length), expectedShiftValues);
      assert.strictEqual(buffer.recordedHookErrors.length >= CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.minHookErrors, 'expected.minHookErrors'), true);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static runSubclassProtectedState(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = InspectBuffer.create<number, InspectBuffer<number>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    buffer.shift();
    assert.deepStrictEqual(buffer.inspect(), CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.state, 'expected.state'));
  }

  static runReentrantShift(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = ReentrantShiftBuffer.create<number, ReentrantShiftBuffer<number>>(scenarioCase.input.options);
    CircularBufferSubclassRunners.pushAll(buffer, CircularBufferSubclassRunners.requireNumberItems(scenarioCase));
    assert.strictEqual(buffer.shift(), CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.firstShift, 'expected.firstShift'));
    assert.ok(buffer.reentrantError instanceof ReentrantHookInvocationError);
    assert.strictEqual(buffer.length, CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.length, 'expected.length'));
    assert.strictEqual(buffer.shift(), CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.secondShift, 'expected.secondShift'));
  }

  static runReentrantGrow(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void {
    const buffer = ReentrantGrowBuffer.create<number, ReentrantGrowBuffer<number>>(scenarioCase.input.options);
    const pushItems = CircularBufferSubclassRunners.requireNumberItems(scenarioCase);
    const pushStageCounts = CircularBufferSubclassRunners.requireDefined(scenarioCase.input.batch?.pushStageCounts, 'input.batch.pushStageCounts');
    const firstStageCount = CircularBufferSubclassRunners.requireDefined(pushStageCounts[0], 'input.batch.pushStageCounts[0]');
    const secondStageCount = CircularBufferSubclassRunners.requireDefined(pushStageCounts[1], 'input.batch.pushStageCounts[1]');
    const thirdStageCount = CircularBufferSubclassRunners.requireDefined(pushStageCounts[2], 'input.batch.pushStageCounts[2]');

    let nextIndex = CircularBufferSubclassRunners.pushStage(buffer, pushItems, 0, firstStageCount);
    assert.ok(buffer.reentrantError instanceof ReentrantHookInvocationError);
    const firstShiftValues = CircularBufferSubclassRunners.requireDefined(scenarioCase.expected.firstShiftValues, 'expected.firstShiftValues');
    assert.deepStrictEqual(CircularBufferSubclassRunners.shiftMany(buffer, firstShiftValues.length), firstShiftValues);
    nextIndex = CircularBufferSubclassRunners.pushStage(buffer, pushItems, nextIndex, secondStageCount);
    assert.deepStrictEqual(buffer.growLog.map((entry) => {return entry.oldCapacity;}), scenarioCase.expected.growOldCapacitiesFirst);
    CircularBufferSubclassRunners.pushStage(buffer, pushItems, nextIndex, thirdStageCount);
    assert.deepStrictEqual(buffer.growLog.map((entry) => {return entry.oldCapacity;}), scenarioCase.expected.growOldCapacitiesSecond);
  }

  static 'base-class-operates-correctly-after-grow'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runBaseClassAfterGrow(scenarioCase); }
  static 'create-returns-subclass'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runCreateReturnsSubclass(scenarioCase); }
  static 'full-trace-grow'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runFullTraceGrow(scenarioCase); }
  static 'full-trace-overwrite'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runFullTraceOverwrite(scenarioCase); }
  static 'grow-mode-all-hooks-active'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runGrowModeAllHooksActive(scenarioCase); }
  static 'onEvict-called-with-evicted-item'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runEvictLog(scenarioCase); }
  static 'onEvict-not-called-below-capacity'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runEvictLog(scenarioCase); }
  static 'onEvict-receives-items-FIFO'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runEvictLog(scenarioCase); }
  static 'onEvict-receives-oldest-item'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runEvictLog(scenarioCase); }
  static 'onGrow-called-once-per-grow-event'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runGrowLog(scenarioCase); }
  static 'onGrow-called-when-capacity-exceeded'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runGrowLog(scenarioCase); }
  static 'onGrow-not-called-in-overwrite-mode'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runGrowLog(scenarioCase); }
  static 'onGrow-receives-correct-old-new-capacity'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runGrowLog(scenarioCase); }
  static 'onPush-called-on-each-overwrite-push'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runPushCount(scenarioCase); }
  static 'onPush-called-on-each-push'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runPushCount(scenarioCase); }
  static 'onPush-called-on-grow-trigger'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runPushCount(scenarioCase); }
  static 'onPush-length-already-incremented'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runPushLengthAlreadyIncremented(scenarioCase); }
  static 'onShift-called-with-items-before-returned'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runShiftAllLog(scenarioCase); }
  static 'onShift-not-called-when-empty'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runShiftEmpty(scenarioCase); }
  static 'onShift-receives-correct-item'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runShiftExpectedLogCount(scenarioCase); }
  static 'onShift-return-value-matches-log'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runShiftReturnMatchesLog(scenarioCase); }
  static 'reentrant-grow-throws-and-does-not-double-resize'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runReentrantGrow(scenarioCase); }
  static 'reentrant-shift-throws'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runReentrantShift(scenarioCase); }
  static 'subclass-can-read-protected-state'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runSubclassProtectedState(scenarioCase); }
  static 'throwing-onEvict'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runThrowingOnEvict(scenarioCase); }
  static 'throwing-onGrow'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runThrowingOnGrow(scenarioCase); }
  static 'throwing-onOverflow'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runThrowingOnOverflow(scenarioCase); }
  static 'throwing-onPush'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runThrowingOnPush(scenarioCase); }
  static 'throwing-onShift'(scenarioCase: CircularBufferSubclassScenarioCaseEntity.Type): void { CircularBufferSubclassRunners.runThrowingOnShift(scenarioCase); }
}


ScenarioSuite.register({
  'entity': CircularBufferSubclassScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'CircularBuffer subclass',
  'runners': CircularBufferSubclassRunners
});
