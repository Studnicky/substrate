import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BackoffStrategy } from '../../../src/retry/index.js';
import scenarioGroups from './backoff-strategies.scenarios.json';

type StrategyName = 'constant' | 'exponential' | 'linear';

type ScenarioShape =
  | 'ceiling'
  | 'constant'
  | 'decorrelated-range'
  | 'decorrelated-zero'
  | 'exponential'
  | 'is-valid'
  | 'jitter-range'
  | 'jitter-varying'
  | 'linear';

type ScenarioInput = {
  attempt?: number;
  batch?: {
    sampleCount?: number;
  };
  baseDelay?: number;
  ceiling?: number;
  maxMultiplier?: number;
  minMultiplier?: number;
  strategy?: StrategyName;
  value?: unknown;
};

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: ScenarioShape; name: string };

const strategyMap: Record<StrategyName, (attempt: number, baseDelay: number) => number> = {
  'constant': BackoffStrategy.constant,
  'exponential': BackoffStrategy.exponential,
  'linear': BackoffStrategy.linear
};

function readAttemptInput(scenarioCase: ScenarioCase): { attempt: number; baseDelay: number } {
  return {
    attempt: Number(scenarioCase.input.attempt),
    baseDelay: Number(scenarioCase.input.baseDelay)
  };
}

function assertStrategyResult(strategy: (attempt: number, baseDelay: number) => number, scenarioCase: ScenarioCase): void {
  const { attempt, baseDelay } = readAttemptInput(scenarioCase);
  assert.strictEqual(strategy(attempt, baseDelay), Number(scenarioCase.expected.result), scenarioCase.description);
}

function readSampleCount(scenarioCase: ScenarioCase): number {
  const sampleCount = Number(scenarioCase.input.batch?.sampleCount);
  assert.ok(Number.isInteger(sampleCount) && sampleCount > 0, `${scenarioCase.description}: batch.sampleCount must be a positive integer`);
  return sampleCount;
}

const runnerMap: Record<ScenarioShape, (scenarioCase: ScenarioCase) => void> = {
  'ceiling': (scenarioCase) => {
    const strategy = strategyMap[scenarioCase.input.strategy ?? 'constant'];
    const capped = BackoffStrategy.withCeiling(strategy, Number(scenarioCase.input.ceiling));
    assertStrategyResult(capped, scenarioCase);
  },
  'constant': (scenarioCase) => {
    assertStrategyResult(BackoffStrategy.constant, scenarioCase);
  },
  'decorrelated-range': (scenarioCase) => {
    const { attempt, baseDelay } = readAttemptInput(scenarioCase);
    const delay = BackoffStrategy.decorrelatedJitter(attempt, baseDelay);
    const minResult = Number(scenarioCase.expected.minResult);
    const maxResult = Number(scenarioCase.expected.maxResult);
    assert.ok(delay >= minResult, `${scenarioCase.description}: ${String(delay)} >= ${String(minResult)}`);
    assert.ok(delay <= maxResult, `${scenarioCase.description}: ${String(delay)} <= ${String(maxResult)}`);
  },
  'decorrelated-zero': (scenarioCase) => {
    assertStrategyResult(BackoffStrategy.decorrelatedJitter, scenarioCase);
  },
  'exponential': (scenarioCase) => {
    assertStrategyResult(BackoffStrategy.exponential, scenarioCase);
  },
  'is-valid': (scenarioCase) => {
    const value = scenarioCase.expected.isValid ? (() => 1) : scenarioCase.input.value;
    assert.strictEqual(BackoffStrategy.isValid(value), Boolean(scenarioCase.expected.isValid), scenarioCase.description);
  },
  'jitter-range': (scenarioCase) => {
    const { attempt, baseDelay } = readAttemptInput(scenarioCase);
    const exponentialBase = baseDelay * Math.pow(2, attempt);
    const minExpected = Math.floor(exponentialBase * Number(scenarioCase.input.minMultiplier));
    const maxExpected = Math.floor(exponentialBase * Number(scenarioCase.input.maxMultiplier));

    for (let index = 0; index < readSampleCount(scenarioCase); index += 1) {
      const delay = BackoffStrategy.exponentialWithJitter(attempt, baseDelay);
      assert.ok(delay >= minExpected, `Attempt ${String(attempt)}: delay ${String(delay)} should be >= ${String(minExpected)}`);
      assert.ok(delay <= maxExpected, `Attempt ${String(attempt)}: delay ${String(delay)} should be <= ${String(maxExpected)}`);
    }
  },
  'jitter-varying': (scenarioCase) => {
    const { attempt, baseDelay } = readAttemptInput(scenarioCase);
    const results = new Set<number>();
    for (let index = 0; index < readSampleCount(scenarioCase); index += 1) {
      results.add(BackoffStrategy.exponentialWithJitter(attempt, baseDelay));
    }
    assert.ok(results.size >= Number(scenarioCase.expected.minDistinct), scenarioCase.description);
  },
  'linear': (scenarioCase) => {
    assertStrategyResult(BackoffStrategy.linear, scenarioCase);
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('BackoffStrategy', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
