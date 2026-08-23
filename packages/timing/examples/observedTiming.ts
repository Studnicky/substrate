/** observedTiming — subclass Timing to trace every lifecycle hook. Run: npx tsx examples/observedTiming.ts */

import assert from 'node:assert/strict';

// #region usage
import type { TimingEventDataEntity } from '../src/entities/index.js';

import { TimingOptionsEntity } from '../src/entities/index.js';
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

  public constructor(options: TimingOptionsEntity.Type = TimingOptionsEntity.create()) {
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

// Create an ObservedTiming with a small maximumEvents to trigger eviction
const timing = new ObservedTiming(TimingOptionsEntity.create({ 'maximumEvents': 3 }));

// Record two events (cache: initialize + DbAdapter.query + CacheService.get = 3, at capacity)
timing.event(
  TimingEvent.create({ 'component': 'DbAdapter', 'operation': 'query' })
);

timing.event(
  TimingEvent.create({ 'component': 'CacheService', 'operation': 'get' })
);

// Call getEvents to trigger onGetEvents (3 entries in cache)
const snapshot = timing.getEvents();
console.log('snapshot keys:', [...snapshot.keys()]);

// Clear to trigger onClear
timing.clear();

// Fill cache to capacity (maximumEvents: 3) then overflow to trigger eviction
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
console.log('final keys:', [...final.keys()]);
// #endregion usage

// Assertions on recorded events structure
assert.equal(timing.initEvents.length, 1, 'onInitialize should fire exactly once');
assert.equal(typeof timing.initEvents[0]!.startTime, 'bigint', 'startTime should be bigint');

assert.ok(timing.recordedEvents.length >= 4, 'at least 4 events should have been recorded');

const recordedEventsLength = timing.recordedEvents.length;
for (let index = 0; index < recordedEventsLength; index += 1) {
  const entry = timing.recordedEvents[index]!;
  assert.equal(typeof entry.data.event, 'string', 'event label should be a string');
  assert.equal(typeof entry.timestamp, 'bigint', 'timestamp should be bigint');
}

assert.ok(timing.evictedNames.length >= 1, 'at least one eviction should have occurred');
assert.equal(timing.clearCount, 1, 'onClear should fire exactly once');
assert.equal(timing.getEventsCalls.length, 2, 'onGetEvents should fire twice');

const getEventsCallsLength = timing.getEventsCalls.length;
for (let index = 0; index < getEventsCallsLength; index += 1) {
  const call = timing.getEventsCalls[index]!;
  assert.equal(typeof call.eventCount, 'number', 'eventCount should be a number');
}

console.log('observedTiming: all assertions passed');
