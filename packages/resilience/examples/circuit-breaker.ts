import { RuntimeError } from '@studnicky/errors/node';
/** circuit-breaker — protect Northstar Books checkout from an unavailable supplier, then recover with probes. Run: npx tsx examples/circuit-breaker.ts */
import assert from 'node:assert/strict';

// #region usage
import { CircuitBreaker, CircuitBreakerOpenError } from '../src/index.js';

// Deterministic clock so tests are instant with no real waits.
let now = 0;
class Clock {
  static now(): number { const result = now + 0; return result; }
}

const breaker = CircuitBreaker.create(
  {
    'failureThreshold': 3,
    'name': 'northstar-supplier-catalogue',
    'resetTimeoutMs': 1_000,
    'successThreshold': 2
  },
  { 'clock': Clock.now }
);

// --- CLOSED: a supplier catalogue lookup succeeds ---
await breaker.execute(() => { const result = Promise.resolve('catalogue-available'); return result; });
console.log('State after success:', breaker.state);

// --- Trip the breaker: three supplier failures protect checkout ---
class Fail {
  static boom(): Promise<never> { throw RuntimeError.create('supplier unavailable'); }
}
for (let i = 0; i < 3; i++) {
  await breaker.execute(Fail.boom).catch(() => { /* expected */ });
}
console.log('State after 3 failures:', breaker.state);

// --- OPEN: next call is fast-rejected with CircuitBreakerOpenError ---
await breaker.execute(() => { const result = Promise.resolve('supplier call must not run'); return result; }).catch((error) => {
  console.log('Open-circuit rejection:', error instanceof CircuitBreakerOpenError ? 'CircuitBreakerOpenError' : 'other');
});

// --- Advance past resetTimeoutMs → halfOpen on next call ---
now = 1_001;
await breaker.execute(() => { const result = Promise.resolve('supplier probe 1'); return result; });
console.log('State after probe 1:', breaker.state);

// --- 2 successes in halfOpen close the circuit (successThreshold: 2) ---
await breaker.execute(() => { const result = Promise.resolve('supplier probe 2'); return result; });
console.log('State after probe 2:', breaker.state);

// --- forceOpen / reset ---
breaker.forceOpen();
console.log('State after forceOpen:', breaker.state);
breaker.reset();
console.log('State after reset:', breaker.state);
// #endregion usage

assert.equal(breaker.state, 'closed');

console.log('circuit-breaker: all assertions passed');
