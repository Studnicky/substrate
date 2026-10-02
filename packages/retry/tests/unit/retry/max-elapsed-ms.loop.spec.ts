import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock/node';
import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import { MaximumRetriesExceededError } from '../../../src/errors/index.js';
import { Retry } from '../../../src/retry/index.js';
import { MaximumElapsedMsScenarioCaseEntity } from '../entities/MaximumElapsedMsScenarioCaseEntity.js';
import { FailingOperation } from './fixtures/FailingOperation.js';
import { ResolvingOperation } from './fixtures/ResolvingOperation.js';
import { RetryClassifier } from './fixtures/RetryClassifier.js';
import scenarioGroups from './max-elapsed-ms.scenarios.json' with { 'type': 'json' };

class MaximumElapsedMsRunners {
  static async 'configured-not-reached'(scenario: ScenarioCaseOfType<MaximumElapsedMsScenarioCaseEntity.Type, 'configured-not-reached'>): Promise<void> {
    const { expected, input } = scenario;
    const retry = Retry.create({
      'errorClassifier': RetryClassifier.retryable,
      ...input.retry
    });

    const result = await retry.execute(ResolvingOperation.of(String(input.result)));
    assert.strictEqual(result, String(expected.result));
  }

  static async 'count-wins'(scenario: ScenarioCaseOfType<MaximumElapsedMsScenarioCaseEntity.Type, 'count-wins'>): Promise<void> {
    const { expected, input } = scenario;
    const operation = new FailingOperation(String(input.errorMessage));

    const retry = Retry.create({
      'errorClassifier': RetryClassifier.retryable,
      ...input.retry
    });

    await assert.rejects(retry.execute(operation.run), MaximumRetriesExceededError);

    assert.strictEqual(operation.attempts, Number(expected.attempts));
    assert.strictEqual(retry.getStats().totalRetries, Number(expected.totalRetries));
  }

  static async 'default-behavior'(scenario: ScenarioCaseOfType<MaximumElapsedMsScenarioCaseEntity.Type, 'default-behavior'>): Promise<void> {
    const { expected, input } = scenario;
    const operation = new FailingOperation(String(input.errorMessage), Number(input.delayMs));
    const retry = Retry.create({
      'errorClassifier': RetryClassifier.retryable,
      ...input.retry
    });

    await assert.rejects(retry.execute(operation.run), MaximumRetriesExceededError);

    assert.strictEqual(operation.attempts, Number(expected.attempts));
    assert.strictEqual(retry.getStats().totalRetries, Number(expected.totalRetries));
  }

  static async 'time-wins'(scenario: ScenarioCaseOfType<MaximumElapsedMsScenarioCaseEntity.Type, 'time-wins'>): Promise<void> {
    const { expected, input } = scenario;
    const maximumElapsedMs = Number(input.retry?.maximumElapsedMs);
    const operation = new FailingOperation(String(input.errorMessage), Number(input.delayMs));

    const retry = Retry.create({
      'errorClassifier': RetryClassifier.retryable,
      ...input.retry
    });

    const start = Date.now();

    await assert.rejects(retry.execute(operation.run), MaximumRetriesExceededError);

    const elapsed = Date.now() - start;
    assert.ok(operation.attempts < Number(expected.attemptsLessThan));
    assert.ok(elapsed < maximumElapsedMs * Number(expected.elapsedLessThanFactor));
  }

  static declareInjectsClockElapsedTime(): void {
    void it('measures the elapsed-time budget with an injected clock', async () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const clock = VirtualClockProvider.create(counter);
      const retry = Retry.create({
        'clock': clock,
        'errorClassifier': RetryClassifier.retryable,
        'maximumElapsedMs': 5,
        'maximumRetries': 3
      });

      const operation = (): Promise<string> => {
        counter.advance(6);
        const failure = Promise.reject(RuntimeError.create('transient failure'));
        return failure;
      };

      await assert.rejects(retry.execute(operation), MaximumRetriesExceededError);
      assert.equal(retry.getStats().totalRetries, 0);
    });
  }
}

ScenarioSuite.register({
  'entity': MaximumElapsedMsScenarioCaseEntity,
  'extraTests': MaximumElapsedMsRunners.declareInjectsClockElapsedTime,
  'file': scenarioGroups,
  'name': 'Retry maximumElapsedMs',
  'runners': MaximumElapsedMsRunners
});
