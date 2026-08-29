import { RuntimeError, DefaultHttpErrorClassifier } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';



import {
  MaximumRetriesExceededError,
  NonRetryableError,
  RetryError
} from '../../../src/errors/index.js';
import { Retry } from '../../../src/retry/index.js';
import type { RetryConfigInterface } from '../../../src/interfaces/index.js';
import scenarioGroups from './instantiation.scenarios.json' with { type: 'json' };

type RetryScenarioInput = Record<string, unknown> & {
  batch?: { failureCountBeforeSuccess?: number };
  retry?: Partial<Pick<RetryConfigInterface, 'maximumRetries'>>;
};

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'create-max-retries-5' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'create-defaults' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'create-error-classifier-and-max-retries' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'execute-retries-until-success' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'factory-equivalent' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'retry-error-snapshots' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'retry-error-empty' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'non-retryable-original-error-fallback' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'max-retries-empty-errors-fallback' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'retry-error-projections-are-detached' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'retry-error-snapshot-cycles' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'retry-error-snapshot-clone-fallback' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'retry-error-rejects-non-error-diagnostics' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'retry-error-preserves-error-name' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'retry-error-preserves-history-error-name' }
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; name: string; shape: 'derived-errors-expose-detached-diagnostics' };

type AttemptOutcome = 'failure' | 'success';

type ScenarioRunner = (scenario: ScenarioCase) => Promise<void> | void;

function resolveAttemptOutcome(attempts: number, input: RetryScenarioInput): AttemptOutcome {
  return attempts <= Number(input.batch?.failureCountBeforeSuccess ?? 0) ? 'failure' : 'success';
}

async function executeUntilConfiguredSuccess(retry: Retry, input: RetryScenarioInput): Promise<{ attempts: number; result: string }> {
  let attempts = 0;

  const result = await retry.execute(async () => {
    attempts += 1;

    const attemptMap: Record<AttemptOutcome, () => string> = {
      'failure': () => {
        throw RuntimeError.create(String(input.errorMessage));
      },
      'success': () => String(input.recovered)
    };

    return attemptMap[resolveAttemptOutcome(attempts, input)]();
  });

  return { attempts, result };
}

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'create-max-retries-5': (scenario) => {
    const { input } = scenario;
    assert.ok(Retry.create(input.retry) instanceof Retry);
  },
  'create-defaults': (_scenario) => {
    assert.ok(Retry.create() instanceof Retry);
  },
  'create-error-classifier-and-max-retries': (scenario) => {
    const { input } = scenario;
    assert.ok(
      Retry.create({ errorClassifier: DefaultHttpErrorClassifier.create(), ...input.retry }) instanceof Retry
    );
  },
  'derived-errors-expose-detached-diagnostics': (scenario) => {
    const { expected, input } = scenario;
    const source = RuntimeError.create(String(input.sourceMessage));
    const exhausted = new MaximumRetriesExceededError(String(input.exhaustedMessage), Number(input.attemptNumber), Number(input.retries), [source]);
    const nonRetryable = new NonRetryableError(String(input.rejectedMessage), source, String(input.fatalReason), Number(input.attemptNumber));

    assert.notStrictEqual(exhausted.errors[0], source);
    assert.notStrictEqual(nonRetryable.originalError, source);
    assert.equal(nonRetryable.originalError.message, String(expected.sourceMessage));
  },
  'execute-retries-until-success': async (scenario) => {
    const { expected, input } = scenario;
    const retry = Retry.create({
      backoffStrategy: { baseDelayMs: 5, strategy: () => 1 },
      errorClassifier: () => ({ retryable: true }),
      ...input.retry
    });
    const { attempts, result } = await executeUntilConfiguredSuccess(retry, input);

    assert.equal(result, String(expected.result));
    assert.equal(attempts, Number(expected.attempts));
    assert.equal(retry.getStats().totalRetries, Number(expected.totalRetries));
  },
  'factory-equivalent': async (scenario) => {
    const { expected, input } = scenario;
    const viaCreate = Retry.create(input.retry);
    const viaFactory = Retry.create(input.retry);

    const result1 = await viaCreate.execute(async () => String(input.result));
    const result2 = await viaFactory.execute(async () => String(input.result));

    assert.deepStrictEqual([result1, result2], expected.results);
  },
  'max-retries-empty-errors-fallback': (scenario) => {
    const { input } = scenario;
    const error = new MaximumRetriesExceededError(String(input.failedMessage), Number(input.retries), Number(input.attemptNumber), []);
    assert.ok(error.cause instanceof Error);
    assert.equal(error.cause.message, String(input.fallbackMessage));
    assert.equal(error.maximumRetries, Number(input.retries));
  },
  'non-retryable-original-error-fallback': (scenario) => {
    const { input } = scenario;

    class EmptyErrorsNonRetryableError extends NonRetryableError {
      override get errors(): readonly Error[] {
        return [];
      }
    }

    const error = new EmptyErrorsNonRetryableError(String(input.failedMessage), RuntimeError.create(String(input.sourceMessage)), String(input.fatalReason), Number(input.attemptNumber));
    assert.equal(error.originalError.message, String(input.fallbackMessage));
  },
  'retry-error-empty': (scenario) => {
    const { expected, input } = scenario;
    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber));
    assert.equal(retryError.cause, undefined);
    assert.equal(retryError.errors.length, Number(expected.errorCount));
    assert.equal(retryError.attempts, Number(input.attemptNumber));
  },
  'retry-error-preserves-error-name': (scenario) => {
    const { expected, input } = scenario;
    const source = RuntimeError.create(String(input.sourceMessage));
    source.name = String(input.errorName);

    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), { 'cause': source });
    const [projectedError] = retryError.errors;

    assert.ok(projectedError instanceof Error);
    assert.equal(projectedError.name, String(expected.errorName));
    assert.equal(retryError.cause?.name, String(expected.errorName));
  },
  'retry-error-preserves-history-error-name': (scenario) => {
    const { expected, input } = scenario;
    const source = RuntimeError.create(String(input.sourceMessage));
    source.name = String(input.errorName);

    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), { 'errors': [source] });
    const [projectedError] = retryError.errors;

    assert.ok(projectedError instanceof Error);
    assert.equal(projectedError.name, String(expected.errorName));
    assert.equal(retryError.cause, undefined);
  },
  'retry-error-projections-are-detached': (scenario) => {
    const { expected, input } = scenario;
    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), {
      cause: RuntimeError.create(String(input.outerMessage), { cause: RuntimeError.create(String(input.innerMessage)) })
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
  },
  'retry-error-rejects-non-error-diagnostics': (scenario) => {
    const { expected, input } = scenario;
    assert.throws(() => {
      Reflect.construct(RetryError, [
        String(input.failedMessage),
        Number(input.attemptNumber),
        { 'errors': [String(input.invalidError)] }
      ]);
    }, { 'name': String(expected.errorName) });
  },
  'retry-error-snapshot-clone-fallback': (scenario) => {
    const { expected, input } = scenario;

    class FallbackPrototype {
      readonly tag: string;

      readonly visit: () => string;

      constructor(tag: string) {
        this.tag = tag;
        this.visit = () => { return this.tag; };
      }
    }

    const prototype = new FallbackPrototype(String(input.tag));

    const error = RuntimeError.create(String(input.failedMessage), { cause: undefined });
    Reflect.set(error, 'prototypeData', prototype);

    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), { cause: error });
    const [projectedError] = retryError.errors;
    assert.ok(projectedError instanceof Error);
    const projectedPrototypeData = Reflect.get(projectedError, 'prototypeData') as { tag?: string; visit?: () => string };

    assert.equal(projectedPrototypeData.tag, String(expected.tag));
    assert.equal(typeof projectedPrototypeData.visit, String(expected.badType));
    assert.equal(retryError.errors.length, Number(expected.errorCount));
  },
  'retry-error-snapshot-cycles': (scenario) => {
    const { expected, input } = scenario;
    const detail = { message: String(input.detailMessage) };
    const cause = RuntimeError.create(String(input.failedMessage), { cause: undefined });
    Reflect.set(detail, 'self', detail);
    Reflect.set(cause, 'detail', detail);

    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), { cause });
    const [projectedError] = retryError.errors;
    assert.ok(projectedError instanceof Error);
    const projectedDetail = Reflect.get(projectedError, 'detail') as Record<string, unknown>;

    assert.equal(projectedError.message, String(input.failedMessage));
    assert.equal(projectedDetail.message, String(expected.detailMessage));
    assert.strictEqual(projectedDetail.self, projectedDetail);
    assert.equal(retryError.errors.length, Number(expected.errorCount));
  },
  'retry-error-snapshots': (scenario) => {
    const { expected, input } = scenario;
    const details = { attempt: Number(input.attempt) };
    const inner = Object.assign(RuntimeError.create(String(input.innerMessage)), { details });
    const outer = RuntimeError.create(String(input.outerMessage), { cause: inner });
    const inputErrors = [outer];
    const retryError = new RetryError(String(input.failedMessage), Number(input.attemptNumber), { cause: outer, errors: inputErrors });

    inputErrors.push(RuntimeError.create(String(input.laterMessage)));
    outer.message = String(input.mutatedOuterMessage);
    inner.message = String(input.mutatedInnerMessage);
    details.attempt = Number(input.mutatedAttempt);

    const [first] = retryError.errors;
    assert.ok(first instanceof Error);
    assert.equal(first.message, String(expected.outerMessage));
    assert.ok(first.cause instanceof Error);
    assert.equal(first.cause.message, String(expected.innerMessage));
    assert.deepEqual(Reflect.get(first.cause, 'details'), { attempt: Number(input.attempt) });
    assert.equal(retryError.errors.length, Number(expected.errorCount));

    const projectedCause = retryError.cause;
    assert.ok(projectedCause instanceof Error);
    assert.equal(projectedCause.message, String(expected.causeMessage));
    assert.notStrictEqual(projectedCause, outer);
  }
};

async function runCase(scenario: ScenarioCase): Promise<void> {
  await runnerMap[scenario.shape](scenario);
}

void describe('Retry instantiation', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
