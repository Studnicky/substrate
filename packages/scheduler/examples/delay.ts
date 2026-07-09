/**
 * delay — `Delay.sleep`/`Delay.value` in both real-time and virtual-time modes.
 * Demonstrates that injecting a `VirtualScheduler` + `VirtualClockProvider` pair
 * resolves the returned Promise as soon as virtual time is advanced, with no
 * real wall-clock wait.
 *
 * Run: npx tsx packages/scheduler/examples/delay.ts
 */
import assert from 'node:assert/strict';

// #region usage
import { VirtualClockProvider, VirtualTimeCounter } from '../../clock/src/index.js';
import { Delay, VirtualScheduler } from '../src/index.js';

// Real-time: resolves after ~10ms of wall-clock time.
await Delay.sleep(10);
console.log('Real-time sleep resolved');

// Virtual-time: resolves as soon as advance() crosses the requested delay,
// with no real wall-clock wait.
const counter = VirtualTimeCounter.create({ 'startMs': 0 });
const scheduler = VirtualScheduler.create({ 'counter': counter });
const clock = VirtualClockProvider.create(counter);

let resolved = false;
const sleepPromise = Delay.sleep(1_000, { 'clock': clock, 'scheduler': scheduler }).then(() => {
  resolved = true;
});

console.log('Resolved before advance:', resolved);

scheduler.advance(1_000);
await sleepPromise;

console.log('Resolved after advance:', resolved);

// Delay.value carries a value through the wait — useful for backoff/race compositions.
const backoffPromise = Delay.value(500, 'retry', { 'clock': clock, 'scheduler': scheduler });
scheduler.advance(500);
console.log('Backoff value:', await backoffPromise);
// #endregion usage

assert.equal(resolved, true, 'Expected virtual sleep to resolve after advance()');

console.log('delay: all assertions passed');
