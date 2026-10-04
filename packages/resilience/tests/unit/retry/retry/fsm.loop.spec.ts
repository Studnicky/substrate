import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { RetryCallStateEntity } from '../../../../src/retry/entities/RetryCallStateEntity.js';
import type { RetryConfigInterface } from '../../../../src/retry/interfaces/index.js';
import type { RetryContextInterface } from '../../../../src/retry/interfaces/RetryContextInterface.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { MaximumRetriesExceededError } from '../../../../src/retry/errors/index.js';
import { Retry } from '../../../../src/retry/retry/index.js';
import { FsmScenarioCaseEntity } from '../entities/FsmScenarioCaseEntity.js';
import { FailingOperation } from './fixtures/FailingOperation.js';
import { FlakyOperation } from './fixtures/FlakyOperation.js';
import { ResolvingOperation } from './fixtures/ResolvingOperation.js';
import { RetryClassifier } from './fixtures/RetryClassifier.js';
import { RetryFixture } from './fixtures/RetryFixture.js';
import scenarioGroups from './fsm.scenarios.json' with { 'type': 'json' };

interface TransitionRecordInterface {
  readonly 'from': string;
  readonly 'to': string;
}

class TrackingRetry extends Retry {
  readonly transitions: TransitionRecordInterface[] = [];

  constructor(config: RetryConfigInterface) {
    super(config);
  }

  override enterCall(to: RetryCallStateEntity.Type, from: RetryCallStateEntity.Type): void {
    this.transitions.push({ 'from': from.variant, 'to': to.variant });
  }
}

class AlwaysNonRetryableClassifier {
  classify(_error: Error, _attemptNumber: number): { 'reason': string; 'retryable': false; } {
    const classification = { 'reason': 'always non-retryable', 'retryable': false } as const;
    return classification;
  }
}

class AbortingTrackingRetry extends TrackingRetry {
  protected override onRetryScheduled(context: RetryContextInterface): void {
    context.abort = true;
    context.delayMs = 0;
  }
}

class FsmRunners {
  private static findExhausted(retry: TrackingRetry): TransitionRecordInterface | undefined {
    const exhausted = retry.transitions.find((transition) => {
      const isExhausted = transition.to === 'exhausted';
      return isExhausted;
    });
    return exhausted;
  }

  static async 'aborted-by-hook'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'aborted-by-hook'>): Promise<void> {
    const retry = new AbortingTrackingRetry({
      'errorClassifier': RetryClassifier.retryable,
      'maximumRetries': scenarioCase.input.maximumRetries
    });

    await assert.rejects(retry.execute(new FailingOperation('will be aborted').run), MaximumRetriesExceededError);
    assert.deepStrictEqual(retry.transitions, scenarioCase.expected.transitions);
  }

  static async 'exhausted-after-max-elapsed'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'exhausted-after-max-elapsed'>): Promise<void> {
    const retry = new TrackingRetry({
      'errorClassifier': RetryClassifier.retryable,
      ...(scenarioCase.input.maximumElapsedMs === undefined ? {} : { 'maximumElapsedMs': scenarioCase.input.maximumElapsedMs }),
      'maximumRetries': scenarioCase.input.maximumRetries
    });

    await assert.rejects(retry.execute(new FailingOperation('elapsed budget').run), MaximumRetriesExceededError);

    assert.deepStrictEqual(FsmRunners.findExhausted(retry), scenarioCase.expected.exhausted);
  }

  static async 'exhausted-after-max-retries'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'exhausted-after-max-retries'>): Promise<void> {
    const retry = new TrackingRetry({
      'errorClassifier': RetryClassifier.retryable,
      'maximumRetries': scenarioCase.input.maximumRetries
    });

    await assert.rejects(retry.execute(new FailingOperation('always fails').run), MaximumRetriesExceededError);

    assert.deepStrictEqual(FsmRunners.findExhausted(retry), scenarioCase.expected.exhausted);
  }

  static async 'illegal-transition'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'illegal-transition'>): Promise<void> {
    const rejectedTransition = ScenarioValues.requireDefined(scenarioCase.input.rejectedTransition, 'input.rejectedTransition');

    class GuardRejectingRetry extends Retry {
      constructor(config?: RetryConfigInterface) {
        super(RetryFixture.options(config));
      }

      override guardCall(from: RetryCallStateEntity.Type, to: RetryCallStateEntity.Type): boolean {
        const rejected = from.variant === rejectedTransition.from && to.variant === rejectedTransition.to;
        const allowed = rejected === false && super.guardCall(from, to);
        return allowed;
      }
    }

    const retry = new GuardRejectingRetry({
      'errorClassifier': RetryClassifier.retryable,
      'maximumRetries': scenarioCase.input.maximumRetries
    });

    const expectedFragment = String(scenarioCase.expected.errorMessageIncludes);
    await assert.rejects(retry.execute(ResolvingOperation.of('should not reach caller')), (error) => {
      const caught: unknown = error;
      const includesFragment = caught instanceof Error && caught.message.includes(expectedFragment);
      return includesFragment;
    });
  }

  static async 'immediate-success'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'immediate-success'>): Promise<void> {
    const retry = new TrackingRetry({
      'errorClassifier': RetryClassifier.retryable,
      'maximumRetries': scenarioCase.input.maximumRetries
    });

    const result = await retry.execute(ResolvingOperation.of(String(scenarioCase.input.result)));
    assert.equal(result, scenarioCase.expected.result);
    assert.deepStrictEqual(retry.transitions, scenarioCase.expected.transitions);
  }

  static async 'non-retryable-error'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'non-retryable-error'>): Promise<void> {
    const retry = new TrackingRetry({
      'errorClassifier': new AlwaysNonRetryableClassifier(),
      'maximumRetries': scenarioCase.input.maximumRetries
    });

    await assert.rejects(
      retry.execute(new FailingOperation('fatal').run),
      { 'name': String(scenarioCase.expected.errorName) }
    );
    assert.deepStrictEqual(retry.transitions, scenarioCase.expected.transitions);
  }

  static async 'retryable-failure-then-success'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'retryable-failure-then-success'>): Promise<void> {
    const retry = new TrackingRetry({
      'errorClassifier': RetryClassifier.retryable,
      'maximumRetries': scenarioCase.input.maximumRetries
    });

    const { result } = await FlakyOperation.execute(retry, Number(scenarioCase.input.batch?.failureCountBeforeSuccess ?? 0), String(scenarioCase.input.errorMessage), String(scenarioCase.input.result));

    assert.equal(result, scenarioCase.expected.result);
    assert.deepStrictEqual(retry.transitions, scenarioCase.expected.transitions);
  }
}

ScenarioSuite.register({
  'entity': FsmScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Retry FSM',
  'runners': FsmRunners
});
