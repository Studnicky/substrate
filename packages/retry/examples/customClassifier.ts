/** customClassifier — subclass Retry, override classifyError for a domain error. Run: npx tsx examples/customClassifier.ts */

import assert from 'node:assert/strict';

import { Retry } from '../src/index.js';
import type { ErrorClassificationType } from '../src/index.js';

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
  protected override classifyError(error: Error): ErrorClassificationType {
    if (error instanceof DatabaseError && error.isDeadlock) {
      return { retryable: true, reason: 'Transient deadlock' };
    }
    return { retryable: false, reason: 'Permanent database error' };
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

const failUntil = 2;
const counter = new AttemptCounter();

const retry = new DatabaseRetry({
  maxRetries: 3,
  retryInterceptor: () => ({ delayMs: 0 })
});

const result = await retry.execute(async () => {
  const n = counter.next();
  if (n <= failUntil) {
    throw new DatabaseError(`Deadlock on attempt ${n}`, true);
  }
  return `query succeeded on attempt ${n}`;
});

console.log(`Result: ${result}`);
console.log('Stats:', retry.getStats());

assert.equal(retry.getStats().totalRetries, failUntil);
assert.equal(retry.getStats().successfulRequests, 1);

console.log('customClassifier: all assertions passed');
