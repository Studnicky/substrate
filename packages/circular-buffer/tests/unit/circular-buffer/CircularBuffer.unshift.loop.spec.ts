import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';
import { CircularBufferUnshiftScenarioCaseEntity } from '../entities/CircularBufferUnshiftScenarioCaseEntity.js';
import scenarioGroups from './CircularBuffer.unshift.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(CircularBufferUnshiftScenarioCaseEntity.Schema, CircularBufferUnshiftScenarioCaseEntity.Node);

type ScenarioCase = CircularBufferUnshiftScenarioCaseEntity.Type;
type ScenarioShape = ScenarioCase['shape'];

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

class GrowLogBuffer<T> extends CircularBuffer<T> {
  readonly growLog: Array<{ oldCapacity: number; newCapacity: number }> = [];

  override onGrow(oldCapacity: number, newCapacity: number): void {
    this.growLog.push({ oldCapacity, newCapacity });
  }
}

class PushCountBuffer<T> extends CircularBuffer<T> {
  pushCount = 0;

  override onPush(_item: T): void {
    this.pushCount++;
  }
}

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

const requireExpectedNumber = (scenarioCase: ScenarioCase, name: 'length' | 'newCapacity' | 'oldCapacity' | 'pushCount'): number => {
  const value = scenarioCase.expected[name];
  assert.equal(typeof value, 'number', `${scenarioCase.name} must define expected.${name}`);
  return value ?? 0;
};

const requireShiftedArray = (scenarioCase: ScenarioCase): readonly (number | string)[] => {
  const { shifted } = scenarioCase.expected;
  assert.ok(Array.isArray(shifted), `${scenarioCase.name} must define expected.shifted as an array`);
  return shifted;
};

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'grow-mode-unshift-fires-onGrow': (scenario) => {
    const buf = GrowLogBuffer.create<number, GrowLogBuffer<number>>(scenario.input.options);
    buf.push(1);
    buf.push(2);
    buf.unshift(0);

    assert.strictEqual(buf.growLog.length, 1);
    assert.strictEqual(buf.growLog[0]?.oldCapacity, requireExpectedNumber(scenario, 'oldCapacity'));
    assert.strictEqual(buf.growLog[0]?.newCapacity, requireExpectedNumber(scenario, 'newCapacity'));
  },
  'grow-mode-unshift-grows': (scenario) => {
    const buf = CircularBuffer.create<number>(scenario.input.options);
    buf.push(1);
    buf.push(2);
    buf.unshift(0);
    assert.equal(buf.length, requireExpectedNumber(scenario, 'length'));
    assert.deepEqual([buf.shift(), buf.shift(), buf.shift()], requireShiftedArray(scenario));
  },
  'interleaved-wraparound-order': (scenario) => {
    const buf = CircularBuffer.create<number>(scenario.input.options);
    buf.push(1);
    buf.push(2);
    assert.equal(buf.shift(), 1);
    buf.unshift(0);
    buf.push(3);
    buf.unshift(-1);
    const result: number[] = [];
    while (buf.length > 0) {
      const value = buf.shift();
      if (value !== undefined) result.push(value);
    }
    assert.deepEqual(result, requireShiftedArray(scenario));
  },
  'mixed-push-unshift-shift-order': (scenario) => {
    const buf = CircularBuffer.create<string>(scenario.input.options);
    buf.push('A');
    buf.push('B');
    buf.unshift('C');
    const shifted = requireShiftedArray(scenario);
    assert.equal(buf.shift(), shifted[0]);
    assert.equal(buf.shift(), shifted[1]);
    assert.equal(buf.shift(), shifted[2]);
  },
  'multiple-unshifts-reverse-order': (scenario) => {
    const buf = CircularBuffer.create<number>(scenario.input.options);
    buf.push(3);
    buf.unshift(2);
    buf.unshift(1);
    buf.unshift(0);
    const result: number[] = [];
    while (buf.length > 0) {
      const value = buf.shift();
      if (value !== undefined) result.push(value);
    }
    assert.deepEqual(result, requireShiftedArray(scenario));
  },
  'onPush-fires-for-unshift': (scenario) => {
    const buf = PushCountBuffer.create<number, PushCountBuffer<number>>(scenario.input.options);
    buf.push(1);
    buf.unshift(0);
    assert.strictEqual(buf.pushCount, requireExpectedNumber(scenario, 'pushCount'));
  },
  'overwrite-mode-unshift-evicts-tail': (scenario) => {
    const buf = CircularBuffer.create<number>(scenario.input.options);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.unshift(0);
    assert.equal(buf.length, requireExpectedNumber(scenario, 'length'));
    assert.deepEqual([buf.shift(), buf.shift(), buf.shift()], requireShiftedArray(scenario));
  },
  'overwrite-mode-unshift-fires-hooks': (scenario) => {
    const buf = TraceBuffer.create<number, TraceBuffer<number>>(scenario.input.options);
    buf.push(1);
    buf.push(2);
    buf.unshift(0);

    assert.deepEqual(buf.overflowLog, scenario.expected.overflowLog);
    assert.deepEqual(buf.evictLog, scenario.expected.evictLog);
  },
  'unshift-adds-item': (scenario) => {
    const buf = CircularBuffer.create<number>(scenario.input.options);
    buf.unshift(1);
    assert.equal(buf.length, requireExpectedNumber(scenario, 'length'));
  },
  'unshift-empty-then-shift': (scenario) => {
    const buf = CircularBuffer.create<number>(scenario.input.options);
    buf.unshift(1);
    assert.equal(buf.shift(), scenario.expected.shifted);
    assert.equal(buf.length, requireExpectedNumber(scenario, 'length'));
  },
  'unshift-then-shift-order': (scenario) => {
    const buf = CircularBuffer.create<number>(scenario.input.options);
    buf.push(1);
    buf.push(2);
    buf.unshift(0);
    assert.deepEqual([buf.shift(), buf.shift(), buf.shift()], requireShiftedArray(scenario));
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('CircularBuffer unshift', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
