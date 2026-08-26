/** boundaryKitComposition — hand-composes retry, resilience's CircuitBreaker, and throttle into
 * the Boundary Kit's documentation-only pattern (no `@studnicky/boundary-kit` package exists;
 * this composition order IS the deliverable). Composition order: throttle (bounds concurrency)
 * -> circuitBreaker (fast-fail) -> retry (attempt+backoff) -> fn. Run:
 * npx tsx examples/boundaryKitComposition.ts */

// #region usage
import { CircuitBreaker, CircuitBreakerOpenError } from '@studnicky/resilience';
import { Retry } from '@studnicky/retry';
import assert from 'node:assert/strict';

import { Throttle } from '../src/index.js';

// One Retry/CircuitBreaker pair per protected dependency; one Throttle shared across every
// call made to that dependency, bounding how much concurrent load it ever sees.
const retry = Retry.create({ 'maximumRetries': 2 });
const circuitBreaker = CircuitBreaker.create({ 'failureThreshold': 3, 'resetTimeoutMs': 60_000 });
const throttle = Throttle.create({ 'concurrencyLimit': 2 });

// The kit's entire value-add would have been this composition order — nothing here is
// hidden: retry, circuitBreaker, and throttle stay reachable as plain local variables,
// each with its own hooks and getStats()/state behavior.
// #endregion usage

// --- Scenario A: transient failures are absorbed by retry; the circuit breaker never
// sees a rejection, so it stays closed. ---

class FlakyTask {
  static make(failuresBeforeSuccess: number): () => Promise<string> {
    let remaining = failuresBeforeSuccess;
    return () => {
      if (remaining > 0) {
        remaining -= 1;
        throw new Error('transient failure');
      }
      const result = Promise.resolve('ok');
      return result;
    };
  }
}

class PermanentlyFailingTask {
  static async execute(): Promise<never> {
    await Promise.resolve();
    throw new Error('permanent failure');
  }
}

const flakyOutcomes = await Promise.all([
  throttle.execute(() => {
    const breakerResult = circuitBreaker.execute(() => {
      const retryResult = retry.execute(FlakyTask.make(0));
      return retryResult;
    });
    return breakerResult;
  }),
  throttle.execute(() => {
    const breakerResult = circuitBreaker.execute(() => {
      const retryResult = retry.execute(FlakyTask.make(1));
      return retryResult;
    });
    return breakerResult;
  }),
  throttle.execute(() => {
    const breakerResult = circuitBreaker.execute(() => {
      const retryResult = retry.execute(FlakyTask.make(2));
      return retryResult;
    });
    return breakerResult;
  }),
  throttle.execute(() => {
    const breakerResult = circuitBreaker.execute(() => {
      const retryResult = retry.execute(FlakyTask.make(0));
      return retryResult;
    });
    return breakerResult;
  }),
  throttle.execute(() => {
    const breakerResult = circuitBreaker.execute(() => {
      const retryResult = retry.execute(FlakyTask.make(1));
      return retryResult;
    });
    return breakerResult;
  }),
  throttle.execute(() => {
    const breakerResult = circuitBreaker.execute(() => {
      const retryResult = retry.execute(FlakyTask.make(0));
      return retryResult;
    });
    return breakerResult;
  })
]);

console.log('Flaky outcomes:', flakyOutcomes);
console.log('CircuitBreaker state after transient failures:', circuitBreaker.state);

assert.deepEqual(flakyOutcomes, ['ok', 'ok', 'ok', 'ok', 'ok', 'ok']);
assert.equal(circuitBreaker.state, 'closed', 'retry absorbed every transient failure before the breaker saw one');
assert.equal(retry.getStats().totalRetries, 4);

// --- Scenario B: a permanently-failing dependency exhausts retry on every call, so the
// circuit breaker counts each exhausted call as a real failure and trips open after
// failureThreshold consecutive failures — the 4th call fast-rejects without ever
// reaching retry. ---

const badRetry = Retry.create({ 'maximumRetries': 1 });
const badBreaker = CircuitBreaker.create({ 'failureThreshold': 3, 'resetTimeoutMs': 60_000 });
const badThrottle = Throttle.create({ 'concurrencyLimit': 5 });

await badThrottle.execute(() => {
  const breakerResult = badBreaker.execute(() => {
    const retryResult = badRetry.execute(PermanentlyFailingTask.execute);
    return retryResult;
  });
  return breakerResult;
}).catch(() => { /* expected: MaximumRetriesExceededError bubbles through the breaker */ });
await badThrottle.execute(() => {
  const breakerResult = badBreaker.execute(() => {
    const retryResult = badRetry.execute(PermanentlyFailingTask.execute);
    return retryResult;
  });
  return breakerResult;
}).catch(() => { /* expected: MaximumRetriesExceededError bubbles through the breaker */ });
await badThrottle.execute(() => {
  const breakerResult = badBreaker.execute(() => {
    const retryResult = badRetry.execute(PermanentlyFailingTask.execute);
    return retryResult;
  });
  return breakerResult;
}).catch(() => { /* expected: MaximumRetriesExceededError bubbles through the breaker */ });

console.log('CircuitBreaker state after 3 exhausted calls:', badBreaker.state);

let fastRejected = false;

await badThrottle.execute(() => {
  const breakerResult = badBreaker.execute(() => {
    const retryResult = badRetry.execute(PermanentlyFailingTask.execute);
    return retryResult;
  });
  return breakerResult;
}).catch((error) => {
  fastRejected = error instanceof CircuitBreakerOpenError;
});

console.log('4th call fast-rejected by the open circuit:', fastRejected);

assert.equal(badBreaker.state, 'open');
assert.equal(fastRejected, true);
assert.equal(badRetry.getStats().totalRequests, 3, 'the 4th call never reached retry — the breaker rejected it first');

console.log('boundaryKitComposition: all assertions passed');
