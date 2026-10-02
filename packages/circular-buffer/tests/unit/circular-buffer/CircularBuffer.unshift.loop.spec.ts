import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';
import { CircularBufferUnshiftScenarioCaseEntity } from '../entities/CircularBufferUnshiftScenarioCaseEntity.js';
import { GrowLogBuffer } from '../helpers/GrowLogBuffer.js';
import { PushCountBuffer } from '../helpers/PushCountBuffer.js';
import scenarioGroups from './CircularBuffer.unshift.scenarios.json' with { 'type': 'json' };

class TraceBuffer<T> extends CircularBuffer<T> {
  readonly overflowLog: T[] = [];
  readonly evictLog: T[] = [];

  override onOverflow(item: T): void {
    this.overflowLog.push(item);
  }

  override onEvict(item: T): void {
    this.evictLog.push(item);
  }
}

class CircularBufferUnshiftRunners {
  static requireExpectedNumber(
    scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type,
    propertyName: string
  ): number {
    const expected = ScenarioValues.requireRecord(scenarioCase.expected, 'expected');
    const value = Reflect.get(expected, propertyName);
    const result = ScenarioValues.requireNumber(value, `expected.${propertyName}`);
    return result;
  }

  static requireShiftedArray(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): readonly unknown[] {
    const expected = ScenarioValues.requireRecord(scenarioCase.expected, 'expected');
    const shifted = Reflect.get(expected, 'shifted');
    const result = ScenarioValues.requireArray(shifted, 'expected.shifted');
    return result;
  }

  static 'grow-mode-unshift-fires-onGrow'(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): void {
    const buffer = GrowLogBuffer.create<number, GrowLogBuffer<number>>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    buffer.unshift(0);

    assert.equal(buffer.growLog.length, 1);
    assert.equal(buffer.growLog[0]?.oldCapacity, CircularBufferUnshiftRunners.requireExpectedNumber(scenarioCase, 'oldCapacity'));
    assert.equal(buffer.growLog[0]?.newCapacity, CircularBufferUnshiftRunners.requireExpectedNumber(scenarioCase, 'newCapacity'));
  }

  static 'grow-mode-unshift-grows'(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    buffer.unshift(0);
    assert.equal(buffer.length, CircularBufferUnshiftRunners.requireExpectedNumber(scenarioCase, 'length'));
    assert.deepEqual([buffer.shift(), buffer.shift(), buffer.shift()], CircularBufferUnshiftRunners.requireShiftedArray(scenarioCase));
  }

  static 'interleaved-wraparound-order'(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    assert.equal(buffer.shift(), 1);
    buffer.unshift(0);
    buffer.push(3);
    buffer.unshift(-1);
    const result: number[] = [];
    while (buffer.length > 0) {
      const value = buffer.shift();
      if (value !== undefined) {
        result.push(value);
      }
    }
    assert.deepEqual(result, CircularBufferUnshiftRunners.requireShiftedArray(scenarioCase));
  }

  static 'mixed-push-unshift-shift-order'(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<string>(scenarioCase.input.options);
    buffer.push('A');
    buffer.push('B');
    buffer.unshift('C');
    const shifted = CircularBufferUnshiftRunners.requireShiftedArray(scenarioCase);
    assert.equal(buffer.shift(), shifted[0]);
    assert.equal(buffer.shift(), shifted[1]);
    assert.equal(buffer.shift(), shifted[2]);
  }

  static 'multiple-unshifts-reverse-order'(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(3);
    buffer.unshift(2);
    buffer.unshift(1);
    buffer.unshift(0);
    const result: number[] = [];
    while (buffer.length > 0) {
      const value = buffer.shift();
      if (value !== undefined) {
        result.push(value);
      }
    }
    assert.deepEqual(result, CircularBufferUnshiftRunners.requireShiftedArray(scenarioCase));
  }

  static 'onPush-fires-for-unshift'(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): void {
    const buffer = PushCountBuffer.create<number, PushCountBuffer<number>>(scenarioCase.input.options);
    buffer.push(1);
    buffer.unshift(0);
    assert.equal(buffer.pushCount, CircularBufferUnshiftRunners.requireExpectedNumber(scenarioCase, 'pushCount'));
  }

  static 'overwrite-mode-unshift-evicts-tail'(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.unshift(0);
    assert.equal(buffer.length, CircularBufferUnshiftRunners.requireExpectedNumber(scenarioCase, 'length'));
    assert.deepEqual([buffer.shift(), buffer.shift(), buffer.shift()], CircularBufferUnshiftRunners.requireShiftedArray(scenarioCase));
  }

  static 'overwrite-mode-unshift-fires-hooks'(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): void {
    const buffer = TraceBuffer.create<number, TraceBuffer<number>>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    buffer.unshift(0);

    const expected = ScenarioValues.requireRecord(scenarioCase.expected, 'expected');
    assert.deepEqual(buffer.overflowLog, ScenarioValues.requireArray(Reflect.get(expected, 'overflowLog'), 'expected.overflowLog'));
    assert.deepEqual(buffer.evictLog, ScenarioValues.requireArray(Reflect.get(expected, 'evictLog'), 'expected.evictLog'));
  }

  static 'unshift-adds-item'(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.unshift(1);
    assert.equal(buffer.length, CircularBufferUnshiftRunners.requireExpectedNumber(scenarioCase, 'length'));
  }

  static 'unshift-empty-then-shift'(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.unshift(1);
    const expected = ScenarioValues.requireRecord(scenarioCase.expected, 'expected');
    assert.equal(buffer.shift(), ScenarioValues.requireNumber(Reflect.get(expected, 'shifted'), 'expected.shifted'));
    assert.equal(buffer.length, CircularBufferUnshiftRunners.requireExpectedNumber(scenarioCase, 'length'));
  }

  static 'unshift-then-shift-order'(scenarioCase: CircularBufferUnshiftScenarioCaseEntity.Type): void {
    const buffer = CircularBuffer.create<number>(scenarioCase.input.options);
    buffer.push(1);
    buffer.push(2);
    buffer.unshift(0);
    assert.deepEqual([buffer.shift(), buffer.shift(), buffer.shift()], CircularBufferUnshiftRunners.requireShiftedArray(scenarioCase));
  }
}

ScenarioSuite.register({
  'entity': CircularBufferUnshiftScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'CircularBuffer unshift',
  'runners': CircularBufferUnshiftRunners
});
