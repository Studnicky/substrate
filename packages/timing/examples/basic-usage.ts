/** basic-usage — build a Timing instance, record component.operation events, and inspect elapsed-ms output. Run: npx tsx examples/basic-usage.ts */

import assert from 'node:assert/strict';

// #region usage
import { Timing, TIMING_STATUS, TimingEvent } from '../src/index.js';

const timing = Timing.create({ 'maxEvents': 50 });

// Record a plain component.operation event
timing.event(
  TimingEvent.create({ 'component': 'GraphAdapter', 'operation': 'query' })
);

// Record component.operation.status events
timing.event(
  TimingEvent.create({ 'component': 'CacheService', 'operation': 'get', 'status': TIMING_STATUS.START })
);

timing.event(
  TimingEvent.create({ 'component': 'CacheService', 'operation': 'get', 'status': TIMING_STATUS.COMPLETE })
);

timing.event(
  TimingEvent.create({ 'component': 'CacheService', 'operation': 'get', 'status': TIMING_STATUS.HIT })
);

const events = timing.getEvents();

console.log('events:', events);
// #endregion usage

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
assert.ok(events.durationMs >= 0);

console.log('basic-usage: all assertions passed');
