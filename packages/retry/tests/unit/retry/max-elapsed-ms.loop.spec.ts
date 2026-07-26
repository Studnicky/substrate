import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MaxRetriesExceededError } from '../../../src/errors/index.js';
import { Retry } from '../../../src/retry/index.js';
import type { RetryConfigInterface } from '../../../src/interfaces/index.js';
import scenarioGroups from './max-elapsed-ms.scenarios.json' with { type: 'json' };

type RetryScenarioInput = Record<string, unknown> & {
  retry?: Partial<Pick<RetryConfigInterface, 'maxElapsedMs' | 'maxRetries'>>;
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
        throw new Error(String(input.errorMessage));
      }),
      MaxRetriesExceededError
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
        throw new Error(String(input.errorMessage));
      }),
      MaxRetriesExceededError
    );

    assert.strictEqual(attempts, Number(expected.attempts));
    assert.strictEqual(retry.getStats().totalRetries, Number(expected.totalRetries));
  },
  'time-wins': async (scenario) => {
    const { expected, input } = scenario;
    const maxElapsedMs = Number(input.retry?.maxElapsedMs);
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
        throw new Error(String(input.errorMessage));
      }),
      MaxRetriesExceededError
    );

    const elapsed = Date.now() - start;
    assert.ok(attempts < Number(expected.attemptsLessThan));
    assert.ok(elapsed < maxElapsedMs * Number(expected.elapsedLessThanFactor));
  }
};

async function runCase(scenario: ScenarioCase): Promise<void> {
  await runnerMap[scenario.shape](scenario);
}

void describe('Retry maxElapsedMs', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
