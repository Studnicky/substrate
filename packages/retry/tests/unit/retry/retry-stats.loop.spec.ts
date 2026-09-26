import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Retry } from '../../../src/retry/index.js';
import { RetryStatsScenarioCaseEntity } from '../entities/RetryStatsScenarioCaseEntity.js';
import scenarioGroups from './retry-stats.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(RetryStatsScenarioCaseEntity.Schema, RetryStatsScenarioCaseEntity.Node);

type ScenarioCase = RetryStatsScenarioCaseEntity.Type;

type RetryClassifierMode = ScenarioCase['input']['classifier'];

type ScenarioShape = ScenarioCase['shape'];

const retryFactoryMap: Record<RetryClassifierMode, (input: ScenarioCase['input']) => Retry> = {
  'default': (input) => Retry.create(input.retry),
  'non-retryable': (input) => Retry.create({
    ...input.retry,
    errorClassifier: () => ({ retryable: false })
  }),
  'retryable': (input) => Retry.create({
    ...input.retry,
    errorClassifier: () => ({ retryable: true })
  })
};

function createScenarioRetry(input: ScenarioCase['input']): Retry {
  return retryFactoryMap[input.classifier](input);
}

const runnerMap: Record<ScenarioShape, (scenarioCase: ScenarioCase) => Promise<void> | void> = {
  'failed-requests-increment': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const retry = createScenarioRetry(input);

    await assert.rejects(retry.execute(async () => { throw RuntimeError.create(String(input.errorMessage)); }));
    const stats = retry.getStats();
    assert.strictEqual(stats.failedRequests, Number(expected.failedRequests));
    assert.strictEqual(stats.successfulRequests, Number(expected.successfulRequests));
  },
  'initial': (scenarioCase) => {
    const { expected } = scenarioCase;
    const retry = createScenarioRetry(scenarioCase.input);
    assert.deepStrictEqual(retry.getStats(), expected.stats);
  },
  'reset-stats-accumulates': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const retry = createScenarioRetry(input);
    await retry.execute(async () => String(input.calls?.[0] ?? 'first'));
    retry.resetStats();
    await retry.execute(async () => String(input.calls?.[1] ?? 'second'));
    await retry.execute(async () => String(input.calls?.[2] ?? 'third'));
    const stats = retry.getStats();
    assert.strictEqual(stats.totalRequests, Number(expected.totalRequests));
    assert.strictEqual(stats.successfulRequests, Number(expected.successfulRequests));
  },
  'reset-stats-zero': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const retry = createScenarioRetry(input);
    await retry.execute(async () => String(input.calls?.[0] ?? 'first'));
    await retry.execute(async () => String(input.calls?.[1] ?? 'second'));
    assert.strictEqual(retry.getStats().totalRequests, 2);
    retry.resetStats();
    assert.deepStrictEqual(retry.getStats(), expected.stats);
  },
  'stats-frozen': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const retry = createScenarioRetry(input);
    const stats = retry.getStats();
    try {
      Reflect.set(stats, 'totalRequests', Number(input.mutatedTotalRequests));
    } catch {
      // ignored
    }
    assert.strictEqual(retry.getStats().totalRequests, Number(expected.totalRequests));
  },
  'successful-requests-increment': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const retry = createScenarioRetry(input);
    await retry.execute(async () => String(input.result));
    const stats = retry.getStats();
    assert.strictEqual(stats.successfulRequests, Number(expected.successfulRequests));
    assert.strictEqual(stats.failedRequests, Number(expected.failedRequests));
  },
  'total-requests-increments': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const retry = createScenarioRetry(input);
    const calls = input.calls ?? [];
    await retry.execute(async () => calls[0] ?? 'first');
    assert.strictEqual(retry.getStats().totalRequests, 1);
    await retry.execute(async () => calls[1] ?? 'second');
    assert.strictEqual(retry.getStats().totalRequests, 2);
    await retry.execute(async () => calls[2] ?? 'third');
    assert.strictEqual(retry.getStats().totalRequests, Number(expected.totalRequests));
  },
  'total-retries-counted': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    let attempts = 0;
    const retry = createScenarioRetry(input);

    await assert.rejects(retry.execute(async () => {
      attempts += 1;
      throw RuntimeError.create(String(input.errorMessage));
    }));
    const stats = retry.getStats();
    assert.strictEqual(stats.totalRetries, Number(expected.totalRetries));
    assert.strictEqual(attempts, Number(expected.attempts));
  }
};

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Retry stats', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
