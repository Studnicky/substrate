import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { Retry } from '../../../src/retry/index.js';
import { RetryStatsScenarioCaseEntity } from '../entities/RetryStatsScenarioCaseEntity.js';
import { FailingOperation } from './fixtures/FailingOperation.js';
import { ResolvingOperation } from './fixtures/ResolvingOperation.js';
import { RetryClassifier } from './fixtures/RetryClassifier.js';
import scenarioGroups from './retry-stats.scenarios.json' with { 'type': 'json' };

class RetryStatsRunners {
  private static createScenarioRetry(input: RetryStatsScenarioCaseEntity.Type['input']): Retry {
    let retry = Retry.create(input.retry);
    if (input.classifier === 'non-retryable') {
      retry = Retry.create({ ...input.retry, 'errorClassifier': RetryClassifier.nonRetryable });
    }
    if (input.classifier === 'retryable') {
      retry = Retry.create({ ...input.retry, 'errorClassifier': RetryClassifier.retryable });
    }
    return retry;
  }

  static async 'failed-requests-increment'(scenarioCase: ScenarioCaseOfType<RetryStatsScenarioCaseEntity.Type, 'failed-requests-increment'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const retry = this.createScenarioRetry(input);

    await assert.rejects(retry.execute(new FailingOperation(String(input.errorMessage)).run));
    const stats = retry.getStats();
    assert.strictEqual(stats.failedRequests, Number(expected.failedRequests));
    assert.strictEqual(stats.successfulRequests, Number(expected.successfulRequests));
  }

  static 'initial'(scenarioCase: ScenarioCaseOfType<RetryStatsScenarioCaseEntity.Type, 'initial'>): void {
    const { expected } = scenarioCase;
    const retry = this.createScenarioRetry(scenarioCase.input);
    assert.deepStrictEqual(retry.getStats(), expected.stats);
  }

  static async 'reset-stats-accumulates'(scenarioCase: ScenarioCaseOfType<RetryStatsScenarioCaseEntity.Type, 'reset-stats-accumulates'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const retry = this.createScenarioRetry(input);
    await retry.execute(ResolvingOperation.of(String(input.calls?.[0] ?? 'first')));
    retry.resetStats();
    await retry.execute(ResolvingOperation.of(String(input.calls?.[1] ?? 'second')));
    await retry.execute(ResolvingOperation.of(String(input.calls?.[2] ?? 'third')));
    const stats = retry.getStats();
    assert.strictEqual(stats.totalRequests, Number(expected.totalRequests));
    assert.strictEqual(stats.successfulRequests, Number(expected.successfulRequests));
  }

  static async 'reset-stats-zero'(scenarioCase: ScenarioCaseOfType<RetryStatsScenarioCaseEntity.Type, 'reset-stats-zero'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const retry = this.createScenarioRetry(input);
    await retry.execute(ResolvingOperation.of(String(input.calls?.[0] ?? 'first')));
    await retry.execute(ResolvingOperation.of(String(input.calls?.[1] ?? 'second')));
    assert.strictEqual(retry.getStats().totalRequests, 2);
    retry.resetStats();
    assert.deepStrictEqual(retry.getStats(), expected.stats);
  }

  static 'stats-frozen'(scenarioCase: ScenarioCaseOfType<RetryStatsScenarioCaseEntity.Type, 'stats-frozen'>): void {
    const { expected, input } = scenarioCase;
    const retry = this.createScenarioRetry(input);
    const stats = retry.getStats();
    try {
      Reflect.set(stats, 'totalRequests', Number(input.mutatedTotalRequests));
    } catch {
      // ignored
    }
    assert.strictEqual(retry.getStats().totalRequests, Number(expected.totalRequests));
  }

  static async 'successful-requests-increment'(scenarioCase: ScenarioCaseOfType<RetryStatsScenarioCaseEntity.Type, 'successful-requests-increment'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const retry = this.createScenarioRetry(input);
    await retry.execute(ResolvingOperation.of(String(input.result)));
    const stats = retry.getStats();
    assert.strictEqual(stats.successfulRequests, Number(expected.successfulRequests));
    assert.strictEqual(stats.failedRequests, Number(expected.failedRequests));
  }

  static async 'total-requests-increments'(scenarioCase: ScenarioCaseOfType<RetryStatsScenarioCaseEntity.Type, 'total-requests-increments'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const retry = this.createScenarioRetry(input);
    const calls = input.calls ?? [];
    await retry.execute(ResolvingOperation.of(calls[0] ?? 'first'));
    assert.strictEqual(retry.getStats().totalRequests, 1);
    await retry.execute(ResolvingOperation.of(calls[1] ?? 'second'));
    assert.strictEqual(retry.getStats().totalRequests, 2);
    await retry.execute(ResolvingOperation.of(calls[2] ?? 'third'));
    assert.strictEqual(retry.getStats().totalRequests, Number(expected.totalRequests));
  }

  static async 'total-retries-counted'(scenarioCase: ScenarioCaseOfType<RetryStatsScenarioCaseEntity.Type, 'total-retries-counted'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const operation = new FailingOperation(String(input.errorMessage));
    const retry = this.createScenarioRetry(input);

    await assert.rejects(retry.execute(operation.run));
    const stats = retry.getStats();
    assert.strictEqual(stats.totalRetries, Number(expected.totalRetries));
    assert.strictEqual(operation.attempts, Number(expected.attempts));
  }
}

ScenarioSuite.register({
  'entity': RetryStatsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Retry stats',
  'runners': RetryStatsRunners
});
