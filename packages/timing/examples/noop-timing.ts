// Demonstrates NoOpTiming — a zero-overhead implementation of TimingInterface
// for test helpers and disabled production code paths.
// Run: npx tsx packages/timing/examples/noop-timing.ts

import assert from 'node:assert/strict';

import { NoOpTiming, TimingEvent } from '../src/index.js';

const timing = NoOpTiming.create();

// Recording events is accepted without error but produces no stored data
timing.event(TimingEvent.create().component('Cache').operation('get').build());
timing.event(TimingEvent.create().component('Cache').operation('set').build());

const events = timing.getEvents();

// NoOpTiming always returns exactly { durationMs: 0 }
assert.deepEqual(events, { durationMs: 0 });

// clear() returns the same instance for method chaining
const returned = timing.clear();
assert.equal(returned, timing);

console.log('NoOpTiming.getEvents():', events);
console.log('clear() returns self:', returned === timing);
