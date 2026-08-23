/** basic-usage — build a Timing instance, record component.operation events, and inspect elapsed-ms output. Run: npx tsx examples/basic-usage.ts */

import assert from 'node:assert/strict';

// #region usage
import { Timing, TIMING_STATUS, TimingEvent } from '../src/index.js';

const timing = Timing.create({ 'maximumEvents': 50 });

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
assert.ok(events.has('initialize'), 'initialize key must be present');
assert.ok(events.has('GraphAdapter.query'), 'GraphAdapter.query key must be present');
assert.ok(events.has('CacheService.get.start'), 'CacheService.get.start key must be present');
assert.ok(events.has('CacheService.get.complete'), 'CacheService.get.complete key must be present');
assert.ok(events.has('CacheService.get.hit'), 'CacheService.get.hit key must be present');
assert.ok(events.has('durationMs'), 'durationMs key must be present');

assert.equal(typeof events.get('GraphAdapter.query'), 'number');
assert.equal(typeof events.get('CacheService.get.start'), 'number');
assert.ok((events.get('GraphAdapter.query') ?? -1) >= 0);
assert.ok((events.get('durationMs') ?? -1) >= 0);

console.log('basic-usage: all assertions passed');
