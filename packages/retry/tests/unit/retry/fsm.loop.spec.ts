import { RuntimeError, DefaultHttpErrorClassifier } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';



import type { RetryCallStateEntity } from '../../../src/entities/RetryCallStateEntity.js';
import type { RetryConfigInterface } from '../../../src/interfaces/index.js';
import type { RetryContextInterface } from '../../../src/interfaces/RetryContextInterface.js';

import { MaximumRetriesExceededError } from '../../../src/errors/index.js';
import { Retry } from '../../../src/retry/index.js';
import scenarioGroups from './fsm.scenarios.json' with { type: 'json' };

type TransitionRecord = { from: RetryCallStateEntity.Type; to: RetryCallStateEntity.Type };

type ScenarioShape =
  | 'aborted-by-hook'
  | 'exhausted-after-max-elapsed'
  | 'exhausted-after-max-retries'
  | 'illegal-transition'
  | 'immediate-success'
  | 'non-retryable-error'
  | 'retryable-failure-then-success';

type ScenarioCase = {
  description: string;
  expected: {
    errorMessageIncludes?: string;
    errorName?: string;
    exhausted?: TransitionRecord;
    result?: string;
    transitions?: TransitionRecord[];
  };
  input: {
    batch?: {
      failureCountBeforeSuccess?: number;
    };
    errorMessage?: string;
    maximumElapsedMs?: number;
    maximumRetries: number;
    rejectedTransition?: TransitionRecord;
    result?: string;
  };
  shape: ScenarioShape;
  name: string;
};

class TrackingRetry extends Retry {
  readonly transitions: TransitionRecord[] = [];

  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  override enterCall(to: RetryCallStateEntity.Type, from: RetryCallStateEntity.Type): void {
    this.transitions.push({ from, to });
  }
}

class AlwaysNonRetryableClassifier {
  classify(_error: Error, _attemptNumber: number): { retryable: false; reason: string } {
    return { retryable: false, reason: 'always non-retryable' };
  }
}

class AbortingTrackingRetry extends TrackingRetry {
  protected override onRetryScheduled(context: RetryContextInterface): void {
    context.abort = true;
    context.delayMs = 0;
  }
}

type AttemptOutcome = 'failure' | 'success';

function resolveAttemptOutcome(callCount: number, scenarioCase: ScenarioCase): AttemptOutcome {
  return callCount <= Number(scenarioCase.input.batch?.failureCountBeforeSuccess ?? 0) ? 'failure' : 'success';
}

const runnerMap: Record<ScenarioShape, (scenarioCase: ScenarioCase) => Promise<void>> = {
  'aborted-by-hook': async (scenarioCase) => {
    const retry = new AbortingTrackingRetry({
      errorClassifier: DefaultHttpErrorClassifier.create(),
      maximumRetries: scenarioCase.input.maximumRetries
    });

    await assert.rejects(
      () => retry.execute(async () => { throw RuntimeError.create('will be aborted'); }),
      MaximumRetriesExceededError
    );
    assert.deepStrictEqual(retry.transitions, scenarioCase.expected.transitions);
  },
  'exhausted-after-max-retries': async (scenarioCase) => {
    const retry = new TrackingRetry({
      errorClassifier: DefaultHttpErrorClassifier.create(),
      maximumRetries: scenarioCase.input.maximumRetries
    });

    await assert.rejects(
      () => retry.execute(async () => { throw RuntimeError.create('always fails'); }),
      MaximumRetriesExceededError
    );

    assert.deepStrictEqual(retry.transitions.find((transition) => transition.to === 'exhausted'), scenarioCase.expected.exhausted);
  },
  'exhausted-after-max-elapsed': async (scenarioCase) => {
    const retry = new TrackingRetry({
      errorClassifier: DefaultHttpErrorClassifier.create(),
      ...(scenarioCase.input.maximumElapsedMs === undefined ? {} : { maximumElapsedMs: scenarioCase.input.maximumElapsedMs }),
      maximumRetries: scenarioCase.input.maximumRetries
    });

    await assert.rejects(
      () => retry.execute(async () => { throw RuntimeError.create('elapsed budget'); }),
      MaximumRetriesExceededError
    );

    assert.deepStrictEqual(retry.transitions.find((transition) => transition.to === 'exhausted'), scenarioCase.expected.exhausted);
  },
  'immediate-success': async (scenarioCase) => {
    const retry = new TrackingRetry({
      errorClassifier: DefaultHttpErrorClassifier.create(),
      maximumRetries: scenarioCase.input.maximumRetries
    });

    const result = await retry.execute(async () => scenarioCase.input.result);
    assert.equal(result, scenarioCase.expected.result);
    assert.deepStrictEqual(retry.transitions, scenarioCase.expected.transitions);
  },
  'illegal-transition': async (scenarioCase) => {
    const { rejectedTransition: maybeRejectedTransition } = scenarioCase.input;
    if (maybeRejectedTransition === undefined) {
      throw RuntimeError.create('Scenario input.rejectedTransition is required');
    }
    const rejectedTransition: NonNullable<typeof maybeRejectedTransition> = maybeRejectedTransition;

    class GuardRejectingRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      override guardCall(from: RetryCallStateEntity.Type, to: RetryCallStateEntity.Type): boolean {
        const rejected = from === rejectedTransition.from && to === rejectedTransition.to;
        return !rejected && super.guardCall(from, to);
      }
    }

    const retry = new GuardRejectingRetry({
      errorClassifier: DefaultHttpErrorClassifier.create(),
      maximumRetries: scenarioCase.input.maximumRetries
    });

    await assert.rejects(
      () => retry.execute(async () => 'should not reach caller'),
      // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- errorMessageIncludes is repo-authored fixture data, not attacker input
      new RegExp(String(scenarioCase.expected.errorMessageIncludes))
    );
  },
  'non-retryable-error': async (scenarioCase) => {
    const retry = new TrackingRetry({
      errorClassifier: new AlwaysNonRetryableClassifier(),
      maximumRetries: scenarioCase.input.maximumRetries
    });

    await assert.rejects(
      () => retry.execute(async () => { throw RuntimeError.create('fatal'); }),
      { 'name': String(scenarioCase.expected.errorName) }
    );
    assert.deepStrictEqual(retry.transitions, scenarioCase.expected.transitions);
  },
  'retryable-failure-then-success': async (scenarioCase) => {
    const retry = new TrackingRetry({
      errorClassifier: DefaultHttpErrorClassifier.create(),
      maximumRetries: scenarioCase.input.maximumRetries
    });

    let callCount = 0;
    const result = await retry.execute(async () => {
      callCount += 1;

      const attemptMap: Record<AttemptOutcome, () => string> = {
        'failure': () => {
          throw RuntimeError.create(String(scenarioCase.input.errorMessage));
        },
        'success': () => String(scenarioCase.input.result)
      };

      return attemptMap[resolveAttemptOutcome(callCount, scenarioCase)]();
    });

    assert.equal(result, scenarioCase.expected.result);
    assert.deepStrictEqual(retry.transitions, scenarioCase.expected.transitions);
  }
};

void describe('Retry FSM', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runnerMap[scenario.shape](scenario);
    });
  }
});
