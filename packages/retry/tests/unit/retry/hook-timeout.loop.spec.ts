import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RetryConfigInterface } from '../../../src/interfaces/index.js';
import type { RetryCallStateEntity } from '../../../src/entities/RetryCallStateEntity.js';

import { Retry } from '../../../src/retry/index.js';
import scenarioGroups from './hook-timeout.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; shape: 'enter-call-unset' | 'fast-hook' | 'hung-attempt-with-timeout' | 'hung-attempt-without-timeout' | 'hung-give-up-with-timeout' | 'hung-retry-scheduled'; name: string };

type RetryScenarioInput = Record<string, unknown> & {
  batch?: { failureCountBeforeSuccess?: number };
  retry?: Partial<Pick<RetryConfigInterface, 'hookTimeoutMs' | 'maximumRetries'>>;
};

type AttemptOutcome = 'failure' | 'success';

type ScenarioRunner = (scenario: ScenarioCase) => Promise<void>;

function resolveAttemptOutcome(attempts: number, input: RetryScenarioInput): AttemptOutcome {
  return attempts <= Number(input.batch?.failureCountBeforeSuccess ?? 0) ? 'failure' : 'success';
}

async function executeUntilConfiguredSuccess(retry: Retry, input: RetryScenarioInput): Promise<{ attempts: number; result: string }> {
  let attempts = 0;

  const result = await retry.execute(async () => {
    attempts += 1;

    const attemptMap: Record<AttemptOutcome, () => string> = {
      'failure': () => {
        throw new Error(String(input.errorMessage));
      },
      'success': () => String(input.result)
    };

    return attemptMap[resolveAttemptOutcome(attempts, input)]();
  });

  return { attempts, result };
}

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'enter-call-unset': async (scenario) => {
    const { expected, input } = scenario;

    class ThrowingEnterCallRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override enterCall(_to: RetryCallStateEntity.Type, _from: RetryCallStateEntity.Type): void {
        throw new Error(String(input.message));
      }
    }

    const retry = new ThrowingEnterCallRetry(input.retry ?? {});
    const result = await retry.execute(async () => String(input.result));
    assert.strictEqual(result, String(expected.result));
  },
  'fast-hook': async (scenario) => {
    const { expected, input } = scenario;

    class FastHookRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override async onAttempt(): Promise<void> {
        await new Promise<void>((resolve) => { setTimeout(resolve, 1); });
      }
    }

    const retry = new FastHookRetry(input.retry ?? {});
    const result = await retry.execute(async () => {
      await new Promise<void>((resolve) => { setTimeout(resolve, Number(input.delayMs)); });
      return String(input.result);
    });
    assert.strictEqual(result, String(expected.result));
  },
  'hung-attempt-with-timeout': async (scenario) => {
    const { expected, input } = scenario;

    class HangingAttemptRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override onAttempt(): Promise<void> {
        return new Promise<void>(() => {});
      }
    }

    const retry = new HangingAttemptRetry(input.retry ?? {});
    const startedAt = Date.now();
    const result = await retry.execute(async () => String(input.result));
    const elapsedMs = Date.now() - startedAt;

    assert.strictEqual(result, String(expected.result));
    assert.ok(elapsedMs < Number(expected.elapsedLessThanMs));
  },
  'hung-attempt-without-timeout': async (scenario) => {
    const { expected, input } = scenario;

    class HangingAttemptRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override onAttempt(): Promise<void> {
        return new Promise<void>(() => {});
      }
    }

    const retry = new HangingAttemptRetry(input.retry ?? {});
    const raceResult = await Promise.race([
      retry.execute(async () => String(input.result ?? 'ok')),
      new Promise<'timed-out'>((resolve) => { setTimeout(() => { resolve('timed-out'); }, 100); })
    ]);

    assert.strictEqual(raceResult, String(expected.raceResult));
  },
  'hung-give-up-with-timeout': async (scenario) => {
    const { expected, input } = scenario;

    class HangingGiveUpRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override onGiveUp(): Promise<void> {
        return new Promise<void>(() => {});
      }
    }

    const retry = new HangingGiveUpRetry({
      errorClassifier: () => ({ reason: 'fatal', retryable: false }),
      ...input.retry
    });

    const startedAt = Date.now();
    await assert.rejects(
      () => retry.execute(async () => { throw new Error(String(input.errorMessage)); }),
      { 'name': String(expected.errorShape) }
    );
    const elapsedMs = Date.now() - startedAt;

    assert.ok(elapsedMs < Number(expected.elapsedLessThanMs));
  },
  'hung-retry-scheduled': async (scenario) => {
    const { expected, input } = scenario;

    class HangingRetryScheduledRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override onRetryScheduled(): Promise<void> {
        return new Promise<void>(() => {});
      }
    }

    const retry = new HangingRetryScheduledRetry({
      errorClassifier: () => ({ retryable: true }),
      ...input.retry
    });
    const startedAt = Date.now();
    const { attempts, result } = await executeUntilConfiguredSuccess(retry, input);
    const elapsedMs = Date.now() - startedAt;

    assert.strictEqual(result, String(expected.result));
    assert.strictEqual(attempts, Number(expected.attempts));
    assert.ok(elapsedMs < Number(expected.elapsedLessThanMs));
  }
};

async function runCase(scenario: ScenarioCase): Promise<void> {
  await runnerMap[scenario.shape](scenario);
}

void describe('Retry hook timeouts', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
