/**
 * VirtualScheduler example — schedules two one-shot tasks and advances time in steps.
 * Demonstrates deterministic task firing: only tasks due at or before the current
 * virtual time are executed when advance() is called.
 *
 * Run: npx tsx packages/scheduler/examples/virtual-scheduler.ts
 */
import assert from 'node:assert/strict';

import { VirtualTimeCounter } from '../../clock/src/index.js';
import { VirtualScheduler } from '../src/index.js';

const counter = new VirtualTimeCounter(0);
const scheduler = new VirtualScheduler(counter);

const fireOrder: number[] = [];

scheduler.scheduleAt(100, () => { fireOrder.push(100); });
scheduler.scheduleAt(200, () => { fireOrder.push(200); });

// Advance to 150 — only the task at 100 should fire.
scheduler.advance(150);
assert.equal(fireOrder.length, 1, 'Expected 1 fired task after advance(150)');
assert.equal(fireOrder[0], 100, 'Expected task at ms=100 to fire first');

// Advance another 100 (total 250) — the task at 200 should now fire.
scheduler.advance(100);
assert.equal(fireOrder.length, 2, 'Expected 2 fired tasks after second advance');
assert.equal(fireOrder[1], 200, 'Expected task at ms=200 to fire second');

console.log('Fire order:', fireOrder);
