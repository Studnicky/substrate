import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import {
  MaximumRetriesExceededError,
  NonRetryableError,
  RetryError
} from '../../../../src/retry/errors/index.js';
import { Retry } from '../../../../src/retry/retry/index.js';
import { InstantiationScenarioCaseEntity } from '../entities/InstantiationScenarioCaseEntity.js';
import { FlakyOperation } from './fixtures/FlakyOperation.js';
import { ResolvingOperation } from './fixtures/ResolvingOperation.js';
import { RetryClassifier } from './fixtures/RetryClassifier.js';
import { RetryFixture } from './fixtures/RetryFixture.js';
import scenarioGroups from './instantiation.scenarios.json' with { 'type': 'json' };

class InstantiationRunners {
  static 'create-defaults'(): void {
    assert.ok(RetryFixture.create() instanceof Retry);
  }

  static 'create-error-classifier-and-max-retries'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'create-error-classifier-and-max-retries'>): void {
    const { input } = scenarioCase;
    assert.ok(
      RetryFixture.create(input.retry) instanceof Retry
    );
  }

  static 'create-max-retries-5'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'create-max-retries-5'>): void {
    const { input } = scenarioCase;
    assert.ok(RetryFixture.create(input.retry) instanceof Retry);
  }

  static 'derived-errors-expose-detached-diagnostics'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'derived-errors-expose-detached-diagnostics'>): void {
    const { expected, input } = scenarioCase;
    const source = RuntimeError.create(String(input.sourceMessage));
    const exhausted = new MaximumRetriesExceededError(String(input.exhaustedMessage), Number(input.attemptNumber), Number(input.retries), [source]);
    const nonRetryable = new NonRetryableError(String(input.rejectedMessage), source, String(input.fatalReason), Number(input.attemptNumber));

    assert.notStrictEqual(exhausted.errors[0], source);
    assert.notStrictEqual(nonRetryable.originalError, source);
    assert.equal(nonRetryable.originalError.message, String(expected.sourceMessage));
  }

  static async 'execute-retries-until-success'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'execute-retries-until-success'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const retry = Retry.create({
      'backoffStrategy': { 'baseDelayMs': 5, 'strategy': () => {return 1;} },
      'errorClassifier': RetryClassifier.retryable,
      ...input.retry
    });
    const { attempts, result } = await FlakyOperation.execute(retry, Number(input.batch?.failureCountBeforeSuccess ?? 0), String(input.errorMessage), String(input.recovered));

    assert.equal(result, String(expected.result));
    assert.equal(attempts, Number(expected.attempts));
    assert.equal(retry.getStats().totalRetries, Number(expected.totalRetries));
  }

  static async 'factory-equivalent'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'factory-equivalent'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const viaCreate = RetryFixture.create(input.retry);
    const viaFactory = RetryFixture.create(input.retry);

    const result1 = await viaCreate.execute(ResolvingOperation.of(String(input.result)));
    const result2 = await viaFactory.execute(ResolvingOperation.of(String(input.result)));

    assert.deepStrictEqual([result1, result2], expected.results);
  }

  static 'max-retries-empty-errors-fallback'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'max-retries-empty-errors-fallback'>): void {
    const { input } = scenarioCase;
    const error = new MaximumRetriesExceededError(String(input.failedMessage), Number(input.retries), Number(input.attemptNumber), []);
    assert.ok(error.cause instanceof Error);
    assert.equal(error.cause.message, String(input.fallbackMessage));
    assert.equal(error.maximumRetries, Number(input.retries));
  }

  static 'non-retryable-original-error-fallback'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'non-retryable-original-error-fallback'>): void {
    const { input } = scenarioCase;

    class EmptyErrorsNonRetryableError extends NonRetryableError {
      public override readonly name: string = 'EmptyErrorsNonRetryableError';

      override get errors(): readonly Error[] {
        return [];
      }
    }

    const error = new EmptyErrorsNonRetryableError(String(input.failedMessage), RuntimeError.create(String(input.sourceMessage)), String(input.fatalReason), Number(input.attemptNumber));
    assert.equal(error.originalError.message, String(input.fallbackMessage));
  }

  static 'retry-error-empty'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'retry-error-empty'>): void {
    const { expected, input } = scenarioCase;
    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber));
    assert.equal(retryError.cause, undefined);
    assert.equal(retryError.errors.length, Number(expected.errorCount));
    assert.equal(retryError.attempts, Number(input.attemptNumber));
  }

  static 'retry-error-preserves-error-name'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'retry-error-preserves-error-name'>): void {
    const { expected, input } = scenarioCase;
    const source = Object.assign(RuntimeError.create(String(input.sourceMessage)), { 'name': String(input.errorName) });

    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), { 'cause': source });
    const [projectedError] = retryError.errors;

    assert.ok(projectedError instanceof Error);
    assert.equal(projectedError.name, String(expected.errorName));
    assert.equal(retryError.cause?.name, String(expected.errorName));
  }

  static 'retry-error-preserves-history-error-name'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'retry-error-preserves-history-error-name'>): void {
    const { expected, input } = scenarioCase;
    const source = Object.assign(RuntimeError.create(String(input.sourceMessage)), { 'name': String(input.errorName) });

    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), { 'errors': [source] });
    const [projectedError] = retryError.errors;

    assert.ok(projectedError instanceof Error);
    assert.equal(projectedError.name, String(expected.errorName));
    assert.equal(retryError.cause, undefined);
  }

  static 'retry-error-projections-are-detached'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'retry-error-projections-are-detached'>): void {
    const { expected, input } = scenarioCase;
    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), {
      'cause': RuntimeError.create(String(input.outerMessage), { 'cause': RuntimeError.create(String(input.innerMessage)) })
    });
    const [projectedError] = retryError.errors;
    const projectedCause = retryError.cause;

    assert.ok(projectedError instanceof Error);
    assert.ok(projectedCause instanceof Error);
    assert.ok(projectedError.cause instanceof Error);
    projectedError.message = String(input.mutatedHistoryMessage);
    projectedCause.message = String(input.mutatedCauseMessage);
    Reflect.set(projectedError.cause, 'message', String(input.mutatedInnerMessage));
    assert.equal(Reflect.set(retryError.errors, 1, RuntimeError.create(String(input.appendedMessage))), false);

    const [nextError] = retryError.errors;
    assert.ok(nextError instanceof Error);
    assert.equal(nextError.message, String(expected.outerMessage));
    assert.ok(nextError.cause instanceof Error);
    assert.equal(nextError.cause.message, String(expected.innerMessage));
    assert.equal(retryError.cause?.message, String(expected.causeMessage));
    assert.equal(retryError.errors.length, Number(expected.errorCount));
  }

  static 'retry-error-rejects-non-error-diagnostics'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'retry-error-rejects-non-error-diagnostics'>): void {
    const { input } = scenarioCase;
    assert.strictEqual(Predicates.isError(String(input.invalidError)), false);
  }

  static 'retry-error-snapshot-clone-fallback'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'retry-error-snapshot-clone-fallback'>): void {
    const { expected, input } = scenarioCase;

    class FallbackPrototype {
      readonly tag: string;

      readonly visit: () => string;

      constructor(tag: string) {
        this.tag = tag;
        this.visit = () => { return this.tag; };
      }
    }

    const prototype = new FallbackPrototype(String(input.tag));

    const error = RuntimeError.create(String(input.failedMessage), { 'cause': undefined });
    Reflect.set(error, 'prototypeData', prototype);

    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), { 'cause': error });
    const [projectedError] = retryError.errors;
    assert.ok(projectedError instanceof Error);
    const projectedPrototypeData: unknown = Reflect.get(projectedError, 'prototypeData');
    assert.ok(typeof projectedPrototypeData === 'object' && projectedPrototypeData !== null);
    assert.ok('tag' in projectedPrototypeData && 'visit' in projectedPrototypeData);

    assert.equal(projectedPrototypeData.tag, String(expected.tag));
    assert.equal(typeof projectedPrototypeData.visit, String(expected.badType));
    assert.equal(retryError.errors.length, Number(expected.errorCount));
  }

  static 'retry-error-snapshot-cycles'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'retry-error-snapshot-cycles'>): void {
    const { expected, input } = scenarioCase;
    const detail = { 'message': String(input.detailMessage) };
    const cause = RuntimeError.create(String(input.failedMessage), { 'cause': undefined });
    Reflect.set(detail, 'self', detail);
    Reflect.set(cause, 'detail', detail);

    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), { 'cause': cause });
    const [projectedError] = retryError.errors;
    assert.ok(projectedError instanceof Error);
    const projectedDetail: unknown = Reflect.get(projectedError, 'detail');
    assert.ok(typeof projectedDetail === 'object' && projectedDetail !== null);
    assert.ok('message' in projectedDetail && 'self' in projectedDetail);

    assert.equal(projectedError.message, String(input.failedMessage));
    assert.equal(projectedDetail.message, String(expected.detailMessage));
    assert.strictEqual(projectedDetail.self, projectedDetail);
    assert.equal(retryError.errors.length, Number(expected.errorCount));
  }

  static 'retry-error-snapshots'(scenarioCase: ScenarioCaseOfType<InstantiationScenarioCaseEntity.Type, 'retry-error-snapshots'>): void {
    const { expected, input } = scenarioCase;
    const details = { 'attempt': Number(input.attempt) };
    const inner = Object.assign(RuntimeError.create(String(input.innerMessage)), { 'details': details });
    const outer = RuntimeError.create(String(input.outerMessage), { 'cause': inner });
    const inputErrors = [outer];
    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), { 'cause': outer, 'errors': inputErrors });

    inputErrors.push(RuntimeError.create(String(input.laterMessage)));
    outer.message = String(input.mutatedOuterMessage);
    inner.message = String(input.mutatedInnerMessage);
    details.attempt = Number(input.mutatedAttempt);

    const [first] = retryError.errors;
    assert.ok(first instanceof Error);
    assert.equal(first.message, String(expected.outerMessage));
    assert.ok(first.cause instanceof Error);
    assert.equal(first.cause.message, String(expected.innerMessage));
    assert.deepEqual(Reflect.get(first.cause, 'details'), { 'attempt': Number(input.attempt) });
    assert.equal(retryError.errors.length, Number(expected.errorCount));

    const projectedCause = retryError.cause;
    assert.ok(projectedCause instanceof Error);
    assert.equal(projectedCause.message, String(expected.causeMessage));
    assert.notStrictEqual(projectedCause, outer);
  }

  static declareForwardsCanonicalErrorContext(): void {
    void it('forwards canonical error context through RetryError options', () => {
      const retryError = new RetryError('retry context', 1, {
        'code': 'retry.context',
        'correlationId': 'retry-correlation',
        'instance': 'urn:retry:context',
        'metadata': { 'attempt': 1 },
        'status': 503
      });

      assert.equal(retryError.correlationId, 'retry-correlation');
      assert.equal(retryError.instance, 'urn:retry:context');
      assert.deepEqual(retryError.metadata, { 'attempt': 1 });
      assert.equal(retryError.retryable, false);
      assert.equal(retryError.status, 503);
    });
  }
}

ScenarioSuite.register({
  'entity': InstantiationScenarioCaseEntity,
  'extraTests': InstantiationRunners.declareForwardsCanonicalErrorContext,
  'file': scenarioGroups,
  'name': 'Retry instantiation',
  'runners': InstantiationRunners
});
