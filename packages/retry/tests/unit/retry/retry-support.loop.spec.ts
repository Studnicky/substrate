import { SchemaIntakeError } from '@studnicky/entity/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { RuntimeError, DefaultHttpErrorClassifier } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConfigurationError } from '@studnicky/config/node';

import {
  BackoffStrategy,
  Retry
} from '../../../src/index.js';
import { BackoffConfigEntity, RetryCallStateEntity, RetryCallTransitionEventEntity, RetryConfigEntity, RetryContextDataEntity } from '../../../src/entities/index.js';
import type {
  RetryConfigInterface,
  RetryContextInterface
} from '../../../src/interfaces/index.js';
import { RetryBackoffStrategyGuard } from '../../../src/retry/RetryBackoffStrategyGuard.js';
import { RetrySupportScenarioCaseEntity } from '../entities/RetrySupportScenarioCaseEntity.js';
import scenarioGroups from './retry-support.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(RetrySupportScenarioCaseEntity.Schema, RetrySupportScenarioCaseEntity.Node);

type ScenarioShape = RetrySupportScenarioCaseEntity.Type['shape'];

type RetrySupportInput = RetrySupportScenarioCaseEntity.Type['input'];

type ScenarioCase = RetrySupportScenarioCaseEntity.Type;

/** Reads a property off a deliberately-untrusted `retry`/`value` fixture field without asserting its shape. */
function readUnknownProperty(source: unknown, key: string): unknown {
  return typeof source === 'object' && source !== null ? Reflect.get(source, key) : undefined;
}

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
  const baseDelayMs = readUnknownProperty(config, 'baseDelayMs');
  return {
    'baseDelayMs': typeof baseDelayMs === 'number' ? baseDelayMs : 100,
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
        throw RuntimeError.create(String(input.errorMessage));
      },
      'success': () => String(input.result)
    };

    return attemptMap[resolveAttemptOutcome(callCount, input)]();
  });
}

function assertConfigGuard(scenarioCase: ScenarioCase): void {
  const { expected, input } = scenarioCase;

  if (expected.result === true) {
    assert.doesNotThrow(() => {
      RetryConfigEntity.intake(input.retry ?? {});
    });
  } else {
    assert.throws(() => {
      RetryConfigEntity.intake(input.retry ?? {});
    }, SchemaIntakeError);
  }
}

function assertBackoffStrategyRejected(scenarioCase: ScenarioCase): void {
  const { input } = scenarioCase;

  assert.throws(() => {
    RetryBackoffStrategyGuard.validate({ 'backoffStrategy': readUnknownProperty(input.retry, 'backoffStrategy') });
  }, ConfigurationError);
}

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'backoff-config-default': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const retry = new RecordingRetry({
      'errorClassifier': DefaultHttpErrorClassifier.create(),
      'maximumRetries': Number(readUnknownProperty(input.retry, 'maximumRetries'))
    });

    await executeUntilConfiguredSuccess(retry, input);

    assert.deepEqual(retry.recordedDelays, expected.recordedDelays);
  },
  'backoff-config-exponential': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const retry = new RecordingRetry({
      'backoffStrategy': createBackoffConfig(readUnknownProperty(input.retry, 'backoffStrategy')),
      'errorClassifier': DefaultHttpErrorClassifier.create(),
      'maximumRetries': Number(readUnknownProperty(input.retry, 'maximumRetries'))
    });

    await executeUntilConfiguredSuccess(retry, input);

    assert.deepEqual(retry.recordedDelays, expected.recordedDelays);
  },
  'backoff-config-override': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const retry = new OverridingRetry({
      'backoffStrategy': createBackoffConfig(readUnknownProperty(input.retry, 'backoffStrategy')),
      'errorClassifier': DefaultHttpErrorClassifier.create(),
      'maximumRetries': Number(readUnknownProperty(input.retry, 'maximumRetries'))
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

void it('intakes only the serializable retry configuration', () => {
  const parsed = RetryConfigEntity.intake({
    'hookTimeoutMs': 50,
    'maximumElapsedMs': 500,
    'maximumRetries': 3
  });

  assert.deepEqual(parsed, {
    'hookTimeoutMs': 50,
    'maximumElapsedMs': 500,
    'maximumRetries': 3
  });
  assert.throws(() => RetryConfigEntity.intake({ 'unknown': true }));
});

void describe('Retry support', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});


void it('validates complete retry call state and transition objects', () => {
  assert.equal(RetryCallStateEntity.validate({ 'variant': 'attempting' }), true);
  assert.equal(RetryCallStateEntity.validate('attempting'), false);
  assert.equal(RetryCallTransitionEventEntity.validate({ 'to': 'succeeded', 'type': 'transitionTo' }), true);
  assert.equal(RetryCallTransitionEventEntity.validate({ 'type': 'transitionTo' }), false);
});
