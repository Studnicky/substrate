import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';
import type { CircularBufferOptionsEntity } from '../../../src/entities/CircularBufferOptionsEntity.js';

import scenarioGroups from './CircularBuffer.unshift.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: { length: number };
      input: { options: CircularBufferOptionsEntity.Type };
      shape: 'unshift-adds-item';
      name: string;
    }
  | {
      description: string;
      expected: { length: number; shifted: number };
      input: { options: CircularBufferOptionsEntity.Type };
      shape: 'unshift-empty-then-shift';
      name: string;
    }
  | {
      description: string;
      expected: { shifted: number[] };
      input: { options: CircularBufferOptionsEntity.Type };
      shape: 'unshift-then-shift-order';
      name: string;
    }
  | {
      description: string;
      expected: { shifted: number[] };
      input: { options: CircularBufferOptionsEntity.Type };
      shape: 'multiple-unshifts-reverse-order';
      name: string;
    }
  | {
      description: string;
      expected: { length: number; shifted: number[] };
      input: { options: CircularBufferOptionsEntity.Type };
      shape: 'overwrite-mode-unshift-evicts-tail';
      name: string;
    }
  | {
      description: string;
      expected: { evictLog: number[]; overflowLog: number[] };
      input: { options: CircularBufferOptionsEntity.Type };
      shape: 'overwrite-mode-unshift-fires-hooks';
      name: string;
    }
  | {
      description: string;
      expected: { length: number; shifted: number[] };
      input: { options: CircularBufferOptionsEntity.Type };
      shape: 'grow-mode-unshift-grows';
      name: string;
    }
  | {
      description: string;
      expected: { newCapacity: number; oldCapacity: number };
      input: { options: CircularBufferOptionsEntity.Type };
      shape: 'grow-mode-unshift-fires-onGrow';
      name: string;
    }
  | {
      description: string;
      expected: { pushCount: number };
      input: { options: CircularBufferOptionsEntity.Type };
      shape: 'onPush-fires-for-unshift';
      name: string;
    }
  | {
      description: string;
      expected: { shifted: string[] };
      input: { options: CircularBufferOptionsEntity.Type };
      shape: 'mixed-push-unshift-shift-order';
      name: string;
    }
  | {
      description: string;
      expected: { shifted: number[] };
      input: { options: CircularBufferOptionsEntity.Type };
      shape: 'interleaved-wraparound-order';
      name: string;
    };

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const runnerMap: Record<ScenarioCase['shape'], (scenario: ScenarioCase) => void> = {
    'grow-mode-unshift-fires-onGrow': (scenario) => {
      class GrowLogBuffer<T> extends CircularBuffer<T> {
        readonly growLog: Array<{ oldCapacity: number; newCapacity: number }> = [];

        override onGrow(oldCapacity: number, newCapacity: number): void {
          this.growLog.push({ oldCapacity, newCapacity });
        }
      }

      const buf = GrowLogBuffer.create<number>(scenario.input.options);
      buf.push(1);
      buf.push(2);
      buf.unshift(0);

      assert.strictEqual(buf.growLog.length, 1);
      assert.strictEqual(buf.growLog[0]?.oldCapacity, scenario.expected.oldCapacity);
      assert.strictEqual(buf.growLog[0]?.newCapacity, scenario.expected.newCapacity);
    },
    'grow-mode-unshift-grows': (scenario) => {
      const buf = CircularBuffer.create<number>(scenario.input.options);
      buf.push(1);
      buf.push(2);
      buf.unshift(0);
      assert.equal(buf.length, scenario.expected.length);
      assert.deepEqual([buf.shift(), buf.shift(), buf.shift()], scenario.expected.shifted);
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
      assert.deepEqual(result, scenario.expected.shifted);
    },
    'mixed-push-unshift-shift-order': (scenario) => {
      const buf = CircularBuffer.create<string>(scenario.input.options);
      buf.push('A');
      buf.push('B');
      buf.unshift('C');
      assert.equal(buf.shift(), scenario.expected.shifted[0]);
      assert.equal(buf.shift(), scenario.expected.shifted[1]);
      assert.equal(buf.shift(), scenario.expected.shifted[2]);
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
      assert.deepEqual(result, scenario.expected.shifted);
    },
    'onPush-fires-for-unshift': (scenario) => {
      class PushCountBuffer<T> extends CircularBuffer<T> {
        pushCount = 0;

        override onPush(_item: T): void {
          this.pushCount++;
        }
      }

      const buf = PushCountBuffer.create<number>(scenario.input.options);
      buf.push(1);
      buf.unshift(0);
      assert.strictEqual(buf.pushCount, scenario.expected.pushCount);
    },
    'overwrite-mode-unshift-evicts-tail': (scenario) => {
      const buf = CircularBuffer.create<number>(scenario.input.options);
      buf.push(1);
      buf.push(2);
      buf.push(3);
      buf.unshift(0);
      assert.equal(buf.length, scenario.expected.length);
      assert.deepEqual([buf.shift(), buf.shift(), buf.shift()], scenario.expected.shifted);
    },
    'overwrite-mode-unshift-fires-hooks': (scenario) => {
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

      const buf = TraceBuffer.create<number>(scenario.input.options);
      buf.push(1);
      buf.push(2);
      buf.unshift(0);

      assert.deepEqual(buf.overflowLog, scenario.expected.overflowLog);
      assert.deepEqual(buf.evictLog, scenario.expected.evictLog);
    },
    'unshift-adds-item': (scenario) => {
      const buf = CircularBuffer.create<number>(scenario.input.options);
      buf.unshift(1);
      assert.equal(buf.length, scenario.expected.length);
    },
    'unshift-empty-then-shift': (scenario) => {
      const buf = CircularBuffer.create<number>(scenario.input.options);
      buf.unshift(1);
      assert.equal(buf.shift(), scenario.expected.shifted);
      assert.equal(buf.length, scenario.expected.length);
    },
    'unshift-then-shift-order': (scenario) => {
      const buf = CircularBuffer.create<number>(scenario.input.options);
      buf.push(1);
      buf.push(2);
      buf.unshift(0);
      assert.deepEqual([buf.shift(), buf.shift(), buf.shift()], scenario.expected.shifted);
    }
  };

  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('CircularBuffer unshift', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
