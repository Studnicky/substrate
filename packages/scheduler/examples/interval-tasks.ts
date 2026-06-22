/**
 * Interval tasks example — demonstrates scheduleEvery() and cancelAll() with VirtualScheduler.
 * Shows that a 50 ms interval fires 4 times when virtual time advances 200 ms from 0,
 * and that cancelAll() prevents further fires after it is called.
 *
 * Run: npx tsx packages/scheduler/examples/interval-tasks.ts
 */
import assert from 'node:assert/strict';

import { VirtualTimeCounter } from '../../clock/src/index.js';
import { VirtualScheduler } from '../src/index.js';

// --- Part 1: interval fires the expected number of times ---

const counter = new VirtualTimeCounter(0);
const scheduler = new VirtualScheduler(counter);

let count = 0;

// Counter starts at 0; first fire at 0+50=50. Subsequent fires at 100, 150, 200.
scheduler.scheduleEvery(50, () => { count++; });

scheduler.advance(200);
assert.equal(count, 4, `Expected 4 fires from a 50 ms interval over 200 ms; got ${count.toString()}`);

console.log('Interval fire count:', count);

// --- Part 2: cancelAll() prevents further fires ---

const counter2 = new VirtualTimeCounter(0);
const scheduler2 = new VirtualScheduler(counter2);

let countAfterCancel = 0;

scheduler2.scheduleEvery(50, () => { countAfterCancel++; });

// Cancel before any advance — no tasks should fire.
scheduler2.cancelAll();
scheduler2.advance(200);

assert.equal(countAfterCancel, 0, 'Expected 0 fires after cancelAll()');

console.log('Fires after cancelAll():', countAfterCancel);
