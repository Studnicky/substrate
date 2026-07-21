/**
 * Retry Instantiation Unit Tests
 *
 * Tests for creating Retry instances via the static factory.
 */

import {
  deepStrictEqual, notStrictEqual, ok, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import { DefaultHttpErrorClassifier } from '@studnicky/errors';

import {
  MaxRetriesExceededError,
  NonRetryableError,
  RetryError
} from '../../../src/errors/index.js';
import { Retry } from '../../../src/retry/index.js';

// ---------------------------------------------------------------------------
// Static factory method scenarios
// ---------------------------------------------------------------------------

const createScenarios: Array<{ description: string; build: () => Retry }> = [
  {
    description: 'creates retry with Retry.create({ maxRetries: 5 })',
    build: () => Retry.create({ maxRetries: 5 })
  },
  {
    description: 'creates retry with Retry.create() using defaults',
    build: () => Retry.create()
  },
  {
    description: 'creates retry with Retry.create({ errorClassifier, maxRetries })',
    build: () => Retry.create({ errorClassifier: DefaultHttpErrorClassifier.create(), maxRetries: 3 })
  }
];

for (const { description, build } of createScenarios) {
  it(description, () => {
    ok(build() instanceof Retry);
  });
}

it('create-configured maxRetries and backoffStrategy drive actual retry behavior', async () => {
  const retry = Retry.create({
    'backoffStrategy': { 'baseDelayMs': 5, 'strategy': () => 1 },
    'errorClassifier': () => ({ 'retryable': true }),
    'maxRetries': 10
  });

  let attempts = 0;

  const result = await retry.execute(async () => {
    attempts++;
    if (attempts <= 3) {throw new Error('transient failure');}
    return 'recovered';
  });

  strictEqual(result, 'recovered');
  strictEqual(attempts, 4);
  strictEqual(retry.getStats().totalRetries, 3);
});

// ---------------------------------------------------------------------------
// Functional equivalence
// ---------------------------------------------------------------------------

it('create and factory produce functionally equivalent instances', async () => {
  const viaCreate = Retry.create({ maxRetries: 3 });
  const viaFactory = Retry.create({ maxRetries: 3 });

  const result1 = await viaCreate.execute(async () => 'test');
  const result2 = await viaFactory.execute(async () => 'test');

  strictEqual(result1, 'test');
  strictEqual(result2, 'test');
});

it('RetryError snapshots caller-owned arrays and mutable error graphs', () => {
  const details = { 'attempt': 1 };
  const inner = Object.assign(new Error('inner'), { 'details': details });
  const outer = new Error('outer', { 'cause': inner });
  const inputErrors = [outer];
  const retryError = new RetryError('failed', 1, { 'cause': outer, 'errors': inputErrors });

  inputErrors.push(new Error('later'));
  outer.message = 'mutated outer';
  inner.message = 'mutated inner';
  details.attempt = 2;

  const [first] = retryError.errors;
  ok(first instanceof Error);
  strictEqual(first.message, 'outer');
  ok(first.cause instanceof Error);
  strictEqual(first.cause.message, 'inner');
  deepStrictEqual(Reflect.get(first.cause, 'details'), { 'attempt': 1 });
  strictEqual(retryError.errors.length, 1);

  const projectedCause = retryError.cause;
  ok(projectedCause instanceof Error);
  strictEqual(projectedCause.message, 'outer');
  notStrictEqual(projectedCause, outer);
});

it('RetryError projections cannot mutate retained diagnostics', () => {
  const retryError = new RetryError('failed', 1, {
    'cause': new Error('outer', { 'cause': new Error('inner') })
  });
  const [projectedError] = retryError.errors;
  const projectedCause = retryError.cause;

  ok(projectedError instanceof Error);
  ok(projectedCause instanceof Error);
  projectedError.message = 'changed history';
  projectedCause.message = 'changed cause';
  Reflect.set(projectedError.cause, 'message', 'changed inner');
  strictEqual(Reflect.set(retryError.errors, 1, new Error('appended')), false);

  const [nextError] = retryError.errors;
  ok(nextError instanceof Error);
  strictEqual(nextError.message, 'outer');
  ok(nextError.cause instanceof Error);
  strictEqual(nextError.cause.message, 'inner');
  strictEqual(retryError.cause?.message, 'outer');
  strictEqual(retryError.errors.length, 1);
});

it('derived retry errors expose detached readonly diagnostics', () => {
  const source = new Error('source');
  const exhausted = new MaxRetriesExceededError('exhausted', 1, 2, [source]);
  const nonRetryable = new NonRetryableError('rejected', source, 'fatal', 1);

  notStrictEqual(exhausted.errors[0], source);
  notStrictEqual(nonRetryable.originalError, source);
  strictEqual(nonRetryable.originalError.message, 'source');
});
