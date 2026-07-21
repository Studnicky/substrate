/** observedTiming — subclass Timing to trace every lifecycle hook. Run: npx tsx examples/observedTiming.ts */

import assert from 'node:assert/strict';

// #region usage
import type { TimingEventDataEntity, TimingOptionsEntity } from '../src/index.js';

import { Timing, TimingEvent } from '../src/index.js';

class ObservedTiming extends Timing {
  // onInitialize fires inside super() before class field initializers run.
  // Use `declare` so TypeScript knows the type but emits no own-property
  // initializer that would reset the value after super() returns.
  declare initEvents: { 'startTime': bigint }[];
  recordedEvents: { 'data': TimingEventDataEntity.Type; 'timestamp': bigint }[] = [];
  evictedNames: string[] = [];
  clearCount = 0;
  getEventsCalls: { 'eventCount': number }[] = [];

  public constructor(options: TimingOptionsEntity.Type = {}) {
    super(options);
  }

  protected override onInitialize(startTime: bigint): void {
    console.log(`[timing] initialize startTime=${startTime}`);
    // Bootstrap the array here because this fires before the field initializer.
    this.initEvents ??= [];
    this.initEvents.push({ 'startTime': startTime });
  }

  protected override onEvent(data: TimingEventDataEntity.Type, timestamp: bigint): void {
    console.log(`[timing] event name=${data.event} timestamp=${timestamp}`);
    this.recordedEvents.push({ 'data': data, 'timestamp': timestamp });
  }

  protected override onEvict(name: string): void {
    console.log(`[timing] evict name=${name}`);
    this.evictedNames.push(name);
  }

  protected override onClear(): void {
    console.log('[timing] clear');
    this.clearCount++;
  }

  protected override onGetEvents(eventCount: number): void {
    console.log(`[timing] getEvents eventCount=${eventCount}`);
    this.getEventsCalls.push({ 'eventCount': eventCount });
  }
}

// Create an ObservedTiming with a small maxEvents to trigger eviction
const timing = new ObservedTiming({ 'maxEvents': 3 });

// Record two events (cache: initialize + DbAdapter.query + CacheService.get = 3, at capacity)
timing.event(
  TimingEvent.create({ 'component': 'DbAdapter', 'operation': 'query' })
);

timing.event(
  TimingEvent.create({ 'component': 'CacheService', 'operation': 'get' })
);

// Call getEvents to trigger onGetEvents (3 entries in cache)
const snapshot = timing.getEvents();
console.log('snapshot keys:', Object.keys(snapshot));

// Clear to trigger onClear
timing.clear();

// Fill cache to capacity (maxEvents: 3) then overflow to trigger eviction
timing.event(
  TimingEvent.create({ 'component': 'DbAdapter', 'operation': 'insert' })
);

timing.event(
  TimingEvent.create({ 'component': 'CacheService', 'operation': 'set' })
);

timing.event(
  TimingEvent.create({ 'component': 'MetricsService', 'operation': 'flush' })
);

// This 4th event overflows the cache — evicts DbAdapter.insert
timing.event(
  TimingEvent.create({ 'component': 'MetricsService', 'operation': 'emit' })
);

// Final getEvents call
const final = timing.getEvents();
console.log('final keys:', Object.keys(final));
// #endregion usage

// Assertions on recorded events structure
assert.equal(timing.initEvents.length, 1, 'onInitialize should fire exactly once');
assert.equal(typeof timing.initEvents[0]!.startTime, 'bigint', 'startTime should be bigint');

assert.ok(timing.recordedEvents.length >= 4, 'at least 4 events should have been recorded');

for (const entry of timing.recordedEvents) {
  assert.equal(typeof entry.data.event, 'string', 'event label should be a string');
  assert.equal(typeof entry.timestamp, 'bigint', 'timestamp should be bigint');
}

assert.ok(timing.evictedNames.length >= 1, 'at least one eviction should have occurred');
assert.equal(timing.clearCount, 1, 'onClear should fire exactly once');
assert.equal(timing.getEventsCalls.length, 2, 'onGetEvents should fire twice');

for (const call of timing.getEventsCalls) {
  assert.equal(typeof call.eventCount, 'number', 'eventCount should be a number');
}

console.log('observedTiming: all assertions passed');
