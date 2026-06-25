/**
 * builderScheduler — constructs a VirtualScheduler via VirtualScheduler.builder().withCounter(...).build()
 * and schedules both one-shot and interval tasks.
 * Run: npx tsx examples/builderScheduler.ts
 */

import assert from 'node:assert/strict';

// #region usage
import { VirtualTimeCounter } from '../../clock/src/index.js';
import { VirtualScheduler } from '../src/index.js';

const counter = VirtualTimeCounter.create({ 'startMs': 0 });

// Build a VirtualScheduler using the fluent builder
const scheduler = VirtualScheduler.builder()
  .withCounter(counter)
  .build();

console.log('Scheduler built. Current time:', counter.nowMs());

const fired: string[] = [];

// Schedule a one-shot task at t=100
scheduler.scheduleAt(100, () => { fired.push('one-shot@100'); });

// Schedule an interval task every 50 ms
scheduler.scheduleEvery(50, () => { fired.push(`interval@${counter.nowMs()}`); });

// Advance virtual time by 200 ms — fires one-shot once, interval 4 times
scheduler.advance(200);

console.log('Fired events:', fired);
console.log('Current virtual time:', counter.nowMs());

// Cancel remaining tasks
scheduler.cancelAll();
console.log('All tasks cancelled');
// #endregion usage

// Interval fires at t=50, 100, 150, 200 → 4 times; one-shot fires once at t=100
assert.equal(fired.filter((e) => { const result = e.startsWith('interval');
  return result; }).length, 4, 'interval fires 4 times over 200 ms');
assert.equal(fired.filter((e) => { const result = e.startsWith('one-shot');
  return result; }).length, 1, 'one-shot fires once');
assert.equal(counter.nowMs(), 200, 'virtual time advanced to 200');

console.log('builderScheduler: all assertions passed');
