import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { BackoffStrategy } from '../../../src/retry/index.js';
import { BackoffStrategiesScenarioCaseEntity } from '../entities/BackoffStrategiesScenarioCaseEntity.js';
import scenarioGroups from './backoff-strategies.scenarios.json' with { 'type': 'json' };

class BackoffStrategiesRunners {
  private static readonly strategyMap: Record<'constant' | 'exponential' | 'linear', (attempt: number, baseDelay: number) => number> = {
    'constant': BackoffStrategy.constant,
    'exponential': BackoffStrategy.exponential,
    'linear': BackoffStrategy.linear
  };

  private static readAttemptInput(scenarioCase: BackoffStrategiesScenarioCaseEntity.Type): { 'attempt': number; 'baseDelay': number } {
    return {
      'attempt': Number(scenarioCase.input.attempt),
      'baseDelay': Number(scenarioCase.input.baseDelay)
    };
  }

  private static assertStrategyResult(strategy: (attempt: number, baseDelay: number) => number, scenarioCase: BackoffStrategiesScenarioCaseEntity.Type): void {
    const { attempt, baseDelay } = this.readAttemptInput(scenarioCase);
    assert.strictEqual(strategy(attempt, baseDelay), Number(scenarioCase.expected.result), scenarioCase.description);
  }

  private static readSampleCount(scenarioCase: BackoffStrategiesScenarioCaseEntity.Type): number {
    const sampleCount = Number(scenarioCase.input.batch?.sampleCount);
    assert.ok(Number.isInteger(sampleCount) && sampleCount > 0, `${scenarioCase.description}: batch.sampleCount must be a positive integer`);
    return sampleCount;
  }

  static 'ceiling'(scenarioCase: ScenarioCaseOfType<BackoffStrategiesScenarioCaseEntity.Type, 'ceiling'>): void {
    const strategy = this.strategyMap[scenarioCase.input.strategy ?? 'constant'];
    const capped = BackoffStrategy.withCeiling(strategy, Number(scenarioCase.input.ceiling));
    this.assertStrategyResult(capped, scenarioCase);
  }

  static 'constant'(scenarioCase: ScenarioCaseOfType<BackoffStrategiesScenarioCaseEntity.Type, 'constant'>): void {
    this.assertStrategyResult(BackoffStrategy.constant, scenarioCase);
  }

  static 'decorrelated-range'(scenarioCase: ScenarioCaseOfType<BackoffStrategiesScenarioCaseEntity.Type, 'decorrelated-range'>): void {
    const { attempt, baseDelay } = this.readAttemptInput(scenarioCase);
    const delay = BackoffStrategy.decorrelatedJitter(attempt, baseDelay);
    const minimumResult = Number(scenarioCase.expected.minimumResult);
    const maximumResult = Number(scenarioCase.expected.maximumResult);
    assert.ok(delay >= minimumResult, `${scenarioCase.description}: ${String(delay)} >= ${String(minimumResult)}`);
    assert.ok(delay <= maximumResult, `${scenarioCase.description}: ${String(delay)} <= ${String(maximumResult)}`);
  }

  static 'decorrelated-zero'(scenarioCase: ScenarioCaseOfType<BackoffStrategiesScenarioCaseEntity.Type, 'decorrelated-zero'>): void {
    this.assertStrategyResult(BackoffStrategy.decorrelatedJitter, scenarioCase);
  }

  static 'exponential'(scenarioCase: ScenarioCaseOfType<BackoffStrategiesScenarioCaseEntity.Type, 'exponential'>): void {
    this.assertStrategyResult(BackoffStrategy.exponential, scenarioCase);
  }

  static 'jitter-range'(scenarioCase: ScenarioCaseOfType<BackoffStrategiesScenarioCaseEntity.Type, 'jitter-range'>): void {
    const { attempt, baseDelay } = this.readAttemptInput(scenarioCase);
    const exponentialBase = baseDelay * Math.pow(2, attempt);
    const minimumExpected = Math.floor(exponentialBase * Number(scenarioCase.input.minimumMultiplier));
    const maximumExpected = Math.floor(exponentialBase * Number(scenarioCase.input.maximumMultiplier));

    for (let index = 0; index < this.readSampleCount(scenarioCase); index += 1) {
      const delay = BackoffStrategy.exponentialWithJitter(attempt, baseDelay);
      assert.ok(delay >= minimumExpected, `Attempt ${String(attempt)}: delay ${String(delay)} should be >= ${String(minimumExpected)}`);
      assert.ok(delay <= maximumExpected, `Attempt ${String(attempt)}: delay ${String(delay)} should be <= ${String(maximumExpected)}`);
    }
  }

  static 'jitter-varying'(scenarioCase: ScenarioCaseOfType<BackoffStrategiesScenarioCaseEntity.Type, 'jitter-varying'>): void {
    const { attempt, baseDelay } = this.readAttemptInput(scenarioCase);
    const results = new Set<number>();
    for (let index = 0; index < this.readSampleCount(scenarioCase); index += 1) {
      results.add(BackoffStrategy.exponentialWithJitter(attempt, baseDelay));
    }
    assert.ok(results.size >= Number(scenarioCase.expected.minimumDistinct), scenarioCase.description);
  }

  static 'linear'(scenarioCase: ScenarioCaseOfType<BackoffStrategiesScenarioCaseEntity.Type, 'linear'>): void {
    this.assertStrategyResult(BackoffStrategy.linear, scenarioCase);
  }
}

ScenarioSuite.register({
  'entity': BackoffStrategiesScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'BackoffStrategy',
  'runners': BackoffStrategiesRunners
});
