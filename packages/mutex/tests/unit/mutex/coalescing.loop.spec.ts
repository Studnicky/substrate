import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { Mutex } from '../../../src/mutex/index.js';

import scenarioGroups from './coalescing.scenarios.json';

type MutexInput = Parameters<typeof Mutex.create>[0];
type ScenarioInputWithMutex = { mutex?: MutexInput };
type BatchInput = { callerCount?: number; perKeyCount?: number };
type ScenarioInputWithBatch = { batch: BatchInput };

type ScenarioCase =
  | {
      description: string;
      expected: { executionCount: 1; results: readonly ['result', 'result', 'result'] };
      input: ScenarioInputWithBatch & ScenarioInputWithMutex & { delayMs: number; key: string; result: string };
      kind: 'shares-result';
      name: string;
    }
  | {
      description: string;
      expected: { numberResult: number; rejectedType: 'TypeError' };
      input: ScenarioInputWithMutex & { delayMs: number; key: string; numberResult: number; stringResult: string };
      kind: 'validates-each-caller-result';
      name: string;
    }
  | {
      description: string;
      expected: { executionCount: 3; results: readonly ['result-1', 'result-2', 'result-3'] };
      input: ScenarioInputWithBatch & ScenarioInputWithMutex & { delayMs: number; key: string };
      kind: 'no-share-by-default';
      name: string;
    }
  | {
      description: string;
      expected: { executionCounts: { key1: 1; key2: 1 }; results: readonly ['key1-result', 'key1-result', 'key2-result', 'key2-result'] };
      input: ScenarioInputWithBatch & ScenarioInputWithMutex & { delayMs: number; keys: readonly ['key1', 'key2'] };
      kind: 'coalesces-per-key';
      name: string;
    }
  | {
      description: string;
      expected: { executionCount: 2; results: readonly [1, 2] };
      input: ScenarioInputWithMutex & { key: string };
      kind: 'allows-new-execution-after-complete';
      name: string;
    }
  | {
      description: string;
      expected: { executionCount: 1; rejectionMessage: string };
      input: ScenarioInputWithBatch & ScenarioInputWithMutex & { delayMs: number; errorMessage: string; key: string };
      kind: 'propagates-errors';
      name: string;
    }
  | {
      description: string;
      expected: { callCount: 2; result: string };
      input: ScenarioInputWithMutex & { firstErrorMessage: string; key: string; successResult: string };
      kind: 'allows-retry-after-error';
      name: string;
    }
  | {
      description: string;
      expected: { coalescedCount: number; totalExecuted: number };
      input: ScenarioInputWithBatch & ScenarioInputWithMutex & { delayMs: number; key: string };
      kind: 'stats-coalescedCount-enabled' | 'stats-coalescedCount-disabled';
      name: string;
    }
  | {
      description: string;
      expected: { coalescedCount: 2 };
      input: ScenarioInputWithBatch & ScenarioInputWithMutex & { delayMs: number; key: string };
      kind: 'stats-coalescedCount-joined';
      name: string;
    }
  | {
      description: string;
      expected: { firstResult: string; secondResult: string };
      input: ScenarioInputWithMutex & { delayMs: number; key: string };
      kind: 'clear-allows-new-operations';
      name: string;
    }
  | {
      description: string;
      expected: { calls: 2; results: readonly ['result-1', 'result-2'] };
      input: ScenarioInputWithMutex & { key: string };
      kind: 'clear-resets-coalescing-state';
      name: string;
    };

function createScenarioMutex(input: ScenarioInputWithMutex): Mutex<string> {
  return Mutex.create<string>(input.mutex);
}

function requireCallerCount(batch: BatchInput): number {
  if (batch.callerCount === undefined) {
    throw new Error('Scenario batch.callerCount is required');
  }
  return batch.callerCount;
}

function requirePerKeyCount(batch: BatchInput): number {
  if (batch.perKeyCount === undefined) {
    throw new Error('Scenario batch.perKeyCount is required');
  }
  return batch.perKeyCount;
}

function createExclusiveCallBatch<T>(
  callerCount: number,
  run: () => Promise<T>
): Promise<T>[] {
  return Array.from({ length: callerCount }, () => run());
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => Promise<void>> = {
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
        throw new Error(scenarioCase.input.firstErrorMessage);
      }
      return scenarioCase.input.successResult;
    };
    try {
      await mutex.runExclusive(scenarioCase.input.key, operation);
      throw new Error('Should have thrown');
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
    const calls = scenarioCase.input.keys.flatMap((key) => createExclusiveCallBatch(
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
      throw new Error(scenarioCase.input.errorMessage);
    };
    const results = await Promise.allSettled(createExclusiveCallBatch(
      requireCallerCount(scenarioCase.input.batch),
      () => mutex.runExclusive(scenarioCase.input.key, failingOperation)
    ));
    assert.strictEqual(executionCount, scenarioCase.expected.executionCount);
    assert.strictEqual(results[0].status, 'rejected');
    assert.strictEqual(results[1].status, 'rejected');
    assert.strictEqual(results[2].status, 'rejected');
    const rejected = results[0];
    assert.strictEqual((rejected as PromiseRejectedResult).reason.message, scenarioCase.expected.rejectionMessage);
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
    const acceptsNumber = (value: unknown): value is number => typeof value === 'number';
    const acceptsString = (value: unknown): value is string => typeof value === 'string';
    const numberResult = mutex.runExclusive(scenarioCase.input.key, async () => {
      await delay(scenarioCase.input.delayMs);
      return scenarioCase.input.numberResult;
    }, acceptsNumber);
    const stringResult = mutex.runExclusive(scenarioCase.input.key, () => scenarioCase.input.stringResult, acceptsString);
    assert.strictEqual(await numberResult, scenarioCase.expected.numberResult);
    await assert.rejects(stringResult, (error: unknown) => error instanceof TypeError && error.name === scenarioCase.expected.rejectedType);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  return runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('Mutex coalescing', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
