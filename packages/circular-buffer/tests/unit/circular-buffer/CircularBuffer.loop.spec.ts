import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';
import { CircularBufferScenarioCaseEntity } from '../entities/CircularBufferScenarioCaseEntity.js';
import scenarioGroups from './CircularBuffer.scenarios.json' with { 'type': 'json' };

class GrowOperationResults {
  public readonly allShifted: number[];
  public readonly finalDrained: number[];
  public readonly lengthBeforeDrain: number;

  public constructor(allShifted: number[], finalDrained: number[], lengthBeforeDrain: number) {
    this.allShifted = allShifted;
    this.finalDrained = finalDrained;
    this.lengthBeforeDrain = lengthBeforeDrain;
  }
}

class CircularBufferRunners {
  static requireBatch(
    scenarioCase: CircularBufferScenarioCaseEntity.Type
  ): NonNullable<CircularBufferScenarioCaseEntity.Type['input']['batch']> {
    const batch = scenarioCase.input.batch;
    if (batch === undefined) {
      throw RuntimeError.create(`${scenarioCase.name} must define input.batch`);
    }
    return batch;
  }

  static requireExpectedRecord(scenarioCase: CircularBufferScenarioCaseEntity.Type): Record<string, unknown> {
    const result = ScenarioValues.requireRecord(scenarioCase.expected, 'expected');
    return result;
  }

  static requireExpectedNumber(scenarioCase: CircularBufferScenarioCaseEntity.Type, propertyName: string): number {
    const expected = CircularBufferRunners.requireExpectedRecord(scenarioCase);
    const result = ScenarioValues.requireNumber(Reflect.get(expected, propertyName), `expected.${propertyName}`);
    return result;
  }

  static requireExpectedBoolean(scenarioCase: CircularBufferScenarioCaseEntity.Type, propertyName: string): boolean {
    const expected = CircularBufferRunners.requireExpectedRecord(scenarioCase);
    const value = Reflect.get(expected, propertyName);
    if (typeof value !== 'boolean') {
      throw RuntimeError.create(`expected.${propertyName} must be a boolean`);
    }
    return value;
  }

  static requireExpectedNumberArray(scenarioCase: CircularBufferScenarioCaseEntity.Type, propertyName: string): number[] {
    const expected = CircularBufferRunners.requireExpectedRecord(scenarioCase);
    const rawValues = ScenarioValues.requireArray(Reflect.get(expected, propertyName), `expected.${propertyName}`);
    const values: number[] = [];
    for (let index = 0; index < rawValues.length; index += 1) {
      values.push(ScenarioValues.requireNumber(rawValues[index], `expected.${propertyName}[${index}]`));
    }
    return values;
  }

  static requireExpectedArray(scenarioCase: CircularBufferScenarioCaseEntity.Type): number[] {
    const rawValues = ScenarioValues.requireArray(scenarioCase.expected, 'expected');
    const values: number[] = [];
    for (let index = 0; index < rawValues.length; index += 1) {
      values.push(ScenarioValues.requireNumber(rawValues[index], `expected[${index}]`));
    }
    return values;
  }

  static requireBatchItemCount(scenarioCase: CircularBufferScenarioCaseEntity.Type): number {
    const batch = CircularBufferRunners.requireBatch(scenarioCase);
    const result = ScenarioValues.requireInteger(batch.itemCount, 'input.batch.itemCount');
    return result;
  }

  static requireBatchItems(scenarioCase: CircularBufferScenarioCaseEntity.Type): number[] {
    const batch = CircularBufferRunners.requireBatch(scenarioCase);
    const rawItems = ScenarioValues.requireArray(batch.items, 'input.batch.items');
    const items: number[] = [];
    for (let index = 0; index < rawItems.length; index += 1) {
      items.push(ScenarioValues.requireNumber(rawItems[index], `input.batch.items[${index}]`));
    }
    return items;
  }

  static pushAll(buffer: CircularBuffer<number>, items: readonly number[]): void {
    for (let index = 0; index < items.length; index += 1) {
      buffer.push(items[index]!);
    }
  }

  static drain(buffer: CircularBuffer<number>): number[] {
    const values: number[] = [];
    while (buffer.length > 0) {
      const value = buffer.shift();
      if (value !== undefined) {
        values.push(value);
      }
    }
    return values;
  }

  static applyPushOperation(buffer: CircularBuffer<number>, count: number, startValue: number): number {
    let nextValue = startValue;
    for (let index = 0; index < count; index += 1) {
      buffer.push(nextValue);
      nextValue += 1;
    }
    return nextValue;
  }

  static applyShiftOperation(buffer: CircularBuffer<number>, count: number, allShifted: number[]): void {
    for (let index = 0; index < count; index += 1) {
      const value = buffer.shift();
      if (value !== undefined) {
        allShifted.push(value);
      }
    }
  }

  static drainOperation(buffer: CircularBuffer<number>, allShifted: number[]): number[] {
    const drained: number[] = [];
    while (buffer.length > 0) {
      const value = buffer.shift();
      if (value !== undefined) {
        drained.push(value);
        allShifted.push(value);
      }
    }
    return drained;
  }

  static runGrowOperations(
    buffer: CircularBuffer<number>,
    scenarioCase: CircularBufferScenarioCaseEntity.Type
  ): GrowOperationResults {
    const batch = CircularBufferRunners.requireBatch(scenarioCase);
    const operations = batch.operations;
    if (operations === undefined) {
      throw RuntimeError.create('input.batch.operations is required');
    }
    let nextValue = batch.startValue ?? 0;
    const allShifted: number[] = [];
    let finalDrained: number[] = [];
    let lengthBeforeDrain = buffer.length;
    for (let index = 0; index < operations.length; index += 1) {
      const operation = operations[index]!;
      if ('push' in operation) {
        nextValue = CircularBufferRunners.applyPushOperation(buffer, operation.push, nextValue);
        lengthBeforeDrain = buffer.length;
        continue;
      }
      if ('shift' in operation) {
        CircularBufferRunners.applyShiftOperation(buffer, operation.shift, allShifted);
        lengthBeforeDrain = buffer.length;
        continue;
      }
      finalDrained = CircularBufferRunners.drainOperation(buffer, allShifted);
    }
    const result = new GrowOperationResults(allShifted, finalDrained, lengthBeforeDrain);
    return result;
  }

  static assertConstructionEmpty(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    assert.equal(buffer.length, 0);
  }

  static assertPushLength(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    const itemCount = CircularBufferRunners.requireBatchItemCount(scenarioCase);
    for (let index = 0; index < itemCount; index += 1) {
      buffer.push(index);
    }
    assert.equal(buffer.length, CircularBufferRunners.requireExpectedNumber(scenarioCase, 'length'));
  }

  static assertEmptyShiftValue(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    const expected = CircularBufferRunners.requireExpectedRecord(scenarioCase);
    const expectedValue = Reflect.get(expected, 'value');
    assert.equal(expectedValue, null);
    assert.equal(buffer.shift(), undefined);
  }

  static 'capacity-one-cycling'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<string>(scenarioCase.input.options);
    buffer.push('A');
    assert.equal(buffer.shift(), 'A');
    buffer.push('B');
    assert.equal(buffer.shift(), 'B');
    assert.equal(buffer.length, 0);
  }

  static 'capacity-two-cycling'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(10);
    buffer.push(20);
    assert.equal(buffer.shift(), 10);
    buffer.push(30);
    assert.equal(buffer.shift(), 20);
    assert.equal(buffer.shift(), 30);
    assert.equal(buffer.length, 0);
  }

  static 'construction-capacity-one-empty'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    CircularBufferRunners.assertConstructionEmpty(scenarioCase);
  }

  static 'construction-custom-capacity-empty'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    CircularBufferRunners.assertConstructionEmpty(scenarioCase);
  }

  static 'construction-default-empty'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    CircularBufferRunners.assertConstructionEmpty(scenarioCase);
  }

  static 'construction-invalid-capacity'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const expected = CircularBufferRunners.requireExpectedRecord(scenarioCase);
    assert.throws(() => { CircularBuffer.create<number>(scenarioCase.input.options); }, {
      'message': ScenarioValues.requireString(Reflect.get(expected, 'message'), 'expected.message')
    });
  }

  static 'fifo-order'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    CircularBufferRunners.pushAll(buffer, CircularBufferRunners.requireBatchItems(scenarioCase));
    assert.deepEqual(CircularBufferRunners.drain(buffer), CircularBufferRunners.requireExpectedArray(scenarioCase));
  }

  static 'grow-head-wraparound'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    const results = CircularBufferRunners.runGrowOperations(buffer, scenarioCase);
    assert.deepEqual(results.finalDrained, CircularBufferRunners.requireExpectedNumberArray(scenarioCase, 'drained'));
  }

  static 'grow-multiple-cycles-preserves-order'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    const batch = CircularBufferRunners.requireBatch(scenarioCase);
    const itemCount = ScenarioValues.requireInteger(batch.itemCount, 'input.batch.itemCount');
    const shiftEveryNth = ScenarioValues.requireInteger(batch.shiftEveryNth, 'input.batch.shiftEveryNth');
    const pushed: number[] = [];
    const shifted: number[] = [];
    for (let index = 0; index < itemCount; index += 1) {
      buffer.push(index);
      pushed.push(index);
      if (index % shiftEveryNth === 0) {
        const value = buffer.shift();
        if (value !== undefined) {
          shifted.push(value);
        }
      }
    }
    while (buffer.length > 0) {
      const value = buffer.shift();
      if (value !== undefined) {
        shifted.push(value);
      }
    }
    const preservesOrder = shifted.every((value, index) => {
      const result = value === pushed[index];
      return result;
    }) && shifted.length === pushed.length;
    assert.equal(preservesOrder, CircularBufferRunners.requireExpectedBoolean(scenarioCase, 'shiftedMatchesPushed'));
    assert.deepEqual(shifted, pushed);
  }

  static 'grow-order-preserved-after-grow'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    assert.equal(buffer.shift(), 1);
    assert.equal(buffer.shift(), 2);
    assert.equal(buffer.shift(), 3);
  }

  static 'grow-past-capacity'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    const results = CircularBufferRunners.runGrowOperations(buffer, scenarioCase);
    assert.equal(results.lengthBeforeDrain, CircularBufferRunners.requireExpectedNumber(scenarioCase, 'length'));
    assert.deepEqual(results.finalDrained, CircularBufferRunners.requireExpectedNumberArray(scenarioCase, 'drained'));
  }

  static 'grow-preserves-items-head-not-zero'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    const results = CircularBufferRunners.runGrowOperations(buffer, scenarioCase);
    assert.equal(results.lengthBeforeDrain, CircularBufferRunners.requireExpectedNumber(scenarioCase, 'length'));
    assert.deepEqual(results.finalDrained, CircularBufferRunners.requireExpectedNumberArray(scenarioCase, 'drained'));
  }

  static 'grow-wraparound-order'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    const results = CircularBufferRunners.runGrowOperations(buffer, scenarioCase);
    assert.deepEqual(results.allShifted, CircularBufferRunners.requireExpectedNumberArray(scenarioCase, 'drained'));
  }

  static 'length-reflects-count-not-capacity'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    assert.equal(buffer.length, 2);
  }

  static 'non-primitive-values'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<{ 'id': number }>(scenarioCase.input.options);
    const first = { 'id': 1 };
    const second = { 'id': 2 };
    buffer.push(first);
    buffer.push(second);
    const preservesIdentity = buffer.shift() === first && buffer.shift() === second;
    assert.equal(preservesIdentity, CircularBufferRunners.requireExpectedBoolean(scenarioCase, 'preservedIdentity'));
  }

  static 'overwrite-capacity-one-holds-last'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    assert.equal(buffer.length, 1);
    assert.equal(buffer.shift(), 3);
  }

  static 'overwrite-fifo-after-multiple-evictions'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    for (let index = 1; index <= 7; index += 1) {
      buffer.push(index);
    }
    assert.equal(buffer.length, 3);
    assert.equal(buffer.shift(), 5);
    assert.equal(buffer.shift(), 6);
    assert.equal(buffer.shift(), 7);
  }

  static 'overwrite-length-stays-at-capacity'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    for (let index = 0; index < 10; index += 1) {
      buffer.push(index);
    }
    assert.equal(buffer.length, 4);
  }

  static 'overwrite-oldest-evicted'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);
    assert.equal(buffer.length, 3);
    assert.equal(buffer.shift(), 2);
    assert.equal(buffer.shift(), 3);
    assert.equal(buffer.shift(), 4);
  }

  static 'push-after-shift-order'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    buffer.shift();
    buffer.push(3);
    assert.equal(buffer.shift(), 2);
    assert.equal(buffer.shift(), 3);
  }

  static 'push-increments-length'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    const expectedLengths = CircularBufferRunners.requireExpectedNumberArray(scenarioCase, 'lengths');
    const observed: number[] = [];
    for (let index = 0; index < expectedLengths.length; index += 1) {
      buffer.push(index + 1);
      observed.push(buffer.length);
    }
    assert.deepEqual(observed, expectedLengths);
  }

  static 'push-length-grow'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    CircularBufferRunners.assertPushLength(scenarioCase);
  }

  static 'push-length-overwrite'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    CircularBufferRunners.assertPushLength(scenarioCase);
  }

  static 'push-shift-cycling'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    assert.equal(buffer.shift(), 1);
    buffer.push(3);
    buffer.push(4);
    assert.equal(buffer.shift(), 2);
    assert.equal(buffer.shift(), 3);
    assert.equal(buffer.shift(), 4);
  }

  static 'push-then-shift-then-push-again'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.shift();
    buffer.push(2);
    assert.equal(buffer.length, 1);
    assert.equal(buffer.shift(), 2);
  }

  static 'shift-after-all-items-returns-undefined'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.shift();
    CircularBufferRunners.assertEmptyShiftValue(scenarioCase);
  }

  static 'shift-empty-does-not-throw'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    assert.doesNotThrow(() => { buffer.shift(); });
  }

  static 'shift-empty-returns-undefined'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    CircularBufferRunners.assertEmptyShiftValue(scenarioCase);
  }

  static 'shift-empty-successive-returns-undefined'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    const expected = CircularBufferRunners.requireExpectedRecord(scenarioCase);
    const shifts = ScenarioValues.requireArray(Reflect.get(expected, 'shifts'), 'expected.shifts');
    assert.equal(shifts.length, 3);
    for (let index = 0; index < shifts.length; index += 1) {
      assert.equal(shifts[index], null);
      assert.equal(buffer.shift(), undefined);
    }
  }

  static 'shift-first-item-and-decrements-length'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(42);
    buffer.push(99);
    assert.equal(buffer.shift(), 42);
    assert.equal(buffer.length, 1);
  }

  static 'shift-only-item-and-leaves-empty'(scenarioCase: CircularBufferScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(7);
    assert.equal(buffer.shift(), 7);
    assert.equal(buffer.length, 0);
  }
}

ScenarioSuite.register({
  'entity': CircularBufferScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'CircularBuffer core',
  'runners': CircularBufferRunners
});
