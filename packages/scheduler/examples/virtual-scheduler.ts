/**
 * virtual-scheduler — schedules two one-shot tasks and advances time in steps.
 * Demonstrates deterministic task firing: only tasks due at or before the current
 * virtual time are executed when advance() is called.
 *
 * Run: npx tsx packages/scheduler/examples/virtual-scheduler.ts
 */
import assert from 'node:assert/strict';

// #region usage
import { VirtualTimeCounter } from '../../clock/src/index.js';
import { VirtualScheduler } from '../src/index.js';

const counter = VirtualTimeCounter.create({ 'startMs': 0 });
const scheduler = VirtualScheduler.create({ 'counter': counter });

const fireOrder: number[] = [];

scheduler.scheduleAt(100, () => { fireOrder.push(100); });
scheduler.scheduleAt(200, () => { fireOrder.push(200); });

// Advance to 150 — only the task at 100 should fire.
scheduler.advance(150);

console.log('Fire order after advance(150):', fireOrder);

// Advance another 100 (total 250) — the task at 200 should now fire.
scheduler.advance(100);

console.log('Fire order after advance(100) more:', fireOrder);
// #endregion usage

assert.equal(fireOrder.length, 2, 'Expected 2 fired tasks after both advances');
assert.equal(fireOrder[0], 100, 'Expected task at ms=100 to fire first');
assert.equal(fireOrder[1], 200, 'Expected task at ms=200 to fire second');

console.log('virtual-scheduler: all assertions passed');
