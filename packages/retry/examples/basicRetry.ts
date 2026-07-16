/** basicRetry — flaky operation that fails twice then succeeds. Run: npx tsx examples/basicRetry.ts */

import assert from 'node:assert/strict';

// #region usage
import { Retry } from '../src/index.js';
import { BasicRetryFixtures } from './fixtures/basicRetryFixtures.js';

class Counter {
  #value = 0;

  increment(): number {
    this.#value++;
    return this.#value;
  }

  get value(): number {
    return this.#value;
  }
}

const counter = new Counter();

const retry = Retry.builder()
  .maxRetries(3)
  .build();

const result = await retry.execute(() => {
  const attempt = counter.increment();
  if (attempt <= BasicRetryFixtures.failCount) {
    throw new Error(`Transient failure on attempt ${attempt}`);
  }
  return Promise.resolve(`success on attempt ${attempt}`);
});

console.log(`Result: ${result}`);
console.log('Stats:', retry.getStats());
// #endregion usage

assert.equal(result, `success on attempt ${BasicRetryFixtures.failCount + 1}`);
assert.equal(retry.getStats().totalRequests, 1);
assert.equal(retry.getStats().successfulRequests, 1);
assert.equal(retry.getStats().failedRequests, 0);
assert.equal(retry.getStats().totalRetries, BasicRetryFixtures.failCount);

console.log('basicRetry: all assertions passed');
