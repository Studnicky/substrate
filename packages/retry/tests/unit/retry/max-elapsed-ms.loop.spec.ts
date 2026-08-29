import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MaximumRetriesExceededError } from '../../../src/errors/index.js';
import { Retry } from '../../../src/retry/index.js';
import type { RetryConfigInterface } from '../../../src/interfaces/index.js';
import scenarioGroups from './max-elapsed-ms.scenarios.json' with { type: 'json' };

type RetryScenarioInput = Record<string, unknown> & {
  retry?: Partial<Pick<RetryConfigInterface, 'maximumElapsedMs' | 'maximumRetries'>>;
};

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; shape: 'configured-not-reached' | 'count-wins' | 'default-behavior' | 'time-wins'; name: string };

type ScenarioRunner = (scenario: ScenarioCase) => Promise<void>;

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'configured-not-reached': async (scenario) => {
    const { expected, input } = scenario;
    const retry = Retry.create({
      errorClassifier: () => ({ retryable: true }),
      ...input.retry
    });

    const result = await retry.execute(async () => String(input.result));
    assert.strictEqual(result, String(expected.result));
  },
  'count-wins': async (scenario) => {
    const { expected, input } = scenario;
    let attempts = 0;

    const retry = Retry.create({
      errorClassifier: () => ({ retryable: true }),
      ...input.retry
    });

    await assert.rejects(
      () => retry.execute(async () => {
        attempts += 1;
        throw RuntimeError.create(String(input.errorMessage));
      }),
      MaximumRetriesExceededError
    );

    assert.strictEqual(attempts, Number(expected.attempts));
    assert.strictEqual(retry.getStats().totalRetries, Number(expected.totalRetries));
  },
  'default-behavior': async (scenario) => {
    const { expected, input } = scenario;
    let attempts = 0;
    const retry = Retry.create({
      errorClassifier: () => ({ retryable: true }),
      ...input.retry
    });

    await assert.rejects(
      () => retry.execute(async () => {
        attempts += 1;
        await new Promise((resolve) => setTimeout(resolve, Number(input.delayMs)));
        throw RuntimeError.create(String(input.errorMessage));
      }),
      MaximumRetriesExceededError
    );

    assert.strictEqual(attempts, Number(expected.attempts));
    assert.strictEqual(retry.getStats().totalRetries, Number(expected.totalRetries));
  },
  'time-wins': async (scenario) => {
    const { expected, input } = scenario;
    const maximumElapsedMs = Number(input.retry?.maximumElapsedMs);
    let attempts = 0;

    const retry = Retry.create({
      errorClassifier: () => ({ retryable: true }),
      ...input.retry
    });

    const start = Date.now();

    await assert.rejects(
      () => retry.execute(async () => {
        attempts += 1;
        await new Promise((resolve) => setTimeout(resolve, Number(input.delayMs)));
        throw RuntimeError.create(String(input.errorMessage));
      }),
      MaximumRetriesExceededError
    );

    const elapsed = Date.now() - start;
    assert.ok(attempts < Number(expected.attemptsLessThan));
    assert.ok(elapsed < maximumElapsedMs * Number(expected.elapsedLessThanFactor));
  }
};

async function runCase(scenario: ScenarioCase): Promise<void> {
  await runnerMap[scenario.shape](scenario);
}

void describe('Retry maximumElapsedMs', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
