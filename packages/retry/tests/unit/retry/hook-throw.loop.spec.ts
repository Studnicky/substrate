import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RetryConfigInterface } from '../../../src/interfaces/index.js';
import type { RetryCallStateEntity } from '../../../src/entities/RetryCallStateEntity.js';
import type { ErrorClassificationEntity } from '@studnicky/errors';

import { MaxRetriesExceededError, NonRetryableError } from '../../../src/errors/index.js';
import { Retry } from '../../../src/retry/index.js';
import scenarioGroups from './hook-throw.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; shape: 'enter-call' | 'on-attempt' | 'on-give-up-exhausted' | 'on-give-up-non-retryable' | 'on-retry-scheduled' | 'on-retry-scheduled-async' | 'on-retryable-error' | 'on-success'; name: string };

type RetryScenarioInput = Record<string, unknown> & {
  batch?: { failureCountBeforeSuccess?: number };
  retry: Pick<RetryConfigInterface, 'maxRetries'>;
};

class RetryableClassifier {
  classify(_error: Error, _attemptNumber: number): ErrorClassificationEntity.Type {
    return { retryable: true };
  }
}

class NonRetryableClassifier {
  classify(_error: Error, _attemptNumber: number): ErrorClassificationEntity.Type {
    return { reason: 'fatal', retryable: false };
  }
}

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
        throw new Error(String(input.firstErrorMessage));
      },
      'success': () => String(input.result)
    };

    return attemptMap[resolveAttemptOutcome(attempts, input)]();
  });

  return { attempts, result };
}

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'enter-call': async (scenario) => {
    const { expected, input } = scenario;

    class ThrowingEnterCallRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override enterCall(_to: RetryCallStateEntity.Type, _from: RetryCallStateEntity.Type): void {
        throw new Error(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingEnterCallRetry(input.retry);
    const result = await retry.execute(async () => String(input.result));
    assert.strictEqual(result, String(expected.result));
  },
  'on-attempt': async (scenario) => {
    const { expected, input } = scenario;

    class ThrowingAttemptRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override onAttempt(): void {
        throw new Error(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingAttemptRetry(input.retry);
    const result = await retry.execute(async () => String(input.result));
    assert.strictEqual(result, String(expected.result));
  },
  'on-give-up-exhausted': async (scenario) => {
    const { expected, input } = scenario;

    class ThrowingExhaustedGiveUpRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override onGiveUp(): void {
        throw new Error(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingExhaustedGiveUpRetry({
      errorClassifier: new RetryableClassifier(),
      ...input.retry
    });

    await assert.rejects(
      () => retry.execute(async () => { throw new Error(String(input.errorMessage)); }),
      (error: unknown) => error instanceof MaxRetriesExceededError && error.name === String(expected.errorShape)
    );
  },
  'on-give-up-non-retryable': async (scenario) => {
    const { expected, input } = scenario;

    class ThrowingGiveUpRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override onGiveUp(): void {
        throw new Error(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingGiveUpRetry({
      errorClassifier: new NonRetryableClassifier(),
      ...input.retry
    });

    await assert.rejects(
      () => retry.execute(async () => { throw new Error(String(input.errorMessage)); }),
      (error: unknown) => error instanceof NonRetryableError && error.name === String(expected.errorShape)
    );
  },
  'on-retry-scheduled': async (scenario) => {
    const { expected, input } = scenario;

    class ThrowingRetryScheduledRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override onRetryScheduled(): void {
        throw new Error(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingRetryScheduledRetry({
      errorClassifier: new RetryableClassifier(),
      ...input.retry
    });
    const { attempts, result } = await executeUntilConfiguredSuccess(retry, input);

    assert.strictEqual(result, String(expected.result));
    assert.strictEqual(attempts, Number(expected.attempts));
  },
  'on-retry-scheduled-async': async (scenario) => {
    const { expected, input } = scenario;

    class RejectingRetryScheduledRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override async onRetryScheduled(): Promise<void> {
        await Promise.resolve();
        throw new Error(String(input.hookErrorMessage));
      }
    }

    const retry = new RejectingRetryScheduledRetry({
      errorClassifier: new RetryableClassifier(),
      ...input.retry
    });
    const { attempts, result } = await executeUntilConfiguredSuccess(retry, input);

    assert.strictEqual(result, String(expected.result));
    assert.strictEqual(attempts, Number(expected.attempts));
  },
  'on-retryable-error': async (scenario) => {
    const { expected, input } = scenario;

    class ThrowingRetryableErrorRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override onRetryableError(): void {
        throw new Error(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingRetryableErrorRetry({
      errorClassifier: new RetryableClassifier(),
      ...input.retry
    });
    const { attempts, result } = await executeUntilConfiguredSuccess(retry, input);

    assert.strictEqual(result, String(expected.result));
    assert.strictEqual(attempts, Number(expected.attempts));
  },
  'on-success': async (scenario) => {
    const { expected, input } = scenario;

    class ThrowingSuccessRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override onSuccess(): void {
        throw new Error(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingSuccessRetry(input.retry);
    const result = await retry.execute(async () => String(input.result));
    assert.strictEqual(result, String(expected.result));
  }
};

async function runCase(scenario: ScenarioCase): Promise<void> {
  await runnerMap[scenario.shape](scenario);
}

void describe('Retry hook throws', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
