/** noop-timing — NoOpTiming is a zero-overhead implementation of TimingInterface for test helpers and disabled production code paths. Run: npx tsx examples/noop-timing.ts */

import assert from 'node:assert/strict';

// #region usage
import { NoOpTiming, TimingEvent } from '../src/index.js';

const timing = NoOpTiming.create();

// Recording events is accepted without error but produces no stored data
timing.event(TimingEvent.create({ 'component': 'Cache', 'operation': 'get' }));
timing.event(TimingEvent.create({ 'component': 'Cache', 'operation': 'set' }));

const events = timing.getEvents();

// clear() returns the same instance for method chaining
const returned = timing.clear();

console.log('NoOpTiming.getEvents():', events);
console.log('clear() returns self:', returned === timing);
// #endregion usage

// NoOpTiming always returns exactly { durationMs: 0 }
assert.deepEqual(events, { 'durationMs': 0 });
assert.equal(returned, timing);

console.log('noop-timing: all assertions passed');
