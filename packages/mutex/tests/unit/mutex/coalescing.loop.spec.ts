import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import { Mutex } from '../../../src/mutex/index.js';
import scenarioGroups from './coalescing.scenarios.json' with { 'type': 'json' };
import { CoalescingScenarioCaseEntity } from './entities/CoalescingScenarioCaseEntity.js';

class CoalescingRunners {
  static async 'allows-new-execution-after-complete'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'allows-new-execution-after-complete'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    let executionCount = 0;
    const operation = (): Promise<number> => {
      executionCount += 1;
      const settled = Promise.resolve(executionCount);
      return settled;
    };
    const result1 = await mutex.runExclusive(scenarioCase.input.key, operation);
    const result2 = await mutex.runExclusive(scenarioCase.input.key, operation);
    assert.strictEqual(result1, scenarioCase.expected.results[0]);
    assert.strictEqual(result2, scenarioCase.expected.results[1]);
    assert.strictEqual(executionCount, scenarioCase.expected.executionCount);
  }

  static async 'allows-retry-after-error'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'allows-retry-after-error'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    let callCount = 0;
    const operation = (): Promise<string> => {
      callCount += 1;
      let outcome = Promise.resolve(scenarioCase.input.successResult);
      if (callCount === 1) {
        outcome = Promise.reject(RuntimeError.create(scenarioCase.input.firstErrorMessage));
      }
      return outcome;
    };
    try {
      await mutex.runExclusive(scenarioCase.input.key, operation);
      throw RuntimeError.create('Should have thrown');
    } catch {}
    const result = await mutex.runExclusive(scenarioCase.input.key, operation);
    assert.strictEqual(result, scenarioCase.expected.result);
    assert.strictEqual(callCount, scenarioCase.expected.callCount);
  }

  static async 'clear-allows-new-operations'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'clear-allows-new-operations'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    const result1 = await mutex.runExclusive(scenarioCase.input.key, async () => {
      await setTimeout(scenarioCase.input.delayMs);
      return scenarioCase.expected.firstResult;
    });
    assert.strictEqual(result1, scenarioCase.expected.firstResult);
    mutex.clear();
    const result2 = await mutex.runExclusive(scenarioCase.input.key, async () => {
      await setTimeout(scenarioCase.input.delayMs);
      return scenarioCase.expected.secondResult;
    });
    assert.strictEqual(result2, scenarioCase.expected.secondResult);
  }

  static async 'clear-resets-coalescing-state'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'clear-resets-coalescing-state'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    let calls = 0;
    const operation = (): Promise<string> => {
      calls += 1;
      const settled = Promise.resolve(`result-${calls}`);
      return settled;
    };
    const result1 = await mutex.runExclusive(scenarioCase.input.key, operation);
    mutex.clear();
    const result2 = await mutex.runExclusive(scenarioCase.input.key, operation);
    assert.strictEqual(result1, scenarioCase.expected.results[0]);
    assert.strictEqual(result2, scenarioCase.expected.results[1]);
    assert.strictEqual(calls, scenarioCase.expected.calls);
  }

  static async 'coalesces-per-key'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'coalesces-per-key'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    const executionCounts = new Map<string, number>([['key1', 0], ['key2', 0]]);
    const perKeyCount = ScenarioValues.requireDefined(scenarioCase.input.batch.perKeyCount, 'batch.perKeyCount');
    const calls: Promise<unknown>[] = [];
    for (let index = 0; index < scenarioCase.input.keys.length; index += 1) {
      const key = ScenarioValues.requireDefined(scenarioCase.input.keys[index], 'keys[index]');
      const operation = CoalescingRunners.createCountingOperation(executionCounts, key, scenarioCase.input.delayMs);
      calls.push(...CoalescingRunners.createExclusiveCallBatch(perKeyCount, () => {
        const pending = mutex.runExclusive(key, operation);
        return pending;
      }));
    }
    const results = await Promise.all(calls);
    assert.strictEqual(executionCounts.get('key1'), scenarioCase.expected.executionCounts.key1);
    assert.strictEqual(executionCounts.get('key2'), scenarioCase.expected.executionCounts.key2);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  }

  static async 'no-share-by-default'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'no-share-by-default'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    let executionCount = 0;
    const operation = async (): Promise<string> => {
      executionCount += 1;
      await setTimeout(scenarioCase.input.delayMs);
      return `result-${executionCount}`;
    };
    const calls = CoalescingRunners.createExclusiveCallBatch(
      ScenarioValues.requireDefined(scenarioCase.input.batch.callerCount, 'batch.callerCount'),
      () => {
        const pending = mutex.runExclusive(scenarioCase.input.key, operation);
        return pending;
      }
    );
    const results = await Promise.all(calls);
    assert.strictEqual(executionCount, scenarioCase.expected.executionCount);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  }

  static async 'propagates-errors'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'propagates-errors'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    let executionCount = 0;
    const failingOperation = async (): Promise<string> => {
      executionCount += 1;
      await setTimeout(scenarioCase.input.delayMs);
      throw RuntimeError.create(scenarioCase.input.errorMessage);
    };
    const results = await Promise.allSettled(CoalescingRunners.createExclusiveCallBatch(
      ScenarioValues.requireDefined(scenarioCase.input.batch.callerCount, 'batch.callerCount'),
      () => {
        const pending = mutex.runExclusive(scenarioCase.input.key, failingOperation);
        return pending;
      }
    ));
    assert.strictEqual(executionCount, scenarioCase.expected.executionCount);
    const first = ScenarioValues.requireDefined(results[0], 'results[0]');
    const second = ScenarioValues.requireDefined(results[1], 'results[1]');
    const third = ScenarioValues.requireDefined(results[2], 'results[2]');
    if (first.status === 'rejected') {
      assert.strictEqual(first.reason.message, scenarioCase.expected.rejectionMessage);
    } else {
      throw RuntimeError.create('expected results[0] to be rejected');
    }
    assert.strictEqual(second.status, 'rejected');
    assert.strictEqual(third.status, 'rejected');
  }

  static async 'shares-result'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'shares-result'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    let executionCount = 0;
    const operation = async (): Promise<string> => {
      executionCount += 1;
      await setTimeout(scenarioCase.input.delayMs);
      return scenarioCase.input.result;
    };
    const results = await Promise.all(CoalescingRunners.createExclusiveCallBatch(
      ScenarioValues.requireDefined(scenarioCase.input.batch.callerCount, 'batch.callerCount'),
      () => {
        const pending = mutex.runExclusive(scenarioCase.input.key, operation);
        return pending;
      }
    ));
    assert.strictEqual(executionCount, scenarioCase.expected.executionCount);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  }

  static async 'stats-coalescedCount-disabled'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'stats-coalescedCount-disabled'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    await CoalescingRunners.runDelayedBatch(mutex, scenarioCase.input.key, scenarioCase.input.delayMs, ScenarioValues.requireDefined(scenarioCase.input.batch.callerCount, 'batch.callerCount'));
    const stats = mutex.getStats();
    assert.strictEqual(stats.coalescedCount, scenarioCase.expected.coalescedCount);
    assert.strictEqual(stats.totalExecuted, scenarioCase.expected.totalExecuted);
  }

  static async 'stats-coalescedCount-enabled'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'stats-coalescedCount-enabled'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    await CoalescingRunners.runDelayedBatch(mutex, scenarioCase.input.key, scenarioCase.input.delayMs, ScenarioValues.requireDefined(scenarioCase.input.batch.callerCount, 'batch.callerCount'));
    const stats = mutex.getStats();
    assert.strictEqual(stats.coalescedCount, scenarioCase.expected.coalescedCount);
    assert.strictEqual(stats.totalExecuted, scenarioCase.expected.totalExecuted);
  }

  static async 'stats-coalescedCount-joined'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'stats-coalescedCount-joined'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    await CoalescingRunners.runDelayedBatch(mutex, scenarioCase.input.key, scenarioCase.input.delayMs, ScenarioValues.requireDefined(scenarioCase.input.batch.callerCount, 'batch.callerCount'));
    assert.strictEqual(mutex.getStats().coalescedCount, scenarioCase.expected.coalescedCount);
  }

  static async 'validates-each-caller-result'(scenarioCase: ScenarioCaseOfType<CoalescingScenarioCaseEntity.Type, 'validates-each-caller-result'>): Promise<void> {
    const mutex = Mutex.create<string>(scenarioCase.input.mutex);
    const numberResult = mutex.runExclusive(scenarioCase.input.key, async () => {
      await setTimeout(scenarioCase.input.delayMs);
      return scenarioCase.input.numberResult;
    });
    const joinedResult = mutex.runExclusive(scenarioCase.input.key, () => {
      const stringResult = scenarioCase.input.stringResult;
      return stringResult;
    });

    assert.strictEqual(await numberResult, scenarioCase.expected.numberResult);
    assert.strictEqual(await joinedResult, scenarioCase.expected.numberResult);
  }

  private static createCountingOperation(executionCounts: Map<string, number>, key: string, delayMs: number): () => Promise<string> {
    const operation = async (): Promise<string> => {
      executionCounts.set(key, ScenarioValues.requireDefined(executionCounts.get(key), key) + 1);
      await setTimeout(delayMs);
      return `${key}-result`;
    };
    return operation;
  }

  private static createExclusiveCallBatch<TResult>(callerCount: number, run: () => Promise<TResult>): Promise<TResult>[] {
    const calls: Promise<TResult>[] = [];
    for (let index = 0; index < callerCount; index += 1) {
      calls.push(run());
    }
    return calls;
  }

  private static async runDelayedBatch(mutex: Mutex<string>, key: string, delayMs: number, callerCount: number): Promise<void> {
    const operation = async (): Promise<string> => {
      await setTimeout(delayMs);
      return 'result';
    };
    await Promise.all(CoalescingRunners.createExclusiveCallBatch(callerCount, () => {
      const pending = mutex.runExclusive(key, operation);
      return pending;
    }));
  }
}

ScenarioSuite.register({
  'entity': CoalescingScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Mutex coalescing',
  'runners': CoalescingRunners
});
