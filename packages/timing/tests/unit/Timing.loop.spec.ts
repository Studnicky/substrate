import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ConfigurationError } from '@studnicky/config';
import { HookInvocationError } from '@studnicky/errors';

import { DEFAULT_MAXIMUM_EVENTS, TIMING_STATUS } from '../../src/constants/index.js';
import type { TimingEventDataEntity } from '../../src/entities/TimingEventDataEntity.js';
import { TimingOptionsEntity } from '../../src/entities/TimingOptionsEntity.js';
import { Timing } from '../../src/modules/Timing.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';
import scenarioGroups from './Timing.scenarios.json' with { type: 'json' };

type TimingEventFixture = {
  component: string;
  operation: string;
  status?: (typeof TIMING_STATUS)[keyof typeof TIMING_STATUS];
};

type ScenarioBase<
  Shape extends string,
  Input extends Record<string, unknown>,
  Expected extends Record<string, unknown>
> = {
  description: string;
  expected: Expected;
  input: Input;
  shape: Shape;
  name: string;
};

type ScenarioCaseByShape = {
  'accepts-config-options': ScenarioBase<'accepts-config-options', { timing: { options: TimingOptionsEntity.Type[] } }, { createdCount: number }>;
  'async-onEvent-unhandled': ScenarioBase<'async-onEvent-unhandled', { errorMessage: string; event: TimingEventFixture; settleTicks: number }, { unhandledRejections: number }>;
  'clear-all-and-reuse': ScenarioBase<'clear-all-and-reuse', { afterEvent: TimingEventFixture; batch: { clearCount: number }; beforeEvents: TimingEventFixture[]; waitAfterClearMs: number }, { afterAddCount: number; afterClearCount: number; beforeCount: number }>;
  'clear-keeps-start-time': ScenarioBase<'clear-keeps-start-time', { waitAfterClearMs: number; waitBeforeClearMs: number }, { durationIncreasesAfterClear: boolean }>;
  'clear-multiple-times': ScenarioBase<'clear-multiple-times', { batch: { clearCount: number }; event: TimingEventFixture }, { finalCount: number }>;
  'component-operation-events': ScenarioBase<'component-operation-events', { events: TimingEventFixture[] }, { keys: string[] }>;
  'constructor-wraps-error': ScenarioBase<'constructor-wraps-error', { errorMessage: string }, { wrapped: boolean }>;
  'continues-after-get-events': ScenarioBase<'continues-after-get-events', { waitBeforeFirstMs: number; waitBeforeSecondMs: number }, { durationIncreases: boolean }>;
  'convert-time': ScenarioBase<'convert-time', { ns: number; unit: 'ms' }, { result: number }>;
  'creates-instance': ScenarioBase<'creates-instance', { expectMethods: Array<'clear' | 'event' | 'getEvents'> }, { instanceOf: 'Timing'; methodCount: number }>;
  'cumulative-timing': ScenarioBase<'cumulative-timing', { events: TimingEventFixture[]; stageWaitMs: number[] }, { keys: string[]; minimums: Record<string, number> }>;
  'domain-status': ScenarioBase<'domain-status', { events: TimingEventFixture[] }, { keys: string[] }>;
  'evicts-default-max-events': ScenarioBase<'evicts-default-max-events', { event: { component: string; operationPrefix: string }; overflowMargin: number }, { defaultMaxEvents: number; retainedLastEventPrefix: string; retainedLastIndex: number }>;
  'evicts-when-max-events-exceeded': ScenarioBase<'evicts-when-max-events-exceeded', { events: TimingEventFixture[]; timing: { maximumEvents: number } }, { evictedKeys: string[]; retainedKeys: string[] }>;
  'high-resolution-timing': ScenarioBase<'high-resolution-timing', { busyWaitMs: number; event: TimingEventFixture }, { minElapsedMs: number }>;
  'hook-error-instance': ScenarioBase<'hook-error-instance', { errorMessage: string; event: TimingEventFixture }, { instanceOf: 'HookInvocationError' }>;
  'immediate-operations': ScenarioBase<'immediate-operations', { event: TimingEventFixture }, Record<string, never>>;
  'includes-duration': ScenarioBase<'includes-duration', { busyWaitMs: number; event: TimingEventFixture }, { minDurationMs: number }>;
  'includes-later-events': ScenarioBase<'includes-later-events', { firstEvent: TimingEventFixture; secondEvent: TimingEventFixture }, { newKey: string }>;
  'increasing-elapsed-times': ScenarioBase<'increasing-elapsed-times', { busyWaitMs: number[]; events: TimingEventFixture[] }, { keysInOrder: string[] }>;
  'initial-only-initialize': ScenarioBase<'initial-only-initialize', { observeInitialize: boolean }, { durationMsType: 'number'; eventKeys: string[] }>;
  'json-serializable': ScenarioBase<'json-serializable', { event: TimingEventFixture }, { serializable: boolean }>;
  'logbody-context': ScenarioBase<'logbody-context', { events: TimingEventFixture[] }, { allValuesAreNumbers: boolean; keys: string[] }>;
  'maintains-most-recent-events': ScenarioBase<'maintains-most-recent-events', { cases: Array<{ eventNames: string[]; timing: { maximumEvents: number } }> }, { retainedSets: string[][] }>;
  'maximumEvents-accessible': ScenarioBase<'maximumEvents-accessible', { timing: { maximumEvents: number } }, { maximumEvents: number; startTimeType: 'bigint' }>;
  'maximumEvents-defaults': ScenarioBase<'maximumEvents-defaults', { defaultMaxEvents: number }, { maximumEvents: number }>;
  'mixes-status-and-plain': ScenarioBase<'mixes-status-and-plain', { events: TimingEventFixture[] }, { keys: string[] }>;
  'non-negative-values': ScenarioBase<'non-negative-values', { events: TimingEventFixture[] }, { allElapsedNonNegative: boolean }>;
  'onClear-hook-called': ScenarioBase<'onClear-hook-called', { batch: { clearCount: number } }, { clearCount: number }>;
  'onEvent-hook-called': ScenarioBase<'onEvent-hook-called', { event: TimingEventFixture }, { eventCountDelta: number; lastEventData: string }>;
  'onEvict-hook-called': ScenarioBase<'onEvict-hook-called', { events: TimingEventFixture[]; timing: { maximumEvents: number } }, { evictCountAtLeast: number }>;
  'onGetEvents-hook-fires': ScenarioBase<'onGetEvents-hook-fires', { events: TimingEventFixture[] }, { getEventsCount: number; lastEventCounts: number[] }>;
  'onInitialize-hook-fires': ScenarioBase<'onInitialize-hook-fires', { construct: boolean }, { initCount: number; startTimeType: 'bigint' }>;
  'optional-status': ScenarioBase<'optional-status', { events: TimingEventFixture[] }, { keys: string[] }>;
  'read-hrtime-called': ScenarioBase<'read-hrtime-called', { event: TimingEventFixture }, { readCountDelta: number }>;
  'returns-new-object': ScenarioBase<'returns-new-object', { event: TimingEventFixture }, { sameReference: boolean }>;
  'same-name-events': ScenarioBase<'same-name-events', { busyWaitMs: number; event: TimingEventFixture }, { keys: string[]; uniqueCount: number }>;
  'starts-immediately': ScenarioBase<'starts-immediately', { busyWaitMs: number }, { hasInitialize: boolean; minDurationMs: number }>;
  'throwing-onClear': ScenarioBase<'throwing-onClear', { errorMessage: string; event: TimingEventFixture }, { errorName: 'HookInvocationError' }>;
  'throwing-onEvent': ScenarioBase<'throwing-onEvent', { errorMessage: string; event: TimingEventFixture }, { errorName: 'HookInvocationError' }>;
  'throwing-onEvict': ScenarioBase<'throwing-onEvict', { errorMessage: string; event: TimingEventFixture; timing: { maximumEvents: number } }, { errorName: 'HookInvocationError' }>;
  'throwing-onGetEvents': ScenarioBase<'throwing-onGetEvents', { errorMessage: string }, { errorName: 'HookInvocationError' }>;
  'throwing-onInitialize': ScenarioBase<'throwing-onInitialize', { errorMessage: string }, { errorName: 'HookInvocationError' }>;
  'timing-status-constants': ScenarioBase<'timing-status-constants', { events: TimingEventFixture[] }, { keys: string[] }>;
};

type ScenarioShape = keyof ScenarioCaseByShape;
type ScenarioCase = ScenarioCaseByShape[ScenarioShape];
type ScenarioRunner<Shape extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => Promise<void> | void;
type RunnerMap = { [Shape in ScenarioShape]: ScenarioRunner<Shape> };

class TestClock {
  static busyWait(ms: number): void {
    const start = process.hrtime.bigint();
    const targetNs = BigInt(ms * 1_000_000);
    while (process.hrtime.bigint() - start < targetNs) {
      // Busy loop
    }
  }
}

class TracedTiming extends Timing {
  public readCount = 0;
  public eventCount = 0;
  public evictCount = 0;
  public clearCount = 0;
  public lastEventData: TimingEventDataEntity.Type | undefined = undefined;
  declare public initCount: number;
  declare public lastInitStartTime: bigint | undefined;
  public getEventsCount = 0;
  public lastGetEventsEventCount: number | undefined = undefined;

  public constructor(options: Parameters<typeof TimingOptionsEntity.create>[0] = {}) {
    super(options);
  }

  protected override readHrtime(): bigint {
    this.readCount++;
    return super.readHrtime();
  }
  protected override onEvent(data: TimingEventDataEntity.Type, _timestamp: bigint): void {
    this.eventCount++;
    this.lastEventData = data;
  }
  protected override onEvict(_name: string): void { this.evictCount++; }
  protected override onClear(): void { this.clearCount++; }
  protected override onInitialize(startTime: bigint): void {
    if (this.initCount === undefined) {
      this.initCount = 0;
    }
    this.initCount++;
    this.lastInitStartTime = startTime;
  }
  protected override onGetEvents(eventCount: number): void {
    this.getEventsCount++;
    this.lastGetEventsEventCount = eventCount;
  }
  public testConvertTime(ns: bigint, unit: 'ms'): number {
    return this.convertTime(ns, unit);
  }
  public get testMaxEvents(): number {
    return this.maximumEvents;
  }
  public get testStartTime(): bigint {
    return this.startTime;
  }
}

function createTimingEvent(fixture: TimingEventFixture): TimingEventDataEntity.Type {
  return TimingEvent.create(fixture);
}

function recordTimingEvents(timer: Timing, fixtures: TimingEventFixture[]): void {
  for (const fixture of fixtures) {
    timer.event(createTimingEvent(fixture));
  }
}

function createTimingEventFromName(eventName: string): TimingEventDataEntity.Type {
  const separator = eventName.indexOf('.');
  if (separator < 1 || separator === eventName.length - 1) {
    throw new Error(`Invalid timing event fixture: ${eventName}`);
  }
  return TimingEvent.create({
    'component': eventName.slice(0, separator),
    'operation': eventName.slice(separator + 1)
  });
}

function eventKeys(events: ReadonlyMap<string, number>): string[] {
  return [...events.keys()].filter((key) => key !== 'durationMs');
}

function assertEventKeysPresent(events: ReadonlyMap<string, number>, keys: string[]): void {
  for (const eventName of keys) {
    assert.ok(events.get(eventName) !== undefined, `${eventName} should exist`);
  }
}

function assertEventKeysAbsent(events: ReadonlyMap<string, number>, keys: string[]): void {
  for (const eventName of keys) {
    assert.ok(events.get(eventName) === undefined, `${eventName} should be evicted`);
  }
}

const runnerMap: RunnerMap = {
  'creates-instance': (scenarioCase) => {
    const timer = Timing.create();
    assert.ok(timer instanceof Timing);
    assert.strictEqual(timer.constructor.name, scenarioCase.expected.instanceOf);
    assert.strictEqual(scenarioCase.input.expectMethods.length, scenarioCase.expected.methodCount);
    for (const methodName of scenarioCase.input.expectMethods) {
      assert.strictEqual(typeof timer[methodName], 'function');
    }
    return;
  },

  'starts-immediately': (scenarioCase) => {
    const timer = Timing.create();
    TestClock.busyWait(scenarioCase.input.busyWaitMs);
    const events = timer.getEvents();
    assert.ok(events.get('durationMs') !== undefined);
    assert.ok(events.get('durationMs')! >= scenarioCase.expected.minDurationMs, `Expected durationMs >= ${scenarioCase.expected.minDurationMs}ms, got ${events.get('durationMs')}ms`);
    assert.strictEqual(events.get('initialize') !== undefined, scenarioCase.expected.hasInitialize);
    return;
  },

  'accepts-config-options': (scenarioCase) => {
    let createdCount = 0;
    for (const options of scenarioCase.input.timing.options) {
      const timer = Timing.create(options);
      assert.ok(timer instanceof Timing);
      createdCount += 1;
    }
    assert.strictEqual(createdCount, scenarioCase.expected.createdCount);
    return;
  },

  'constructor-wraps-error': (scenarioCase) => {
    class ThrowingHrtimeTiming extends Timing {
      protected override readHrtime(): bigint {
        throw new Error(scenarioCase.input.errorMessage);
      }
    }

    assert.throws(() => {
      ThrowingHrtimeTiming.create();
    }, (error) => {
      assert.ok(error instanceof ConfigurationError);
      assert.ok(error.cause instanceof Error);
      assert.equal(error.cause.message, scenarioCase.input.errorMessage);
      return true;
    });
    assert.strictEqual(scenarioCase.expected.wrapped, true);
    return;
  },

  'component-operation-events': (scenarioCase) => {
    const timer = Timing.create();
    recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    assertEventKeysPresent(events, scenarioCase.expected.keys);
    return;
  },

  'increasing-elapsed-times': (scenarioCase) => {
    const timer = Timing.create();
    for (const [index, fixture] of scenarioCase.input.events.entries()) {
      TestClock.busyWait(scenarioCase.input.busyWaitMs[index] ?? 0);
      timer.event(createTimingEvent(fixture));
    }
    const events = timer.getEvents();
    assertEventKeysPresent(events, scenarioCase.expected.keysInOrder);
    for (let index = 1; index < scenarioCase.expected.keysInOrder.length; index++) {
      const previousKey = scenarioCase.expected.keysInOrder[index - 1];
      const currentKey = scenarioCase.expected.keysInOrder[index];
      assert.ok(previousKey !== undefined);
      assert.ok(currentKey !== undefined);
      const previousValue = events.get(previousKey);
      const currentValue = events.get(currentKey);
      assert.ok(previousValue !== undefined);
      assert.ok(currentValue !== undefined);
      assert.ok(previousValue < currentValue);
    }
    return;
  },

  'same-name-events': (scenarioCase) => {
    const timer = Timing.create();
    timer.event(createTimingEvent(scenarioCase.input.event));
    TestClock.busyWait(scenarioCase.input.busyWaitMs);
    timer.event(createTimingEvent(scenarioCase.input.event));
    const events = timer.getEvents();
    assertEventKeysPresent(events, scenarioCase.expected.keys);
    const matchingKeys = eventKeys(events).filter((key) => scenarioCase.expected.keys.includes(key));
    assert.strictEqual(matchingKeys.length, scenarioCase.expected.uniqueCount);
    return;
  },

  'optional-status': (scenarioCase) => {
    const timer = Timing.create();
    recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    assertEventKeysPresent(events, scenarioCase.expected.keys);
    return;
  },

  'domain-status': (scenarioCase) => {
    const timer = Timing.create();
    recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    assertEventKeysPresent(events, scenarioCase.expected.keys);
    return;
  },

  'mixes-status-and-plain': (scenarioCase) => {
    const timer = Timing.create();
    recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    assertEventKeysPresent(events, scenarioCase.expected.keys);
    return;
  },

  'timing-status-constants': (scenarioCase) => {
    const timer = Timing.create();
    recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    assertEventKeysPresent(events, scenarioCase.expected.keys);
    return;
  },

  'evicts-when-max-events-exceeded': (scenarioCase) => {
    const timer = Timing.create(scenarioCase.input.timing);
    recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    assert.strictEqual(eventKeys(events).length, scenarioCase.input.timing.maximumEvents);
    assertEventKeysAbsent(events, scenarioCase.expected.evictedKeys);
    assertEventKeysPresent(events, scenarioCase.expected.retainedKeys);
    return;
  },

  'maintains-most-recent-events': (scenarioCase) => {
    for (const [index, caseData] of scenarioCase.input.cases.entries()) {
      const timer = Timing.create(caseData.timing);
      for (const eventName of caseData.eventNames) {
        timer.event(createTimingEventFromName(eventName));
      }
      const events = timer.getEvents();
      assert.strictEqual(eventKeys(events).length, caseData.timing.maximumEvents);
      const expectedEventNames = scenarioCase.expected.retainedSets[index] ?? [];
      assertEventKeysPresent(events, expectedEventNames);
    }
    return;
  },

  'evicts-default-max-events': (scenarioCase) => {
    assert.ok(Number.isFinite(DEFAULT_MAXIMUM_EVENTS));
    assert.ok(DEFAULT_MAXIMUM_EVENTS <= 10_000);
    assert.strictEqual(DEFAULT_MAXIMUM_EVENTS, scenarioCase.expected.defaultMaxEvents);
    const timer = Timing.create();
    const totalEvents = DEFAULT_MAXIMUM_EVENTS + scenarioCase.input.overflowMargin;
    for (let i = 0; i < totalEvents; i++) {
      timer.event(createTimingEvent({
        'component': scenarioCase.input.event.component,
        'operation': `${scenarioCase.input.event.operationPrefix}${i}`
      }));
    }
    const events = timer.getEvents();
    assert.ok(eventKeys(events).length <= DEFAULT_MAXIMUM_EVENTS);
    assert.ok(events.get('initialize') === undefined, 'initialize should be evicted');
    assert.ok(events.get(`${scenarioCase.input.event.component}.${scenarioCase.input.event.operationPrefix}0`) === undefined, 'oldest events should be evicted');
    assert.ok(events.get(`${scenarioCase.input.event.component}.${scenarioCase.input.event.operationPrefix}${scenarioCase.expected.retainedLastIndex}`) !== undefined, 'most recent event should remain');
    assert.ok(`${scenarioCase.input.event.component}.${scenarioCase.input.event.operationPrefix}${scenarioCase.expected.retainedLastIndex}`.startsWith(scenarioCase.expected.retainedLastEventPrefix));
    return;
  },

  'initial-only-initialize': (scenarioCase) => {
    const timer = Timing.create();
    const events = timer.getEvents();
    assert.strictEqual(typeof events.get('durationMs'), scenarioCase.expected.durationMsType);
    assert.ok(typeof events === 'object');
    assert.deepEqual(eventKeys(events), scenarioCase.expected.eventKeys);
    assert.strictEqual(events.get('initialize') !== undefined, scenarioCase.input.observeInitialize);
    return;
  },

  'continues-after-get-events': (scenarioCase) => {
    const timer = Timing.create();
    TestClock.busyWait(scenarioCase.input.waitBeforeFirstMs);
    const events1 = timer.getEvents();
    TestClock.busyWait(scenarioCase.input.waitBeforeSecondMs);
    const events2 = timer.getEvents();
    assert.ok(events1.get('durationMs') !== undefined);
    assert.ok(events2.get('durationMs') !== undefined);
    assert.strictEqual((events2.get('durationMs') ?? 0) > (events1.get('durationMs') ?? 0), scenarioCase.expected.durationIncreases);
    return;
  },

  'returns-new-object': (scenarioCase) => {
    const timer = Timing.create();
    timer.event(createTimingEvent(scenarioCase.input.event));
    const events1 = timer.getEvents();
    const events2 = timer.getEvents();
    assert.strictEqual(Object.is(events1, events2), scenarioCase.expected.sameReference);
    return;
  },

  'includes-later-events': (scenarioCase) => {
    const timer = Timing.create();
    timer.event(createTimingEvent(scenarioCase.input.firstEvent));
    const events1 = timer.getEvents();
    timer.event(createTimingEvent(scenarioCase.input.secondEvent));
    const events2 = timer.getEvents();
    assert.ok(eventKeys(events2).length > eventKeys(events1).length);
    assert.ok(events2.get(scenarioCase.expected.newKey) !== undefined);
    return;
  },

  'throwing-onInitialize': (scenarioCase) => {
    class ThrowingInitializeTiming extends Timing {
      protected override onInitialize(): void {
        throw new Error(scenarioCase.input.errorMessage);
      }
    }
    assert.throws(() => {
      ThrowingInitializeTiming.create();
    }, { name: scenarioCase.expected.errorName });
    return;
  },

  'throwing-onClear': (scenarioCase) => {
    class ThrowingClearTiming extends Timing {
      protected override onClear(): void {
        throw new Error(scenarioCase.input.errorMessage);
      }
    }
    const timer = ThrowingClearTiming.create();
    timer.event(createTimingEvent(scenarioCase.input.event));
    assert.throws(() => {
      timer.clear();
    }, { name: scenarioCase.expected.errorName });
    return;
  },

  'throwing-onEvict': (scenarioCase) => {
    const input = scenarioCase.input;
    class ThrowingEvictTiming extends Timing {
      protected override onEvict(): void {
        throw new Error(input.errorMessage);
      }
    }
    const timer = ThrowingEvictTiming.create(input.timing);
    assert.throws(() => {
      timer.event(createTimingEvent(input.event));
    }, { name: scenarioCase.expected.errorName });
    return;
  },

  'throwing-onEvent': (scenarioCase) => {
    class ThrowingEventTiming extends Timing {
      protected override onEvent(): void {
        throw new Error(scenarioCase.input.errorMessage);
      }
    }
    const timer = ThrowingEventTiming.create();
    assert.throws(() => {
      timer.event(createTimingEvent(scenarioCase.input.event));
    }, { name: scenarioCase.expected.errorName });
    return;
  },

  'throwing-onGetEvents': (scenarioCase) => {
    class ThrowingGetEventsTiming extends Timing {
      protected override onGetEvents(): void {
        throw new Error(scenarioCase.input.errorMessage);
      }
    }
    const timer = ThrowingGetEventsTiming.create();
    assert.throws(() => {
      timer.getEvents();
    }, { name: scenarioCase.expected.errorName });
    return;
  },

  'hook-error-instance': (scenarioCase) => {
    class ThrowingEventTiming extends Timing {
      protected override onEvent(): void {
        throw new Error(scenarioCase.input.errorMessage);
      }
    }
    const timer = ThrowingEventTiming.create();
    let caught: unknown;
    try {
      timer.event(createTimingEvent(scenarioCase.input.event));
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof HookInvocationError);
    assert.strictEqual(caught.constructor.name, scenarioCase.expected.instanceOf);
    return;
  },

  'async-onEvent-unhandled': (scenarioCase) => {
    class AsyncRejectingEventTiming extends Timing {
      protected override async onEvent(): Promise<void> {
        await Promise.resolve();
        throw new Error(scenarioCase.input.errorMessage);
      }
    }
    const timer = AsyncRejectingEventTiming.create();
    let rejectionCount = 0;
    const onUnhandledRejection = (): void => { rejectionCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);
    return (async () => {
      try {
        timer.event(createTimingEvent(scenarioCase.input.event));
        for (let tick = 0; tick < scenarioCase.input.settleTicks; tick++) {
          await new Promise<void>((resolve) => { setImmediate(resolve); });
        }
        assert.strictEqual(rejectionCount, scenarioCase.expected.unhandledRejections);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    })();
  },

  'json-serializable': (scenarioCase) => {
    const timer = Timing.create();
    timer.event(createTimingEvent(scenarioCase.input.event));
    const events = timer.getEvents();
    const parsed = structuredClone(events);
    const eventName = createTimingEvent(scenarioCase.input.event).event;
    assert.ok(typeof parsed.get('durationMs') === 'number');
    assert.ok(typeof parsed.get(eventName) === 'number');
    assert.strictEqual(scenarioCase.expected.serializable, true);
    return;
  },

  'includes-duration': (scenarioCase) => {
    const timer = Timing.create();
    TestClock.busyWait(scenarioCase.input.busyWaitMs);
    timer.event(createTimingEvent(scenarioCase.input.event));
    const events = timer.getEvents();
    assert.ok(events.get('durationMs') !== undefined);
    assert.ok(events.get('durationMs')! >= scenarioCase.expected.minDurationMs);
    return;
  },

  'clear-all-and-reuse': (scenarioCase) => {
    const timer = Timing.create();
    recordTimingEvents(timer, scenarioCase.input.beforeEvents);
    const beforeClear = timer.getEvents();
    assert.ok(eventKeys(beforeClear).length >= scenarioCase.expected.beforeCount);
    for (let clearIndex = 0; clearIndex < scenarioCase.input.batch.clearCount; clearIndex++) {
      timer.clear();
    }
    const afterClear = timer.getEvents();
    assert.strictEqual(eventKeys(afterClear).length, scenarioCase.expected.afterClearCount);
    TestClock.busyWait(scenarioCase.input.waitAfterClearMs);
    timer.event(createTimingEvent(scenarioCase.input.afterEvent));
    const afterAdd = timer.getEvents();
    assert.strictEqual(eventKeys(afterAdd).length, scenarioCase.expected.afterAddCount);
    assertEventKeysPresent(afterAdd, [createTimingEvent(scenarioCase.input.afterEvent).event]);
    return;
  },

  'clear-keeps-start-time': (scenarioCase) => {
    const timer = Timing.create();
    TestClock.busyWait(scenarioCase.input.waitBeforeClearMs);
    const beforeClear = timer.getEvents();
    timer.clear();
    TestClock.busyWait(scenarioCase.input.waitAfterClearMs);
    const afterClear = timer.getEvents();
    assert.ok(beforeClear.get('durationMs') !== undefined);
    assert.ok(afterClear.get('durationMs') !== undefined);
    assert.strictEqual((afterClear.get('durationMs') ?? 0) > (beforeClear.get('durationMs') ?? 0), scenarioCase.expected.durationIncreasesAfterClear);
    return;
  },

  'clear-multiple-times': (scenarioCase) => {
    const timer = Timing.create();
    timer.event(createTimingEvent(scenarioCase.input.event));
    for (let clearIndex = 0; clearIndex < scenarioCase.input.batch.clearCount; clearIndex++) {
      timer.clear();
    }
    const events = timer.getEvents();
    assert.strictEqual(eventKeys(events).length, scenarioCase.expected.finalCount);
    return;
  },

  'cumulative-timing': (scenarioCase) => {
    const timer = Timing.create();
    for (const [index, fixture] of scenarioCase.input.events.entries()) {
      TestClock.busyWait(scenarioCase.input.stageWaitMs[index] ?? 0);
      timer.event(createTimingEvent(fixture));
    }
    const events = timer.getEvents();
    assertEventKeysPresent(events, scenarioCase.expected.keys);
    for (const [key, minimum] of Object.entries(scenarioCase.expected.minimums)) {
      assert.ok(events.get(key) !== undefined);
      assert.ok((events.get(key) ?? -1) >= minimum, `${key} should be at least ${minimum}`);
    }
    return;
  },

  'immediate-operations': (scenarioCase) => {
    const timer = Timing.create();
    const events = timer.getEvents();
    assert.ok(events.get('durationMs') !== undefined);
    assert.ok(events.get('durationMs')! >= 0);
    timer.event(createTimingEvent(scenarioCase.input.event));
    const events2 = timer.getEvents();
    const eventName = createTimingEvent(scenarioCase.input.event).event;
    assert.ok(events2.get(eventName) !== undefined);
    assert.ok((events2.get(eventName) ?? -1) >= 0);
    return;
  },

  'non-negative-values': (scenarioCase) => {
    const timer = Timing.create();
    recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    for (const elapsed of events.values()) {
      assert.strictEqual(elapsed >= 0, scenarioCase.expected.allElapsedNonNegative);
    }
    return;
  },

  'high-resolution-timing': (scenarioCase) => {
    const timer = Timing.create();
    TestClock.busyWait(scenarioCase.input.busyWaitMs);
    timer.event(createTimingEvent(scenarioCase.input.event));
    const events = timer.getEvents();
    const eventName = createTimingEvent(scenarioCase.input.event).event;
    assert.ok(events.get(eventName) !== undefined);
    assert.ok(Number.isFinite(events.get(eventName)));
    assert.ok((events.get(eventName) ?? -1) >= scenarioCase.expected.minElapsedMs);
    return;
  },

  'logbody-context': (scenarioCase) => {
    const timer = Timing.create();
    recordTimingEvents(timer, scenarioCase.input.events);
    const ctx = timer.getEvents();
    assertEventKeysPresent(ctx, scenarioCase.expected.keys);
    if (scenarioCase.expected.allValuesAreNumbers) {
      for (const value of Object.values(ctx)) {
        assert.strictEqual(typeof value, 'number');
      }
    }
    return;
  },

  'read-hrtime-called': (scenarioCase) => {
    const traced = new TracedTiming({});
    const countBefore = traced.readCount;
    traced.event(createTimingEvent(scenarioCase.input.event));
    assert.ok(traced.readCount >= countBefore + scenarioCase.expected.readCountDelta, 'readHrtime should be called during event()');
    return;
  },

  'onEvent-hook-called': (scenarioCase) => {
    const traced = new TracedTiming({});
    assert.strictEqual(traced.eventCount, 0);
    traced.event(createTimingEvent(scenarioCase.input.event));
    assert.strictEqual(traced.eventCount, scenarioCase.expected.eventCountDelta);
    assert.ok(traced.lastEventData !== undefined);
    assert.strictEqual(traced.lastEventData.event, scenarioCase.expected.lastEventData);
    return;
  },

  'onEvict-hook-called': (scenarioCase) => {
    const traced = new TracedTiming(scenarioCase.input.timing);
    assert.strictEqual(traced.evictCount, 0);
    recordTimingEvents(traced, scenarioCase.input.events);
    assert.ok(traced.evictCount >= scenarioCase.expected.evictCountAtLeast, 'onEvict should be called when cache overflows');
    return;
  },

  'onClear-hook-called': (scenarioCase) => {
    const traced = new TracedTiming({});
    assert.strictEqual(traced.clearCount, 0);
    for (let clearIndex = 0; clearIndex < scenarioCase.input.batch.clearCount; clearIndex++) {
      traced.clear();
    }
    assert.strictEqual(traced.clearCount, scenarioCase.expected.clearCount);
    return;
  },

  'maximumEvents-accessible': (scenarioCase) => {
    const traced = new TracedTiming(scenarioCase.input.timing);
    assert.strictEqual(traced.testMaxEvents, scenarioCase.expected.maximumEvents);
    assert.strictEqual(typeof traced.testStartTime, scenarioCase.expected.startTimeType);
    return;
  },

  'maximumEvents-defaults': (scenarioCase) => {
    const traced = new TracedTiming({});
    assert.strictEqual(DEFAULT_MAXIMUM_EVENTS, scenarioCase.input.defaultMaxEvents);
    assert.strictEqual(traced.testMaxEvents, scenarioCase.expected.maximumEvents);
    return;
  },

  'convert-time': (scenarioCase) => {
    const traced = new TracedTiming({});
    const result = traced.testConvertTime(BigInt(scenarioCase.input.ns), scenarioCase.input.unit);
    assert.strictEqual(result, scenarioCase.expected.result);
    return;
  },

  'onInitialize-hook-fires': (scenarioCase) => {
    assert.strictEqual(scenarioCase.input.construct, true);
    const traced = new TracedTiming({});
    assert.strictEqual(traced.initCount, scenarioCase.expected.initCount);
    assert.strictEqual(typeof traced.lastInitStartTime, scenarioCase.expected.startTimeType);
    return;
  },

  'onGetEvents-hook-fires': (scenarioCase) => {
    const traced = new TracedTiming({});
    traced.getEvents();
    assert.strictEqual(traced.getEventsCount, 1);
    assert.strictEqual(traced.lastGetEventsEventCount, scenarioCase.expected.lastEventCounts[0]);
    recordTimingEvents(traced, scenarioCase.input.events);
    traced.getEvents();
    assert.strictEqual(traced.getEventsCount, scenarioCase.expected.getEventsCount);
    assert.strictEqual(traced.lastGetEventsEventCount, scenarioCase.expected.lastEventCounts[1]);
    return;
  }
};

function runCase<Shape extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): Promise<void> | void {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Timing', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
