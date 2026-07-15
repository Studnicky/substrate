/** observedResilience — trace every lifecycle hook across CircuitBreaker, TokenBucket, and DeadLetterQueue. Run: npx tsx examples/observedResilience.ts */

import assert from 'node:assert/strict';

// #region usage
import type { CircuitBreakerOptionsInterface } from '../src/interfaces/CircuitBreakerOptionsInterface.js';
import type { DeadLetterQueueOptionsInterface } from '../src/interfaces/DeadLetterQueueOptionsInterface.js';

import { CircuitBreaker } from '../src/CircuitBreaker.js';
import { CircuitBreakerOpenError } from '../src/CircuitBreakerOpenError.js';
import { DeadLetterQueue } from '../src/DeadLetterQueue.js';

// --- Observed CircuitBreaker ---
class TracedBreaker extends CircuitBreaker {
  constructor(options: CircuitBreakerOptionsInterface) { super(options); }
  protected override onSuccess(): void { console.log('[resilience:cb] onSuccess — circuit closed and call succeeded'); }
  protected override onFailure(error: unknown): void { console.log(`[resilience:cb] onFailure — error=${String(error)}`); }
  protected override onTrip(): void { console.log('[resilience:cb] onTrip — failure threshold reached, circuit OPEN'); }
  protected override onOpen(): void { console.log('[resilience:cb] onOpen — circuit is now open'); }
  protected override onHalfOpen(): void { console.log('[resilience:cb] onHalfOpen — probing after timeout'); }
  protected override onClose(): void { console.log('[resilience:cb] onClose — circuit CLOSED, service healthy'); }
  protected override onReject(): void { console.log('[resilience:cb] onReject — call short-circuited (circuit open)'); }
}

// --- Observed DeadLetterQueue ---
class TracedDlq<T> extends DeadLetterQueue<T> {
  constructor(options?: DeadLetterQueueOptionsInterface) { super(options); }
  protected override onEnqueue(item: T): void { console.log(`[resilience:dlq] onEnqueue — item=${String(item)}`); }
  protected override onDequeue(item: T): void { console.log(`[resilience:dlq] onDequeue — item=${String(item)}`); }
  protected override onOverflow(): void { console.log('[resilience:dlq] onOverflow — queue full, item dropped'); }
  protected override onClose(): void { console.log('[resilience:dlq] onClose — queue sealed'); }
  protected override onAbort(): void { console.log('[resilience:dlq] onAbort — queue aborted'); }
}

const events: string[] = [];

// Scenario: breaker trips open → half-open → closes; rejected calls go to DLQ
let time = 0;
class Clock {
  static now(): number { const result = time; return result; }
}

const cb = new TracedBreaker({ 'clock': Clock.now, 'failureThreshold': 2, 'resetTimeoutMs': 100, 'successThreshold': 1 });
const dlq = new TracedDlq<string>({ 'capacity': 10 });

// Trip the breaker open with 2 failures
console.log('\n--- Tripping open ---');
try { await cb.execute(() => { throw new Error('service down'); }); } catch { dlq.enqueue('msg-1', 'service-failure'); events.push('failure-1'); }
try { await cb.execute(() => { throw new Error('service down'); }); } catch { dlq.enqueue('msg-2', 'service-failure'); events.push('failure-2'); }

// Call while open — should be rejected and sent to DLQ
console.log('\n--- Rejecting while open ---');
try {
  await cb.execute(() => { const result = Promise.resolve('ok'); return result; });
} catch (e) {
  if (e instanceof CircuitBreakerOpenError) {
    dlq.enqueue('msg-3', 'circuit-open');
    events.push('rejected');
  }
}

// Advance clock past resetTimeoutMs → half-open
console.log('\n--- Half-open probe ---');
time = 100;
await cb.execute(() => { const result = Promise.resolve('ok'); return result; }); // half-open → closed
events.push('recovered');

// Drain the DLQ
console.log('\n--- Draining DLQ ---');
dlq.close();
for await (const entry of dlq.drain()) {
  events.push(`drain:${entry.item}`);
}
// #endregion usage

assert.ok(events.includes('failure-1'), 'failure-1 recorded');
assert.ok(events.includes('failure-2'), 'failure-2 recorded');
assert.ok(events.includes('rejected'), 'rejected recorded');
assert.ok(events.includes('recovered'), 'recovered');
assert.ok(events.includes('drain:msg-1'), 'DLQ drained msg-1');
assert.ok(events.includes('drain:msg-2'), 'DLQ drained msg-2');
assert.ok(events.includes('drain:msg-3'), 'DLQ drained msg-3');

console.log('\nobservedResilience: all assertions passed');
