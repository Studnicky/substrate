/** builderResilience — constructs a CircuitBreaker via CircuitBreaker.builder()...build() and exercises all three states. Run: npx tsx examples/builderResilience.ts */

import assert from 'node:assert/strict';

// #region usage
import { CircuitBreaker, CircuitBreakerOpenError } from '../src/index.js';

// Deterministic clock so the demo is instant with no real waits
let now = 0;
const clock = (): number => { const result = now;
  return result; };

// Build a CircuitBreaker with a fluent builder chain
const breaker = CircuitBreaker.builder()
  .withName('payment-service')
  .withFailureThreshold(2)
  .withResetTimeoutMs(500)
  .withSuccessThreshold(1)
  .withClock(clock)
  .build();

console.log('CircuitBreaker built. State:', breaker.state);

// CLOSED — successful call passes through
await breaker.execute(() => { const result = Promise.resolve('ok');
  return result; });
console.log('After success. State:', breaker.state);

// Trip the breaker with 2 consecutive failures
const fail = (): Promise<never> => { throw new Error('downstream error'); };
await breaker.execute(fail).catch(() => { /* expected */ });
await breaker.execute(fail).catch(() => { /* expected */ });
console.log('After 2 failures. State:', breaker.state);

// OPEN — fast rejection
const rejectionError = await breaker
  .execute(() => { const result = Promise.resolve('should not run');
    return result; })
  .catch((err: unknown) => { const result = err;
    return result; });

console.log('Open-circuit rejection type:', rejectionError instanceof CircuitBreakerOpenError ? 'CircuitBreakerOpenError' : 'other');

// Advance past resetTimeoutMs → halfOpen probe succeeds → closed
now = 501;
await breaker.execute(() => { const result = Promise.resolve('probe');
  return result; });
console.log('After probe. State:', breaker.state);
// #endregion usage

assert.equal(breaker.state, 'closed', 'Circuit re-closed after successful probe');
assert.ok(rejectionError instanceof CircuitBreakerOpenError, 'Open circuit rejected with CircuitBreakerOpenError');

console.log('builderResilience: all assertions passed');
