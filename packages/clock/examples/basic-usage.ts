/** basic-usage — RealTimeClockProvider for production and VirtualClockProvider for deterministic test control. Run: npx tsx packages/clock/examples/basic-usage.ts */

import assert from 'node:assert/strict';

// #region usage
import {
  Clock,
  RealTimeClockProvider,
  VirtualClockProvider,
  VirtualTimeCounter
} from '../src/index.js';

// --- RealTimeClockProvider ---

const realProvider = new RealTimeClockProvider();
const realClock = new Clock(realProvider);

const nowA = realClock.now();
const nowB = realClock.now();

console.log(`RealTimeClockProvider.now(): first=${nowA}, second=${nowB}`);

const hrtA = realClock.hrtime();
const hrtB = realClock.hrtime();

console.log(`RealTimeClockProvider.hrtime(): first=${hrtA}n, second=${hrtB}n`);

// --- VirtualTimeCounter + VirtualClockProvider ---

const counter = new VirtualTimeCounter(0);
const virtualProvider = new VirtualClockProvider(counter);
const virtualClock = new Clock(virtualProvider);

const startMs = virtualClock.now();
console.log(`VirtualClock.now() at start: ${startMs}`);

counter.advance(500);
const after500 = virtualClock.now();
console.log(`VirtualClock.now() after advance(500): ${after500}`);

counter.advance(1000);
const after1000 = virtualClock.now();
console.log(`VirtualClock.now() after advance(1000): ${after1000}`);
// #endregion usage

assert.ok(nowB >= nowA, 'now() must be monotonically non-decreasing');
assert.ok(hrtB >= hrtA, 'hrtime() must be monotonically non-decreasing');
assert.equal(startMs, 0, 'virtual clock starts at 0');
assert.equal(after500, 500, 'virtual clock advances to 500 after +500ms');
assert.equal(after1000, 1500, 'virtual clock advances to 1500 after +1000ms');

console.log('basic-usage: all assertions passed');
