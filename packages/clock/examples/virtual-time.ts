/** virtual-time — multiple VirtualTimeCounter sequences, hrtime/epoch-ms alignment, and monotonicity verification. Run: npx tsx packages/clock/examples/virtual-time.ts */

import assert from 'node:assert/strict';

// #region usage
import {
  Clock,
  VirtualClockProvider,
  VirtualTimeCounter
} from '../src/index.js';

// --- hrtime matches epoch-ms * 1_000_000n ---

const counterA = new VirtualTimeCounter(0);
const clockA = new Clock(new VirtualClockProvider(counterA));

counterA.advance(100);

const epochMs = clockA.now();
const ns = clockA.hrtime();

console.log(`epochMs=${epochMs}, hrtime=${ns}n (== ${epochMs} * 1_000_000n)`);

// --- Monotonicity after advances ---

const counterB = new VirtualTimeCounter(0);
const clockB = new Clock(new VirtualClockProvider(counterB));

const deltas = [0, 50, 0, 200, 100];
const readings: number[] = [];

const deltasLen = deltas.length;

for (let i = 0; i < deltasLen; i++) {
  counterB.advance(deltas[i] ?? 0);
  readings.push(clockB.now());
}

console.log(`monotonicity sequence: ${readings.join(' → ')}`);

// --- Two independent counters evolve independently ---

const counterX = new VirtualTimeCounter(1000);
const counterY = new VirtualTimeCounter(2000);
const clockX = new Clock(new VirtualClockProvider(counterX));
const clockY = new Clock(new VirtualClockProvider(counterY));

counterX.advance(500);
counterY.advance(100);

console.log(`independent counters: clockX.now()=${clockX.now()}, clockY.now()=${clockY.now()}`);

// --- Shared counter keeps multiple clocks in sync ---

const shared = new VirtualTimeCounter(0);
const clockP = new Clock(new VirtualClockProvider(shared));
const clockQ = new Clock(new VirtualClockProvider(shared));

shared.advance(300);

console.log(`shared counter: clockP.now()=${clockP.now()}, clockQ.now()=${clockQ.now()}`);
// #endregion usage

assert.equal(ns, BigInt(epochMs) * 1_000_000n, 'hrtime equals epoch-ms * 1_000_000n');

const readingsLen = readings.length;

for (let i = 1; i < readingsLen; i++) {
  assert.ok(
    (readings[i] ?? 0) >= (readings[i - 1] ?? 0),
    `now() must not decrease: readings[${i - 1}]=${readings[i - 1]}, readings[${i}]=${readings[i]}`
  );
}

assert.equal(clockX.now(), 1500);
assert.equal(clockY.now(), 2100);
assert.equal(clockP.now(), 300);
assert.equal(clockQ.now(), 300);

console.log('virtual-time: all assertions passed');
