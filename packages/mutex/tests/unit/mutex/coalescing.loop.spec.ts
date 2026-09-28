import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { RuntimeError } from '@studnicky/errors/node';

import { Mutex } from '../../../src/mutex/index.js';
import { CoalescingScenarioCaseEntity } from './entities/CoalescingScenarioCaseEntity.js';
import scenarioGroups from './coalescing.scenarios.json' with { type: 'json' };



type ScenarioCase = CoalescingScenarioCaseEntity.Type;
type ScenarioInputWithMutex = { mutex?: { enableCoalescing?: boolean } };
type BatchInput = { callerCount?: number; perKeyCount?: number };

const fileIntake = ScenarioFileCompiler.compileIntake(CoalescingScenarioCaseEntity.Schema, CoalescingScenarioCaseEntity.Node);

function createScenarioMutex(input: ScenarioInputWithMutex): Mutex<string> {
  return Mutex.create<string>(input.mutex);
}

function requireCallerCount(batch: BatchInput): number {
  if (batch.callerCount === undefined) {
    throw RuntimeError.create('Scenario batch.callerCount is required');
  }
  return batch.callerCount;
}

function requirePerKeyCount(batch: BatchInput): number {
  if (batch.perKeyCount === undefined) {
    throw RuntimeError.create('Scenario batch.perKeyCount is required');
  }
  return batch.perKeyCount;
}

function createExclusiveCallBatch<T>(
  callerCount: number,
  run: () => Promise<T>
): Promise<T>[] {
  return Array.from({ length: callerCount }, () => run());
}

function requireDefined<T>(value: T | undefined, fieldPath: string): T {
  if (value === undefined) {
    throw RuntimeError.create(`Missing mutex coalescing scenario field: ${fieldPath}`);
  }
  return value;
}

type ScenarioCaseOf<Shape extends ScenarioCase['shape']> = Extract<ScenarioCase, { shape: Shape }>;

const runnerMap: {
  [K in ScenarioCase['shape']]: (scenarioCase: ScenarioCaseOf<K>) => Promise<void>
} = {
  'allows-new-execution-after-complete': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    let executionCount = 0;
    const operation = async (): Promise<number> => {
      executionCount++;
      return executionCount;
    };
    const result1 = await mutex.runExclusive(scenarioCase.input.key, operation);
    const result2 = await mutex.runExclusive(scenarioCase.input.key, operation);
    assert.strictEqual(result1, scenarioCase.expected.results[0]);
    assert.strictEqual(result2, scenarioCase.expected.results[1]);
    assert.strictEqual(executionCount, scenarioCase.expected.executionCount);
  },
  'allows-retry-after-error': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    let callCount = 0;
    const operation = async (): Promise<string> => {
      callCount++;
      if (callCount === 1) {
        throw RuntimeError.create(scenarioCase.input.firstErrorMessage);
      }
      return scenarioCase.input.successResult;
    };
    try {
      await mutex.runExclusive(scenarioCase.input.key, operation);
      throw RuntimeError.create('Should have thrown');
    } catch {}
    const result = await mutex.runExclusive(scenarioCase.input.key, operation);
    assert.strictEqual(result, scenarioCase.expected.result);
    assert.strictEqual(callCount, scenarioCase.expected.callCount);
  },
  'clear-allows-new-operations': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    const result1 = await mutex.runExclusive(scenarioCase.input.key, async () => {
      await delay(scenarioCase.input.delayMs);
      return scenarioCase.expected.firstResult;
    });
    assert.strictEqual(result1, scenarioCase.expected.firstResult);
    mutex.clear();
    const result2 = await mutex.runExclusive(scenarioCase.input.key, async () => {
      await delay(scenarioCase.input.delayMs);
      return scenarioCase.expected.secondResult;
    });
    assert.strictEqual(result2, scenarioCase.expected.secondResult);
  },
  'clear-resets-coalescing-state': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    let calls = 0;
    const operation = async (): Promise<string> => {
      calls++;
      return `result-${calls}`;
    };
    const result1 = await mutex.runExclusive(scenarioCase.input.key, operation);
    mutex.clear();
    const result2 = await mutex.runExclusive(scenarioCase.input.key, operation);
    assert.strictEqual(result1, scenarioCase.expected.results[0]);
    assert.strictEqual(result2, scenarioCase.expected.results[1]);
    assert.strictEqual(calls, scenarioCase.expected.calls);
  },
  'coalesces-per-key': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    const executionCounts = { key1: 0, key2: 0 };
    class Op {
      static for(key: 'key1' | 'key2') {
        return async (): Promise<string> => {
          executionCounts[key]++;
          await delay(scenarioCase.input.delayMs);
          return `${key}-result`;
        };
      }
    }
    const perKeyCount = requirePerKeyCount(scenarioCase.input.batch);
    const calls = scenarioCase.input.keys.flatMap((key: 'key1' | 'key2') => createExclusiveCallBatch(
      perKeyCount,
      () => mutex.runExclusive(key, Op.for(key))
    ));
    const results = await Promise.all(calls);
    assert.strictEqual(executionCounts.key1, scenarioCase.expected.executionCounts.key1);
    assert.strictEqual(executionCounts.key2, scenarioCase.expected.executionCounts.key2);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },
  'no-share-by-default': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    let executionCount = 0;
    const operation = async (): Promise<string> => {
      executionCount++;
      await delay(scenarioCase.input.delayMs);
      return `result-${executionCount}`;
    };
    const calls = createExclusiveCallBatch(
      requireCallerCount(scenarioCase.input.batch),
      () => mutex.runExclusive(scenarioCase.input.key, operation)
    );
    const results = await Promise.all(calls);
    assert.strictEqual(executionCount, scenarioCase.expected.executionCount);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },
  'propagates-errors': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    let executionCount = 0;
    const failingOperation = async (): Promise<string> => {
      executionCount++;
      await delay(scenarioCase.input.delayMs);
      throw RuntimeError.create(scenarioCase.input.errorMessage);
    };
    const results = await Promise.allSettled(createExclusiveCallBatch(
      requireCallerCount(scenarioCase.input.batch),
      () => mutex.runExclusive(scenarioCase.input.key, failingOperation)
    ));
    assert.strictEqual(executionCount, scenarioCase.expected.executionCount);
    const first = requireDefined(results[0], 'results[0]');
    const second = requireDefined(results[1], 'results[1]');
    const third = requireDefined(results[2], 'results[2]');
    if (first.status !== 'rejected') { throw RuntimeError.create('expected results[0] to be rejected'); }
    assert.strictEqual(second.status, 'rejected');
    assert.strictEqual(third.status, 'rejected');
    assert.strictEqual(first.reason.message, scenarioCase.expected.rejectionMessage);
  },
  'shares-result': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    let executionCount = 0;
    const operation = async (): Promise<string> => {
      executionCount++;
      await delay(scenarioCase.input.delayMs);
      return scenarioCase.input.result;
    };
    const results = await Promise.all(createExclusiveCallBatch(
      requireCallerCount(scenarioCase.input.batch),
      () => mutex.runExclusive(scenarioCase.input.key, operation)
    ));
    assert.strictEqual(executionCount, scenarioCase.expected.executionCount);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },
  'stats-coalescedCount-disabled': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    const operation = async (): Promise<string> => {
      await delay(scenarioCase.input.delayMs);
      return 'result';
    };
    const calls = createExclusiveCallBatch(
      requireCallerCount(scenarioCase.input.batch),
      () => mutex.runExclusive(scenarioCase.input.key, operation)
    );
    await Promise.all(calls);
    const stats = mutex.getStats();
    assert.strictEqual(stats.coalescedCount, scenarioCase.expected.coalescedCount);
    assert.strictEqual(stats.totalExecuted, scenarioCase.expected.totalExecuted);
  },
  'stats-coalescedCount-enabled': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    const operation = async (): Promise<string> => {
      await delay(scenarioCase.input.delayMs);
      return 'result';
    };
    const calls = createExclusiveCallBatch(
      requireCallerCount(scenarioCase.input.batch),
      () => mutex.runExclusive(scenarioCase.input.key, operation)
    );
    await Promise.all(calls);
    const stats = mutex.getStats();
    assert.strictEqual(stats.coalescedCount, scenarioCase.expected.coalescedCount);
    assert.strictEqual(stats.totalExecuted, scenarioCase.expected.totalExecuted);
  },
  'stats-coalescedCount-joined': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    const operation = async (): Promise<string> => {
      await delay(scenarioCase.input.delayMs);
      return 'result';
    };
    await Promise.all(createExclusiveCallBatch(
      requireCallerCount(scenarioCase.input.batch),
      () => mutex.runExclusive(scenarioCase.input.key, operation)
    ));
    assert.strictEqual(mutex.getStats().coalescedCount, scenarioCase.expected.coalescedCount);
  },
  'validates-each-caller-result': async (scenarioCase) => {
    const mutex = createScenarioMutex(scenarioCase.input);
    const numberResult = mutex.runExclusive(scenarioCase.input.key, async () => {
      await delay(scenarioCase.input.delayMs);
      return scenarioCase.input.numberResult;
    });
    const joinedResult = mutex.runExclusive(scenarioCase.input.key, () => scenarioCase.input.stringResult);

    assert.strictEqual(await numberResult, scenarioCase.expected.numberResult);
    assert.strictEqual(await joinedResult, scenarioCase.expected.numberResult);
  }
};

async function runCase<Shape extends ScenarioCase['shape']>(scenarioCase: ScenarioCaseOf<Shape>): Promise<void> {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Mutex coalescing', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
