import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { ConfigurationError } from '@studnicky/config';
import { DefaultHttpErrorClassifier } from '@studnicky/errors';

import {
  BackoffStrategy,
  Retry,
  RetryConfigGuard
} from '../../../src/index.js';
import { BackoffConfigEntity, RetryContextDataEntity } from '../../../src/entities/index.js';
import type {
  RetryConfigInterface,
  RetryContextInterface
} from '../../../src/interfaces/index.js';
import scenarioGroups from './retry-support.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'backoff-config-default'
  | 'backoff-config-exponential'
  | 'backoff-config-override'
  | 'backoff-strategy-bad-delay'
  | 'backoff-strategy-missing-fn'
  | 'backoff-strategy-non-object'
  | 'config-guard-bad-type'
  | 'config-guard-unknown-key'
  | 'config-guard-valid'
  | 'decorrelated-jitter-0'
  | 'decorrelated-jitter-lower-bound'
  | 'decorrelated-jitter-upper-bound'
  | 'decorrelated-jitter-varying'
  | 'entity-backoff-config'
  | 'entity-retry-context';

type RetrySupportInput = Record<string, unknown> & {
  attempt?: number;
  batch?: {
    failureCountBeforeSuccess?: number;
    sampleCount?: number;
  };
  baseDelay?: number;
  errorMessage?: string;
  result?: string;
  retry?: Record<string, unknown> & {
    backoffStrategy?: unknown;
    maximumRetries?: unknown;
  };
  value?: Record<string, unknown>;
};

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: RetrySupportInput;
  shape: ScenarioShape;
  name: string;
};

class RecordingRetry extends Retry {
  readonly recordedDelays: number[] = [];

  constructor(config?: RetryConfigInterface) {
    super(config ?? {});
  }

  protected override async onRetryScheduled(context: RetryContextInterface): Promise<void> {
    await super.onRetryScheduled(context);
    this.recordedDelays.push(context.delayMs);
    context.delayMs = 0;
  }
}

class OverridingRetry extends Retry {
  readonly overrideDelays: number[] = [];

  constructor(config?: RetryConfigInterface) {
    super(config ?? {});
  }

  protected override onRetryScheduled(context: RetryContextInterface): void {
    context.delayMs = 0;
    this.overrideDelays.push(context.delayMs);
  }
}

function createBackoffConfig(config: unknown): { baseDelayMs: number; strategy: typeof BackoffStrategy.exponential } {
  return {
    'baseDelayMs': typeof config === 'object' && config !== null ? Number(Reflect.get(config, 'baseDelayMs') ?? 100) : 100,
    'strategy': BackoffStrategy.exponential
  };
}

type AttemptOutcome = 'failure' | 'success';

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

function resolveAttemptOutcome(callCount: number, input: RetrySupportInput): AttemptOutcome {
  return callCount <= Number(input.batch?.failureCountBeforeSuccess ?? 0) ? 'failure' : 'success';
}

function readBatchSampleCount(input: RetrySupportInput): number {
  return Number(input.batch?.sampleCount);
}

async function executeUntilConfiguredSuccess(retry: Retry, input: RetrySupportInput): Promise<void> {
  let callCount = 0;

  await retry.execute(async () => {
    callCount += 1;

    const attemptMap: Record<AttemptOutcome, () => string> = {
      'failure': () => {
        throw new Error(String(input.errorMessage));
      },
      'success': () => String(input.result)
    };

    return attemptMap[resolveAttemptOutcome(callCount, input)]();
  });
}

function assertConfigGuard(scenarioCase: ScenarioCase): void {
  const { expected, input } = scenarioCase;
  const createSpy = mock.method(DefaultHttpErrorClassifier, 'create');

  try {
    const result = RetryConfigGuard.isRetryConfig(input.retry ?? {});
    assert.equal(result, Boolean(expected.result));
    assert.equal(createSpy.mock.callCount(), Number(expected.classifierCalls));
  } finally {
    createSpy.mock.restore();
  }
}

function assertBackoffStrategyRejected(scenarioCase: ScenarioCase): void {
  const { input } = scenarioCase;

  assert.throws(() => {
    Retry.create({
      backoffStrategy: input.retry?.backoffStrategy as never,
      maximumRetries: Number(input.retry?.maximumRetries)
    });
  }, ConfigurationError);
}

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'backoff-config-default': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const retry = new RecordingRetry({
      'errorClassifier': DefaultHttpErrorClassifier.create(),
      'maximumRetries': Number(input.retry?.maximumRetries)
    });

    await executeUntilConfiguredSuccess(retry, input);

    assert.deepEqual(retry.recordedDelays, expected.recordedDelays);
  },
  'backoff-config-exponential': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const retry = new RecordingRetry({
      'backoffStrategy': createBackoffConfig(input.retry?.backoffStrategy),
      'errorClassifier': DefaultHttpErrorClassifier.create(),
      'maximumRetries': Number(input.retry?.maximumRetries)
    });

    await executeUntilConfiguredSuccess(retry, input);

    assert.deepEqual(retry.recordedDelays, expected.recordedDelays);
  },
  'backoff-config-override': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const retry = new OverridingRetry({
      'backoffStrategy': createBackoffConfig(input.retry?.backoffStrategy),
      'errorClassifier': DefaultHttpErrorClassifier.create(),
      'maximumRetries': Number(input.retry?.maximumRetries)
    });

    await executeUntilConfiguredSuccess(retry, input);

    assert.deepEqual(retry.overrideDelays, expected.overrideDelays);
    assert.equal(retry.overrideDelays.every((delay) => delay === 0), true);
  },
  'backoff-strategy-bad-delay': assertBackoffStrategyRejected,
  'backoff-strategy-missing-fn': assertBackoffStrategyRejected,
  'backoff-strategy-non-object': assertBackoffStrategyRejected,
  'config-guard-bad-type': assertConfigGuard,
  'config-guard-unknown-key': assertConfigGuard,
  'config-guard-valid': assertConfigGuard,
  'decorrelated-jitter-0': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const baseDelay = Number(input.baseDelay);
    assert.equal(BackoffStrategy.decorrelatedJitter(0, baseDelay), Number(expected.delay));
  },
  'decorrelated-jitter-lower-bound': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const baseDelay = Number(input.baseDelay);

    for (let attempt = 1; attempt <= readBatchSampleCount(input) / 20; attempt += 1) {
      for (let sample = 0; sample < 20; sample += 1) {
        const delay = BackoffStrategy.decorrelatedJitter(attempt, baseDelay);
        assert.ok(delay >= Number(expected.minDelay), `Attempt ${attempt}: delay ${delay} should be >= baseDelay ${baseDelay}`);
      }
    }
  },
  'decorrelated-jitter-upper-bound': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const baseDelay = Number(input.baseDelay);
    const maxDelay = Number(expected.maxDelay);

    for (let attempt = 0; attempt <= readBatchSampleCount(input) / 20 - 1; attempt += 1) {
      for (let sample = 0; sample < 20; sample += 1) {
        const delay = BackoffStrategy.decorrelatedJitter(attempt, baseDelay);
        assert.ok(delay <= maxDelay, `Attempt ${attempt}: delay ${delay} should be <= maxDelay ${maxDelay}`);
      }
    }
  },
  'decorrelated-jitter-varying': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const attempt = Number(input.attempt);
    const baseDelay = Number(input.baseDelay);
    const results = new Set<number>();

    for (let sample = 0; sample < readBatchSampleCount(input); sample += 1) {
      results.add(BackoffStrategy.decorrelatedJitter(attempt, baseDelay));
    }

    assert.ok(results.size > Number(expected.distinctResultsGreaterThan), 'Decorrelated jitter should produce varying results across calls');
  },
  'entity-backoff-config': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    assert.equal(BackoffConfigEntity.validate(input.value ?? { 'baseDelayMs': 25 }), Boolean(expected.valid));
    assert.equal(BackoffConfigEntity.validate({ 'baseDelayMs': -1 }), Boolean(expected.invalid));
  },
  'entity-retry-context': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    assert.equal(RetryContextDataEntity.validate(input.value ?? {
      'abort': false,
      'attemptNumber': 1,
      'delayMs': 25,
      'elapsedMs': 100
    }), Boolean(expected.valid));
    assert.equal(RetryContextDataEntity.validate({
      'attemptNumber': -1,
      'delayMs': 25,
      'elapsedMs': 100
    }), Boolean(expected.invalid));
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Retry support', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
