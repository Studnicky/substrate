/** observedSlidingWindowLimiter — trace lifecycle hooks across both algorithms. Run: npx tsx examples/observedSlidingWindowLimiter.ts */

import type { SlidingWindowLimiterOptionsInterface } from '@studnicky/resilience/interfaces';

import { SlidingWindowExhaustedError, SlidingWindowLimiter } from '@studnicky/resilience/node';
import assert from 'node:assert/strict';

// #region usage

class TracedLimiter extends SlidingWindowLimiter {
  readonly allowed: number[] = [];
  readonly rejected: number[] = [];
  readonly rolls: number[] = [];
  constructor(options: SlidingWindowLimiterOptionsInterface) { super(options); }
  protected override onAllow(count: number): void {
    console.log(`[resilience] onAllow — effective count=${count}`);
    this.allowed.push(count);
  }
  protected override onReject(count: number): void {
    console.log(`[resilience] onReject — effective count=${count}`);
    this.rejected.push(count);
  }
  protected override onWindowRoll(): void {
    console.log('[resilience] onWindowRoll — window boundary advanced');
    this.rolls.push(1);
  }
}

// A deterministic (virtual) clock — no real timers, fully reproducible.
let time = 0;

// --- Scenario 1: 'log' algorithm — exact timestamp pruning ---
console.log('\n--- log algorithm ---');
const logLimiter = new TracedLimiter({ 'algorithm': 'log', 'clock': (): number => { return time; }, 'limit': 3, 'windowMs': 100 });
const initialLogConsumption = logLimiter.consume(1.5); // t=0, admitted (1.5/3)
logLimiter.consume(1.5); // t=0, admitted (3/3)
try {
  logLimiter.consume(); // t=0, rejected — at limit
} catch (error) {
  if (error instanceof SlidingWindowExhaustedError) {
    console.log('  caught SlidingWindowExhaustedError as expected');
  }
}
time = 101; // fully past the window
logLimiter.consume(); // succeeds — stale entries pruned first

// --- Scenario 2: 'counter' algorithm — blended fixed-window estimate ---
console.log('\n--- counter algorithm ---');
time = 0;
const counterLimiter = new TracedLimiter({ 'algorithm': 'counter', 'clock': (): number => { return time; }, 'limit': 3, 'windowMs': 100 });
counterLimiter.consume(1.5); // window 0, admitted (1.5/3)
counterLimiter.consume(1.5); // window 0, admitted (3/3)
try {
  counterLimiter.consume(); // window 0, rejected — at limit
} catch (error) {
  if (error instanceof SlidingWindowExhaustedError) {
    console.log('  caught SlidingWindowExhaustedError as expected');
  }
}
time = 199; // near the far edge of the next window — blend has decayed
counterLimiter.consume(); // succeeds — decayed blended estimate is under the limit

// --- Scenario 3: waitForToken polls until admission succeeds ---
console.log('\n--- waitForToken ---');
const waiter = new TracedLimiter({ 'algorithm': 'counter', 'limit': 1, 'windowMs': 30 });
waiter.consume(); // exhaust the single slot
await waiter.waitForToken(); // resolves once the blended estimate decays below the limit
console.log('  waitForToken resolved');
// #endregion usage

assert.deepStrictEqual(initialLogConsumption, { 'consumedTokens': 1.5, 'remainingTokens': 1.5 }, 'log: weighted result reports consumed and remaining units');
assert.deepStrictEqual(logLimiter.allowed, [1.5, 3, 1], 'log: admitted weighted units then one after pruning');
assert.deepStrictEqual(logLimiter.rejected, [3], 'log: rejected once at the limit');
assert.ok(logLimiter.rolls.length >= 1, 'log: window rolled at least once when pruning stale entries');

assert.strictEqual(counterLimiter.allowed.length, 3, 'counter: three admissions total');
assert.deepStrictEqual(counterLimiter.rejected, [3], 'counter: rejected once at the limit');
assert.ok(counterLimiter.rolls.length >= 1, 'counter: window rolled at least once');

assert.ok(waiter.allowed.length >= 2, 'waiter: initial consume + eventual waitForToken admission both recorded');

console.log('\nobservedSlidingWindowLimiter: all assertions passed');
