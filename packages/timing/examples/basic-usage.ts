// Demonstrates building a Timing instance, recording component.operation and
// component.operation.status events, and inspecting the elapsed-ms output map.
// Run: npx tsx packages/timing/examples/basic-usage.ts

import assert from 'node:assert/strict';

import { TIMING_STATUS, Timing, TimingEvent } from '../src/index.js';

const timing = Timing.builder().maxEvents(50).build();

// Record a plain component.operation event
timing.event(
  TimingEvent.create().component('GraphAdapter').operation('query').build()
);

// Record component.operation.status events
timing.event(
  TimingEvent.create()
    .component('CacheService')
    .operation('get')
    .status(TIMING_STATUS.START)
    .build()
);

timing.event(
  TimingEvent.create()
    .component('CacheService')
    .operation('get')
    .status(TIMING_STATUS.COMPLETE)
    .build()
);

timing.event(
  TimingEvent.create()
    .component('CacheService')
    .operation('get')
    .status(TIMING_STATUS.HIT)
    .build()
);

const events = timing.getEvents();

// Structural assertions — deterministic regardless of wall-clock timing
assert.ok('initialize' in events, 'initialize key must be present');
assert.ok('GraphAdapter.query' in events, 'GraphAdapter.query key must be present');
assert.ok('CacheService.get.start' in events, 'CacheService.get.start key must be present');
assert.ok('CacheService.get.complete' in events, 'CacheService.get.complete key must be present');
assert.ok('CacheService.get.hit' in events, 'CacheService.get.hit key must be present');
assert.ok('durationMs' in events, 'durationMs key must be present');

assert.equal(typeof events['GraphAdapter.query'], 'number');
assert.equal(typeof events['CacheService.get.start'], 'number');
assert.ok(events['GraphAdapter.query'] >= 0);
assert.ok(events['durationMs'] >= 0);

console.log('events:', events);
