/** customClassifier — subclass Retry, override classifyError for a domain error. Run: npx tsx examples/customClassifier.ts */

import assert from 'node:assert/strict';

// #region usage
import type { ErrorClassificationEntity , RetryConfigInterface} from '../src/index.js';

import { Retry } from '../src/index.js';
import { CustomClassifierFixtures } from './fixtures/customClassifierFixtures.js';

class DatabaseError extends Error {
  constructor(
    message: string,
    readonly isDeadlock: boolean
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

class DatabaseRetry extends Retry {
  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  protected override classifyError(error: Error): ErrorClassificationEntity.Type {
    if (error instanceof DatabaseError && error.isDeadlock) {
      return { 'reason': 'Transient deadlock', 'retryable': true };
    }
    return { 'reason': 'Permanent database error', 'retryable': false };
  }
}

class AttemptCounter {
  #count = 0;

  next(): number {
    this.#count++;
    return this.#count;
  }

  get count(): number {
    return this.#count;
  }
}

const counter = new AttemptCounter();

const retry = new DatabaseRetry({
  'maxRetries': 3
});

const result = await retry.execute(() => {
  const n = counter.next();
  if (n <= CustomClassifierFixtures.failUntil) {
    throw new DatabaseError(`Deadlock on attempt ${n}`, true);
  }
  return Promise.resolve(`query succeeded on attempt ${n}`);
});

console.log(`Result: ${result}`);
console.log('Stats:', retry.getStats());
// #endregion usage

assert.equal(retry.getStats().totalRetries, CustomClassifierFixtures.failUntil);
assert.equal(retry.getStats().successfulRequests, 1);

console.log('customClassifier: all assertions passed');
