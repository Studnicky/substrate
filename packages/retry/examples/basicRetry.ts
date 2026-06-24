/** basicRetry — flaky operation that fails twice then succeeds. Run: npx tsx examples/basicRetry.ts */

import assert from 'node:assert/strict';

// #region usage
import { Retry } from '../src/index.js';

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

const failCount = 2;
const counter = new Counter();

const retry = Retry.builder()
  .maxRetries(3)
  .retryInterceptor(() => {return { 'delayMs': 0 };})
  .build();

const result = await retry.execute(() => {
  const attempt = counter.increment();
  if (attempt <= failCount) {
    throw new Error(`Transient failure on attempt ${attempt}`);
  }
  return Promise.resolve(`success on attempt ${attempt}`);
});

console.log(`Result: ${result}`);
console.log('Stats:', retry.getStats());
// #endregion usage

assert.equal(result, `success on attempt ${failCount + 1}`);
assert.equal(retry.getStats().totalRequests, 1);
assert.equal(retry.getStats().successfulRequests, 1);
assert.equal(retry.getStats().failedRequests, 0);
assert.equal(retry.getStats().totalRetries, failCount);

console.log('basicRetry: all assertions passed');
