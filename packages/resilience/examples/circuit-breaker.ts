/** circuit-breaker — three-state lifecycle: closed → open → halfOpen → closed. Run: npx tsx examples/circuit-breaker.ts */

import assert from 'node:assert/strict';

// #region usage
import { CircuitBreaker, CircuitBreakerOpenError } from '../src/index.js';

// Deterministic clock so tests are instant with no real waits.
let now = 0;
class Clock {
  static now(): number { const result = now; return result; }
}

const breaker = CircuitBreaker.create({
  'clock': Clock.now,
  'failureThreshold': 3,
  'name': 'test-service',
  'resetTimeoutMs': 1_000,
  'successThreshold': 2
});

// --- CLOSED: successful calls pass through ---
await breaker.execute(() => { const result = Promise.resolve('ok'); return result; });
console.log('State after success:', breaker.state);

// --- Trip the breaker: 3 consecutive failures ---
class Fail {
  static boom(): Promise<never> { throw new Error('boom'); }
}
for (let i = 0; i < 3; i++) {
  await breaker.execute(Fail.boom).catch(() => { /* expected */ });
}
console.log('State after 3 failures:', breaker.state);

// --- OPEN: next call is fast-rejected with CircuitBreakerOpenError ---
await breaker.execute(() => { const result = Promise.resolve('should not run'); return result; }).catch((err: unknown) => {
  console.log('Open-circuit rejection:', err instanceof CircuitBreakerOpenError ? 'CircuitBreakerOpenError' : 'other');
});

// --- Advance past resetTimeoutMs → halfOpen on next call ---
now = 1_001;
await breaker.execute(() => { const result = Promise.resolve('probe 1'); return result; });
console.log('State after probe 1:', breaker.state);

// --- 2 successes in halfOpen close the circuit (successThreshold: 2) ---
await breaker.execute(() => { const result = Promise.resolve('probe 2'); return result; });
console.log('State after probe 2:', breaker.state);

// --- forceOpen / forceClosed ---
breaker.forceOpen();
console.log('State after forceOpen:', breaker.state);
breaker.reset();
console.log('State after reset:', breaker.state);
// #endregion usage

assert.equal(breaker.state, 'closed');

console.log('circuit-breaker: all assertions passed');
