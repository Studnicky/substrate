/**
 * Basic usage of @studnicky/clock — RealTimeClockProvider for production use
 * and VirtualClockProvider + VirtualTimeCounter for deterministic test control.
 *
 * Run: npx tsx packages/clock/examples/basic-usage.ts
 */
import assert from 'node:assert/strict';

import {
  Clock,
  RealTimeClockProvider,
  VirtualClockProvider,
  VirtualTimeCounter,
} from '../src/index.js';

// --- RealTimeClockProvider ---

const realProvider = new RealTimeClockProvider();
const realClock = new Clock(realProvider);

const nowA = realClock.now();
const nowB = realClock.now();

assert.ok(nowB >= nowA, 'now() must be monotonically non-decreasing');
console.log(`RealTimeClockProvider.now(): first=${nowA}, second=${nowB}`);

const hrtA = realClock.hrtime();
const hrtB = realClock.hrtime();

assert.ok(hrtB >= hrtA, 'hrtime() must be monotonically non-decreasing');
console.log(`RealTimeClockProvider.hrtime(): first=${hrtA}n, second=${hrtB}n`);

// --- VirtualTimeCounter + VirtualClockProvider ---

const counter = new VirtualTimeCounter(0);
const virtualProvider = new VirtualClockProvider(counter);
const virtualClock = new Clock(virtualProvider);

assert.equal(virtualClock.now(), 0, 'virtual clock starts at 0');
console.log(`VirtualClock.now() at start: ${virtualClock.now()}`);

counter.advance(500);
assert.equal(virtualClock.now(), 500, 'virtual clock advances to 500 after +500ms');
console.log(`VirtualClock.now() after advance(500): ${virtualClock.now()}`);

counter.advance(1000);
assert.equal(virtualClock.now(), 1500, 'virtual clock advances to 1500 after +1000ms');
console.log(`VirtualClock.now() after advance(1000): ${virtualClock.now()}`);

console.log('basic-usage: all assertions passed');
