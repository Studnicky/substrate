import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { Batch } from '@studnicky/batch/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ThrottleStatsEntity } from '../../../src/entities/index.js';
import { Throttle } from '../../../src/index.js';
import { VirtualClockThrottle } from '../../helpers/VirtualClockThrottle.js';
import { StateManagementScenarioCaseEntity } from './entities/StateManagementScenarioCaseEntity.js';
import scenarioGroups from './state-management.scenarios.json' with { 'type': 'json' };

class StateManagementRunners {
  static async 'adaptive-latency-stats'(scenarioCase: ScenarioCaseOfType<StateManagementScenarioCaseEntity.Type, 'adaptive-latency-stats'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const throttle = Throttle.create(input.throttle);

    const result = await throttle.execute(() => {
      const settled = Promise.resolve(input.result);
      return settled;
    });

    assert.strictEqual(result, expected.result);
    const stats = throttle.getStats();
    assert.ok(stats.latency !== undefined);
    assert.strictEqual(stats.latency?.sampleCount, expected.sampleCount);
  }

  static async 'adaptive-scales-down'(scenarioCase: ScenarioCaseOfType<StateManagementScenarioCaseEntity.Type, 'adaptive-scales-down'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const throttle = VirtualClockThrottle.createWithClock(input.clock, input.throttle);
    const results = await StateManagementRunners.executeIndexedWork(throttle, input.batch.itemCount, input.batch.maximumConcurrent);

    assert.strictEqual(results.length, expected.resultCount);
    assert.strictEqual(throttle.getStats().concurrencyLimit, expected.concurrencyLimit);
  }

  static async 'adaptive-scales-up'(scenarioCase: ScenarioCaseOfType<StateManagementScenarioCaseEntity.Type, 'adaptive-scales-up'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const throttle = VirtualClockThrottle.createWithClock(input.clock, input.throttle);
    const results = await StateManagementRunners.executeIndexedWork(throttle, input.batch.itemCount, input.batch.maximumConcurrent);

    assert.strictEqual(results.length, expected.resultCount);
    assert.strictEqual(throttle.getStats().concurrencyLimit, expected.concurrencyLimit);
  }

  static 'initial-stats'(scenarioCase: ScenarioCaseOfType<StateManagementScenarioCaseEntity.Type, 'initial-stats'>): void {
    const { expected, input } = scenarioCase;
    const throttle = Throttle.create(input.throttle);
    const stats = throttle.getStats();
    assert.deepStrictEqual(stats, expected.stats);
    assert.strictEqual(ThrottleStatsEntity.validate(stats), expected.isComplete);
  }

  static 'is-complete-initially'(scenarioCase: ScenarioCaseOfType<StateManagementScenarioCaseEntity.Type, 'is-complete-initially'>): void {
    const { expected, input } = scenarioCase;
    const throttle = Throttle.create(input.throttle);
    assert.strictEqual(throttle.isComplete(), expected.isComplete);
  }

  private static async executeIndexedWork(throttle: VirtualClockThrottle, itemCount: number, maximumConcurrent: number): Promise<number[]> {
    const items: number[] = [];
    for (let index = 0; index < itemCount; index += 1) {
      items.push(index);
    }
    const workload = Batch.create<number | undefined>(maximumConcurrent);
    const worker = StateManagementRunners.createIndexedWorker(throttle);
    const results: number[] = [];

    for await (const batchResults of workload.process(items, worker)) {
      for (let index = 0; index < batchResults.length; index += 1) {
        const result = batchResults[index];
        if (result !== undefined) {
          results.push(result);
        }
      }
    }

    return results;
  }

  private static createIndexedWorker(throttle: VirtualClockThrottle): (index: number) => Promise<number | undefined> {
    const worker = async (index: number): Promise<number | undefined> => {
      throttle.advanceOperationStart();
      const executed = await throttle.execute(() => {
        throttle.advanceOperationDuration();
        const settled = Promise.resolve(index);
        return settled;
      });
      return executed;
    };
    return worker;
  }

  static declaresCoreStatEntity(): void {
    void describe('ThrottleStatsEntity.create', () => {
      void it('accepts a plain unbranded literal for nested minimum/exclusiveMinimum-constrained properties and validates', () => {
        const result = ThrottleStatsEntity.create({
          'activeCount': 1,
          'adaptive': {
            'adjustmentCount': 1,
            'enabled': true,
            'lastAdjustmentTime': 100,
            'maximumConcurrency': 10,
            'minimumConcurrency': 1,
            'targetLatencyMs': 50
          },
          'concurrencyLimit': 5,
          'isAborted': false,
          'isDraining': false,
          'latency': { 'p50': 1, 'p95': 2, 'p99': 3, 'sampleCount': 3 },
          'queuedCount': 0,
          'totalExecuted': 10
        });
        assert.equal(result.adaptive?.targetLatencyMs, 50);
        assert.equal(ThrottleStatsEntity.validate(result), true);
      });
    });
  }
}

ScenarioSuite.register({
  'entity': StateManagementScenarioCaseEntity,
  'extraTests': StateManagementRunners.declaresCoreStatEntity,
  'file': scenarioGroups,
  'name': 'Throttle state management',
  'runners': StateManagementRunners
});
