import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';
import type { CircularBufferOptionsEntity } from '../../../src/entities/CircularBufferOptionsEntity.js';
import scenarioGroups from './CircularBuffer.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'capacity-one-cycling'
  | 'capacity-two-cycling'
  | 'construction-capacity-one-empty'
  | 'construction-custom-capacity-empty'
  | 'construction-default-empty'
  | 'construction-invalid-capacity'
  | 'fifo-order'
  | 'grow-head-wraparound'
  | 'grow-multiple-cycles-preserves-order'
  | 'grow-order-preserved-after-grow'
  | 'grow-past-capacity'
  | 'grow-preserves-items-head-not-zero'
  | 'grow-wraparound-order'
  | 'length-reflects-count-not-capacity'
  | 'non-primitive-values'
  | 'overwrite-capacity-one-holds-last'
  | 'overwrite-fifo-after-multiple-evictions'
  | 'overwrite-length-stays-at-capacity'
  | 'overwrite-oldest-evicted'
  | 'push-after-shift-order'
  | 'push-increments-length'
  | 'push-length-grow'
  | 'push-length-overwrite'
  | 'push-shift-cycling'
  | 'push-then-shift-then-push-again'
  | 'shift-after-all-items-returns-undefined'
  | 'shift-empty-does-not-throw'
  | 'shift-empty-returns-undefined'
  | 'shift-empty-successive-returns-undefined'
  | 'shift-first-item-and-decrements-length'
  | 'shift-only-item-and-leaves-empty';

type GrowOperation =
  | { drainAll: true }
  | { push: number }
  | { shift: number };

type BatchInput = {
  itemCount?: number;
  items?: number[];
  operations?: GrowOperation[];
  shiftEveryNth?: number;
  startValue?: number;
};

type ScenarioInput = {
  batch?: BatchInput;
  options: CircularBufferOptionsEntity.Type;
};

type ExpectedObject = {
  drained?: number[];
  length?: number;
  lengths?: number[];
  message?: string;
  preservedIdentity?: boolean;
  shiftedMatchesPushed?: boolean;
  shifts?: readonly [null, null, null];
  value?: null | number;
};

type ScenarioCase = {
  description: string;
  expected?: ExpectedObject | number[];
  input: ScenarioInput;
  shape: ScenarioShape;
  name: string;
};

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

const pushAll = (buf: CircularBuffer<number>, items: number[]): void => {
  for (const item of items) buf.push(item);
};

const drain = (buf: CircularBuffer<number>): number[] => {
  const result: number[] = [];
  while (buf.length > 0) {
    const value = buf.shift();
    if (value !== undefined) result.push(value);
  }
  return result;
};

const requireBatch = (scenarioCase: ScenarioCase): BatchInput => {
  const { batch } = scenarioCase.input;
  assert.ok(batch !== undefined, `${scenarioCase.name} must define input.batch`);
  return batch;
};

/**
 * Drives a `push`/`shift`/`drainAll` operation sequence from `input.batch.operations`
 * against a live buffer, instead of a hardcoded call sequence. Pushed values are
 * sequential integers starting at `batch.startValue` (default 0).
 *
 * Returns three views, since sibling scenarios assert different slices of the same run:
 * - `allShifted` — every value removed by any `shift` or `drainAll` step, in call order
 * - `finalDrained` — only the values removed by the terminal `drainAll` step
 * - `lengthBeforeDrain` — `buf.length` immediately before the terminal `drainAll` step,
 *   matching where these scenarios' `expected.length` checks are taken
 */
const runGrowOperations = (buf: CircularBuffer<number>, scenarioCase: ScenarioCase): { allShifted: number[]; finalDrained: number[]; lengthBeforeDrain: number } => {
  const batch = requireBatch(scenarioCase);
  const { operations } = batch;
  assert.ok(Array.isArray(operations), `${scenarioCase.name} must define input.batch.operations`);
  let counter = batch.startValue ?? 0;
  const allShifted: number[] = [];
  let finalDrained: number[] = [];
  let lengthBeforeDrain = buf.length;
  for (const operation of operations) {
    if ('push' in operation) {
      for (let i = 0; i < operation.push; i++) {
        buf.push(counter);
        counter++;
      }
      lengthBeforeDrain = buf.length;
    } else if ('shift' in operation) {
      for (let i = 0; i < operation.shift; i++) {
        const value = buf.shift();
        if (value !== undefined) allShifted.push(value);
      }
      lengthBeforeDrain = buf.length;
    } else {
      const drained: number[] = [];
      while (buf.length > 0) {
        const value = buf.shift();
        if (value !== undefined) {
          drained.push(value);
          allShifted.push(value);
        }
      }
      finalDrained = drained;
    }
  }
  return { allShifted, finalDrained, lengthBeforeDrain };
};

const requireBatchItemCount = (scenarioCase: ScenarioCase): number => {
  const { itemCount } = requireBatch(scenarioCase);
  assert.ok(typeof itemCount === 'number', `${scenarioCase.name} must define input.batch.itemCount`);
  return itemCount;
};

const requireBatchItems = (scenarioCase: ScenarioCase): number[] => {
  const { items } = requireBatch(scenarioCase);
  assert.ok(Array.isArray(items), `${scenarioCase.name} must define input.batch.items`);
  return items;
};

const requireExpectedObject = (scenarioCase: ScenarioCase): ExpectedObject => {
  const { expected } = scenarioCase;
  assert.ok(expected !== undefined && !Array.isArray(expected), `${scenarioCase.name} must define object expected`);
  return expected;
};

const requireExpectedArray = (scenarioCase: ScenarioCase): number[] => {
  const { expected } = scenarioCase;
  assert.ok(Array.isArray(expected), `${scenarioCase.name} must define array expected`);
  return expected;
};

const requireExpectedDrained = (scenarioCase: ScenarioCase): number[] => {
  const { drained } = requireExpectedObject(scenarioCase);
  assert.ok(Array.isArray(drained), `${scenarioCase.name} must define expected.drained`);
  return drained;
};

const requireExpectedLengths = (scenarioCase: ScenarioCase): number[] => {
  const { lengths } = requireExpectedObject(scenarioCase);
  assert.ok(Array.isArray(lengths), `${scenarioCase.name} must define expected.lengths`);
  return lengths;
};

const requireExpectedFlag = (scenarioCase: ScenarioCase, name: 'preservedIdentity' | 'shiftedMatchesPushed'): boolean => {
  const flag = requireExpectedObject(scenarioCase)[name];
  assert.equal(typeof flag, 'boolean', `${scenarioCase.name} must define expected.${name}`);
  return flag === true;
};

const requireExpectedLength = (scenarioCase: ScenarioCase): number => {
  const { length } = requireExpectedObject(scenarioCase);
  assert.ok(typeof length === 'number', `${scenarioCase.name} must define expected.length`);
  return length;
};

const requireExpectedMessage = (scenarioCase: ScenarioCase): string => {
  const { message } = requireExpectedObject(scenarioCase);
  assert.ok(typeof message === 'string', `${scenarioCase.name} must define expected.message`);
  return message;
};

const requireExpectedShiftValue = (scenarioCase: ScenarioCase): number | undefined => {
  const { value } = requireExpectedObject(scenarioCase);
  assert.ok(value === null || typeof value === 'number', `${scenarioCase.name} must define expected.value`);
  return value === null ? undefined : value;
};

const requireExpectedShifts = (scenarioCase: ScenarioCase): readonly [null, null, null] => {
  const { shifts } = requireExpectedObject(scenarioCase);
  assert.ok(shifts !== undefined, `${scenarioCase.name} must define expected.shifts`);
  return shifts;
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const { shape } = scenarioCase;
  const { options } = scenarioCase.input;

  const assertConstructionEmpty = (): void => {
    const buf = CircularBuffer.create<number>(options);
    assert.equal(buf.length, 0);
  };

  const assertPushLength = (): void => {
    const buf = CircularBuffer.create<number>(options);
    for (let i = 0; i < requireBatchItemCount(scenarioCase); i++) buf.push(i);
    assert.equal(buf.length, requireExpectedLength(scenarioCase));
  };

  const assertEmptyShiftValue = (): void => {
    const buf = CircularBuffer.create<number>(options);
    assert.equal(buf.shift(), requireExpectedShiftValue(scenarioCase));
  };

  const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
    'capacity-one-cycling': () => {
      const buf = CircularBuffer.create<string>(options);
      buf.push('A');
      assert.equal(buf.shift(), 'A');
      buf.push('B');
      assert.equal(buf.shift(), 'B');
      assert.equal(buf.length, 0);
    },
    'capacity-two-cycling': () => {
      const buf = CircularBuffer.create<number>(options);
      buf.push(10);
      buf.push(20);
      assert.equal(buf.shift(), 10);
      buf.push(30);
      assert.equal(buf.shift(), 20);
      assert.equal(buf.shift(), 30);
      assert.equal(buf.length, 0);
    },
    'construction-capacity-one-empty': assertConstructionEmpty,
    'construction-custom-capacity-empty': assertConstructionEmpty,
    'construction-default-empty': assertConstructionEmpty,
    'construction-invalid-capacity': () => {
      assert.throws(() => {
        CircularBuffer.create<number>(options);
      }, { message: requireExpectedMessage(scenarioCase) });
    },
    'fifo-order': () => {
      const buf = CircularBuffer.create<number>(options);
      pushAll(buf, requireBatchItems(scenarioCase));
      assert.deepEqual(drain(buf), requireExpectedArray(scenarioCase));
    },
    'grow-head-wraparound': () => {
      const buf = CircularBuffer.create<number>(options);
      const { finalDrained } = runGrowOperations(buf, scenarioCase);
      assert.deepEqual(finalDrained, requireExpectedDrained(scenarioCase));
    },
    'grow-multiple-cycles-preserves-order': () => {
      const buf = CircularBuffer.create<number>(options);
      const batch = requireBatch(scenarioCase);
      const { itemCount, shiftEveryNth } = batch;
      assert.ok(typeof itemCount === 'number', `${scenarioCase.name} must define input.batch.itemCount`);
      assert.ok(typeof shiftEveryNth === 'number', `${scenarioCase.name} must define input.batch.shiftEveryNth`);
      const pushed: number[] = [];
      const shifted: number[] = [];

      for (let i = 0; i < itemCount; i++) {
        buf.push(i);
        pushed.push(i);
        if (i % shiftEveryNth === 0) {
          const value = buf.shift();
          if (value !== undefined) shifted.push(value);
        }
      }
      while (buf.length > 0) {
        const value = buf.shift();
        if (value !== undefined) shifted.push(value);
      }

      assert.equal(
        shifted.every((value, index) => value === pushed[index]) && shifted.length === pushed.length,
        requireExpectedFlag(scenarioCase, 'shiftedMatchesPushed')
      );
      assert.deepEqual(shifted, pushed);
    },
    'grow-order-preserved-after-grow': () => {
      const buf = CircularBuffer.create<number>(options);
      buf.push(1);
      buf.push(2);
      buf.push(3);
      assert.equal(buf.shift(), 1);
      assert.equal(buf.shift(), 2);
      assert.equal(buf.shift(), 3);
    },
    'grow-past-capacity': () => {
      const buf = CircularBuffer.create<number>(options);
      const { finalDrained, lengthBeforeDrain } = runGrowOperations(buf, scenarioCase);
      assert.equal(lengthBeforeDrain, requireExpectedLength(scenarioCase));
      assert.deepEqual(finalDrained, requireExpectedDrained(scenarioCase));
    },
    'grow-preserves-items-head-not-zero': () => {
      const buf = CircularBuffer.create<number>(options);
      const { finalDrained, lengthBeforeDrain } = runGrowOperations(buf, scenarioCase);
      assert.equal(lengthBeforeDrain, requireExpectedLength(scenarioCase));
      assert.deepEqual(finalDrained, requireExpectedDrained(scenarioCase));
    },
    'grow-wraparound-order': () => {
      const buf = CircularBuffer.create<number>(options);
      const { allShifted } = runGrowOperations(buf, scenarioCase);

      assert.deepEqual(allShifted, requireExpectedDrained(scenarioCase));
    },
    'length-reflects-count-not-capacity': () => {
      const buf = CircularBuffer.create<number>(options);
      buf.push(1);
      buf.push(2);
      assert.equal(buf.length, 2);
    },
    'non-primitive-values': () => {
      const buf = CircularBuffer.create<{ id: number }>(options);
      const a = { id: 1 };
      const b = { id: 2 };
      buf.push(a);
      buf.push(b);
      const preservedIdentity = buf.shift() === a && buf.shift() === b;
      assert.equal(preservedIdentity, requireExpectedFlag(scenarioCase, 'preservedIdentity'));
    },
    'overwrite-capacity-one-holds-last': () => {
      const buf = CircularBuffer.create<number>(options);
      buf.push(1);
      buf.push(2);
      buf.push(3);
      assert.equal(buf.length, 1);
      assert.equal(buf.shift(), 3);
    },
    'overwrite-fifo-after-multiple-evictions': () => {
      const buf = CircularBuffer.create<number>(options);
      for (let i = 1; i <= 7; i++) buf.push(i);
      assert.equal(buf.length, 3);
      assert.equal(buf.shift(), 5);
      assert.equal(buf.shift(), 6);
      assert.equal(buf.shift(), 7);
    },
    'overwrite-length-stays-at-capacity': () => {
      const buf = CircularBuffer.create<number>(options);
      for (let i = 0; i < 10; i++) buf.push(i);
      assert.equal(buf.length, 4);
    },
    'overwrite-oldest-evicted': () => {
      const buf = CircularBuffer.create<number>(options);
      buf.push(1);
      buf.push(2);
      buf.push(3);
      buf.push(4);
      assert.equal(buf.length, 3);
      assert.equal(buf.shift(), 2);
      assert.equal(buf.shift(), 3);
      assert.equal(buf.shift(), 4);
    },
    'push-after-shift-order': () => {
      const buf = CircularBuffer.create<number>(options);
      buf.push(1);
      buf.push(2);
      buf.shift();
      buf.push(3);
      assert.equal(buf.shift(), 2);
      assert.equal(buf.shift(), 3);
    },
    'push-increments-length': () => {
      const buf = CircularBuffer.create<number>(options);
      const lengths = requireExpectedLengths(scenarioCase);
      const observed: number[] = [];

      lengths.forEach((_length, index) => {
        buf.push(index + 1);
        observed.push(buf.length);
      });

      assert.deepEqual(observed, lengths);
    },
    'push-length-grow': assertPushLength,
    'push-length-overwrite': assertPushLength,
    'push-shift-cycling': () => {
      const buf = CircularBuffer.create<number>(options);
      buf.push(1);
      buf.push(2);
      assert.equal(buf.shift(), 1);
      buf.push(3);
      buf.push(4);
      assert.equal(buf.shift(), 2);
      assert.equal(buf.shift(), 3);
      assert.equal(buf.shift(), 4);
    },
    'push-then-shift-then-push-again': () => {
      const buf = CircularBuffer.create<number>(options);
      buf.push(1);
      buf.shift();
      buf.push(2);
      assert.equal(buf.length, 1);
      assert.equal(buf.shift(), 2);
    },
    'shift-after-all-items-returns-undefined': () => {
      const buf = CircularBuffer.create<number>(options);
      buf.push(1);
      buf.shift();
      assert.equal(buf.shift(), requireExpectedShiftValue(scenarioCase));
    },
    'shift-empty-does-not-throw': () => {
      const buf = CircularBuffer.create<number>(options);
      assert.doesNotThrow(() => buf.shift());
    },
    'shift-empty-returns-undefined': assertEmptyShiftValue,
    'shift-empty-successive-returns-undefined': () => {
      const buf = CircularBuffer.create<number>(options);
      const shifts = requireExpectedShifts(scenarioCase).map((value) => (value === null ? undefined : value));
      assert.equal(buf.shift(), shifts[0]);
      assert.equal(buf.shift(), shifts[1]);
      assert.equal(buf.shift(), shifts[2]);
    },
    'shift-first-item-and-decrements-length': () => {
      const buf = CircularBuffer.create<number>(options);
      buf.push(42);
      buf.push(99);
      assert.equal(buf.shift(), 42);
      assert.equal(buf.length, 1);
    },
    'shift-only-item-and-leaves-empty': () => {
      const buf = CircularBuffer.create<number>(options);
      buf.push(7);
      assert.equal(buf.shift(), 7);
      assert.equal(buf.length, 0);
    }
  };

  await runnerMap[shape](scenarioCase);
}

void describe('CircularBuffer core', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
