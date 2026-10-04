import { ConfigurationError } from '@studnicky/config/node';
import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { ClockProviderInterface } from '../../../src/interfaces/ClockProviderInterface.js';
import type { TIMING_STATUS } from '../../../src/timing/constants/index.js';
import type { TimingEventDataEntity } from '../../../src/timing/entities/TimingEventDataEntity.js';
import type { TimingOptionsEntity } from '../../../src/timing/entities/TimingOptionsEntity.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { Clock } from '../../../src/clock/Clock.js';
import { VirtualClockProvider } from '../../../src/clock/VirtualClockProvider.js';
import { VirtualTimeCounter } from '../../../src/clock/VirtualTimeCounter.js';
import { DEFAULT_MAXIMUM_EVENTS } from '../../../src/timing/constants/index.js';
import { Timing } from '../../../src/timing/modules/Timing.js';
import { TimingEvent } from '../../../src/timing/modules/TimingEvent.js';
import { TimingScenarioCaseEntity } from './entities/TimingScenarioCaseEntity.js';
import scenarioGroups from './Timing.scenarios.json' with { 'type': 'json' };

interface TimingEventFixtureInterface {
  'component': string;
  'operation': string;
  'status'?: (typeof TIMING_STATUS)[keyof typeof TIMING_STATUS];
}

class TestClock {
  static busyWait(ms: number): void {
    const start = process.hrtime.bigint();
    let targetNs: bigint;
    try {
      targetNs = BigInt(ms * 1_000_000);
    } catch (cause) {
      throw RuntimeError.create(`Cannot convert ${String(ms)}ms to nanoseconds`, { 'cause': cause });
    }

    while (process.hrtime.bigint() - start < targetNs) {
      // Busy loop
    }
  }
}

class CountingClockProvider implements ClockProviderInterface {
  readonly #counter: VirtualTimeCounter;
  #hrtimeCallCount = 0;

  public constructor(counter: VirtualTimeCounter) {
    this.#counter = counter;
  }

  public get hrtimeCallCount(): number {
    return this.#hrtimeCallCount;
  }

  public hrtime(): bigint {
    this.#hrtimeCallCount += 1;
    try {
      const result = BigInt(this.#counter.nowMs()) * 1_000_000n;
      return result;
    } catch (cause) {
      throw RuntimeError.create('Virtual counter time must be an integer number of milliseconds', { 'cause': cause });
    }
  }

  public now(): number {
    const result = this.#counter.nowMs();
    return result;
  }
}

class ThrowingClockProvider implements ClockProviderInterface {
  readonly #message: string;

  public constructor(message: string) {
    this.#message = message;
  }

  public hrtime(): bigint {
    throw RuntimeError.create(this.#message);
  }

  public now(): number {
    const result = 0;
    return result;
  }
}

class TracedTiming extends Timing {
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

  protected override onEvent(data: TimingEventDataEntity.Type, _timestamp: bigint): void {
    this.eventCount++;
    this.lastEventData = data;
  }
  protected override onEvict(_name: string): void {
    this.evictCount++;
  }
  protected override onClear(): void {
    this.clearCount++;
  }
  protected override onInitialize(startTime: bigint): void {
    this.initCount ??= 0;
    this.initCount++;
    this.lastInitStartTime = startTime;
  }
  protected override onGetEvents(eventCount: number): void {
    this.getEventsCount++;
    this.lastGetEventsEventCount = eventCount;
  }
  public testConvertTime(ns: bigint, unit: 'ms'): number {
    const convertedTime = this.convertTime(ns, unit);
    return convertedTime;
  }
  public get testMaximumEvents(): number {
    return this.maximumEvents;
  }
  public get testStartTime(): bigint {
    return this.startTime;
  }
}

class TimingScenarioSupport {
  static recordTimingEvents(timer: Timing, fixtures: TimingEventFixtureInterface[]): void {
    for (let index = 0; index < fixtures.length; index++) {
      const fixture = fixtures[index];
      if (fixture !== undefined) {
        timer.event(TimingEvent.create(fixture));
      }
    }
  }

  static createTimingEventFromName(eventName: string): TimingEventDataEntity.Type {
    const separator = eventName.indexOf('.');
    if (separator < 1 || separator === eventName.length - 1) {
      throw RuntimeError.create(`Invalid timing event fixture: ${eventName}`);
    }
    const timingEvent = TimingEvent.create({
      'component': eventName.slice(0, separator),
      'operation': eventName.slice(separator + 1)
    });
    return timingEvent;
  }

  static eventKeys(events: ReadonlyMap<string, number>): string[] {
    const keys = [...events.keys()];
    const eventNames = keys.filter((key) => {
      const isEvent = key !== 'durationMs';
      return isEvent;
    });
    return eventNames;
  }

  static assertEventKeysPresent(events: ReadonlyMap<string, number>, keys: string[]): void {
    for (let index = 0; index < keys.length; index++) {
      const eventName = keys[index];
      if (eventName !== undefined) {
        assert.ok(events.get(eventName) !== undefined, `${eventName} should exist`);
      }
    }
  }

  static assertEventKeysAbsent(events: ReadonlyMap<string, number>, keys: string[]): void {
    for (let index = 0; index < keys.length; index++) {
      const eventName = keys[index];
      if (eventName !== undefined) {
        assert.ok(events.get(eventName) === undefined, `${eventName} should be evicted`);
      }
    }
  }
}

class TimingRunners {
  static 'accepts-config-options'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'accepts-config-options'>
  ): void {
    let createdCount = 0;

    for (const options of scenarioCase.input.timing.options) {
      const timer = Timing.create(options);
      assert.ok(timer instanceof Timing);
      createdCount += 1;
    }
    assert.strictEqual(createdCount, scenarioCase.expected.createdCount);
    return;
  }
  static async 'async-onEvent-unhandled'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'async-onEvent-unhandled'>
  ): Promise<void> {
    class AsyncRejectingEventTiming extends Timing {
      static override create(
        options: Parameters<typeof TimingOptionsEntity.create>[0] = {}
      ): AsyncRejectingEventTiming {
        return new AsyncRejectingEventTiming(options);
      }
      protected override async onEvent(): Promise<void> {
        await Promise.resolve();
        throw RuntimeError.create(scenarioCase.input.errorMessage);
      }
    }
    const timer = AsyncRejectingEventTiming.create();
    let rejectionCount = 0;
    const onUnhandledRejection = (): void => {
      rejectionCount += 1;
    };
    process.on('unhandledRejection', onUnhandledRejection);
    const result = (async (): Promise<void> => {
      try {
        timer.event(TimingEvent.create(scenarioCase.input.event));
        for (let tick = 0; tick < scenarioCase.input.settleTicks; tick++) {
          await new Promise<void>((resolve) => {
            setImmediate(resolve);
          });
        }
        assert.strictEqual(rejectionCount, scenarioCase.expected.unhandledRejections);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    })();
    return await result;
  }
  static 'clear-all-and-reuse'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'clear-all-and-reuse'>
  ): void {
    const timer = Timing.create();
    TimingScenarioSupport.recordTimingEvents(timer, scenarioCase.input.beforeEvents);
    const beforeClear = timer.getEvents();
    assert.ok(
      TimingScenarioSupport.eventKeys(beforeClear).length >= scenarioCase.expected.beforeCount
    );
    for (let clearIndex = 0; clearIndex < scenarioCase.input.batch.clearCount; clearIndex++) {
      timer.clear();
    }
    const afterClear = timer.getEvents();
    assert.strictEqual(
      TimingScenarioSupport.eventKeys(afterClear).length,
      scenarioCase.expected.afterClearCount
    );
    TestClock.busyWait(scenarioCase.input.waitAfterClearMs);
    timer.event(TimingEvent.create(scenarioCase.input.afterEvent));
    const afterAdd = timer.getEvents();
    assert.strictEqual(
      TimingScenarioSupport.eventKeys(afterAdd).length,
      scenarioCase.expected.afterAddCount
    );
    TimingScenarioSupport.assertEventKeysPresent(afterAdd, [
      TimingEvent.create(scenarioCase.input.afterEvent).event
    ]);
    return;
  }
  static 'clear-keeps-start-time'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'clear-keeps-start-time'>
  ): void {
    const timer = Timing.create();
    TestClock.busyWait(scenarioCase.input.waitBeforeClearMs);
    const beforeClear = timer.getEvents();
    timer.clear();
    TestClock.busyWait(scenarioCase.input.waitAfterClearMs);
    const afterClear = timer.getEvents();
    assert.ok(beforeClear.get('durationMs') !== undefined);
    assert.ok(afterClear.get('durationMs') !== undefined);
    assert.strictEqual(
      (afterClear.get('durationMs') ?? 0) > (beforeClear.get('durationMs') ?? 0),
      scenarioCase.expected.durationIncreasesAfterClear
    );
    return;
  }
  static 'clear-multiple-times'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'clear-multiple-times'>
  ): void {
    const timer = Timing.create();
    timer.event(TimingEvent.create(scenarioCase.input.event));
    for (let clearIndex = 0; clearIndex < scenarioCase.input.batch.clearCount; clearIndex++) {
      timer.clear();
    }
    const events = timer.getEvents();
    assert.strictEqual(
      TimingScenarioSupport.eventKeys(events).length,
      scenarioCase.expected.finalCount
    );
    return;
  }
  static 'component-operation-events'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'component-operation-events'>
  ): void {
    const timer = Timing.create();
    TimingScenarioSupport.recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    TimingScenarioSupport.assertEventKeysPresent(events, scenarioCase.expected.keys);
    return;
  }
  static 'constructor-wraps-error'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'constructor-wraps-error'>
  ): void {
    const clock = Clock.create(new ThrowingClockProvider(scenarioCase.input.errorMessage));

    assert.throws(
      () => {
        Timing.create({ 'clock': clock });
      },
      (error) => {
        assert.ok(error instanceof ConfigurationError);
        assert.ok(error.cause instanceof Error);
        assert.equal(error.cause.message, scenarioCase.input.errorMessage);
        return true;
      }
    );
    assert.strictEqual(scenarioCase.expected.wrapped, true);
    return;
  }
  static 'continues-after-get-events'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'continues-after-get-events'>
  ): void {
    const timer = Timing.create();
    TestClock.busyWait(scenarioCase.input.waitBeforeFirstMs);
    const events1 = timer.getEvents();
    TestClock.busyWait(scenarioCase.input.waitBeforeSecondMs);
    const events2 = timer.getEvents();
    assert.ok(events1.get('durationMs') !== undefined);
    assert.ok(events2.get('durationMs') !== undefined);
    assert.strictEqual(
      (events2.get('durationMs') ?? 0) > (events1.get('durationMs') ?? 0),
      scenarioCase.expected.durationIncreases
    );
    return;
  }
  static 'convert-time'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'convert-time'>
  ): void {
    const traced = new TracedTiming({});
    let nanoseconds: bigint;
    try {
      nanoseconds = BigInt(scenarioCase.input.ns);
    } catch (cause) {
      throw RuntimeError.create(`Cannot convert ${scenarioCase.input.ns} to nanoseconds`, {
        'cause': cause
      });
    }
    const result = traced.testConvertTime(nanoseconds, scenarioCase.input.unit);

    assert.strictEqual(result, scenarioCase.expected.result);
    return;
  }
  static 'creates-instance'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'creates-instance'>
  ): void {
    const timer = Timing.create();
    assert.ok(timer instanceof Timing);
    assert.strictEqual(timer.constructor.name, scenarioCase.expected.instanceOf);
    assert.strictEqual(scenarioCase.input.expectMethods.length, scenarioCase.expected.methodCount);
    for (const methodName of scenarioCase.input.expectMethods) {
      assert.strictEqual(typeof timer[methodName], 'function');
    }
    return;
  }
  static 'cumulative-timing'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'cumulative-timing'>
  ): void {
    const timer = Timing.create();
    for (let index = 0; index < scenarioCase.input.events.length; index++) {
      const fixture = scenarioCase.input.events[index];
      if (fixture !== undefined) {
        TestClock.busyWait(scenarioCase.input.stageWaitMs[index] ?? 0);
        timer.event(TimingEvent.create(fixture));
      }
    }

    const events = timer.getEvents();
    TimingScenarioSupport.assertEventKeysPresent(events, scenarioCase.expected.keys);
    const minimumEntries = Object.entries(scenarioCase.expected.minimums);
    for (let index = 0; index < minimumEntries.length; index++) {
      const minimumEntry = minimumEntries[index];
      if (minimumEntry !== undefined) {
        const [key, minimum] = minimumEntry;
        assert.ok(events.get(key) !== undefined);
        assert.ok((events.get(key) ?? -1) >= minimum, `${key} should be at least ${minimum}`);
      }
    }

    return;
  }
  static 'domain-status'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'domain-status'>
  ): void {
    const timer = Timing.create();
    TimingScenarioSupport.recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    TimingScenarioSupport.assertEventKeysPresent(events, scenarioCase.expected.keys);
    return;
  }
  static 'evicts-default-max-events'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'evicts-default-max-events'>
  ): void {
    assert.ok(Number.isFinite(DEFAULT_MAXIMUM_EVENTS));
    assert.ok(DEFAULT_MAXIMUM_EVENTS <= 10_000);
    assert.strictEqual(DEFAULT_MAXIMUM_EVENTS, scenarioCase.expected.defaultMaxEvents);
    const timer = Timing.create();
    const totalEvents = DEFAULT_MAXIMUM_EVENTS + scenarioCase.input.overflowMargin;
    for (let i = 0; i < totalEvents; i++) {
      timer.event(
        TimingEvent.create({
          'component': scenarioCase.input.event.component,
          'operation': `${scenarioCase.input.event.operationPrefix}${i}`
        })
      );
    }
    const events = timer.getEvents();
    assert.ok(TimingScenarioSupport.eventKeys(events).length <= DEFAULT_MAXIMUM_EVENTS);
    assert.ok(events.get('initialize') === undefined, 'initialize should be evicted');
    assert.ok(
      events.get(
        `${scenarioCase.input.event.component}.${scenarioCase.input.event.operationPrefix}0`
      ) === undefined,
      'oldest events should be evicted'
    );
    assert.ok(
      events.get(
        `${scenarioCase.input.event.component}.${scenarioCase.input.event.operationPrefix}${scenarioCase.expected.retainedLastIndex}`
      ) !== undefined,
      'most recent event should remain'
    );
    assert.ok(
      `${scenarioCase.input.event.component}.${scenarioCase.input.event.operationPrefix}${scenarioCase.expected.retainedLastIndex}`.startsWith(
        scenarioCase.expected.retainedLastEventPrefix
      )
    );
    return;
  }
  static 'evicts-when-max-events-exceeded'(
    scenarioCase: ScenarioCaseOfType<
      TimingScenarioCaseEntity.Type,
      'evicts-when-max-events-exceeded'
    >
  ): void {
    const timer = Timing.create(scenarioCase.input.timing);
    TimingScenarioSupport.recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    assert.strictEqual(
      TimingScenarioSupport.eventKeys(events).length,
      scenarioCase.input.timing.maximumEvents
    );
    TimingScenarioSupport.assertEventKeysAbsent(events, scenarioCase.expected.evictedKeys);
    TimingScenarioSupport.assertEventKeysPresent(events, scenarioCase.expected.retainedKeys);
    return;
  }
  static 'high-resolution-timing'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'high-resolution-timing'>
  ): void {
    const timer = Timing.create();
    TestClock.busyWait(scenarioCase.input.busyWaitMs);
    timer.event(TimingEvent.create(scenarioCase.input.event));
    const events = timer.getEvents();
    const eventName = TimingEvent.create(scenarioCase.input.event).event;
    assert.ok(events.get(eventName) !== undefined);
    assert.ok(Number.isFinite(events.get(eventName)));
    assert.ok((events.get(eventName) ?? -1) >= scenarioCase.expected.minElapsedMs);
    return;
  }
  static 'hook-error-instance'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'hook-error-instance'>
  ): void {
    class ThrowingEventTiming extends Timing {
      static override create(
        options: Parameters<typeof TimingOptionsEntity.create>[0] = {}
      ): ThrowingEventTiming {
        return new ThrowingEventTiming(options);
      }
      protected override onEvent(): void {
        throw RuntimeError.create(scenarioCase.input.errorMessage);
      }
    }
    const timer = ThrowingEventTiming.create();
    let caught: unknown;
    try {
      timer.event(TimingEvent.create(scenarioCase.input.event));
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof HookInvocationError);
    assert.strictEqual(caught.constructor.name, scenarioCase.expected.instanceOf);
    return;
  }
  static 'immediate-operations'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'immediate-operations'>
  ): void {
    const timer = Timing.create();
    const events = timer.getEvents();
    assert.ok(events.get('durationMs') !== undefined);
    assert.ok(events.get('durationMs')! >= 0);
    timer.event(TimingEvent.create(scenarioCase.input.event));
    const events2 = timer.getEvents();
    const eventName = TimingEvent.create(scenarioCase.input.event).event;
    assert.ok(events2.get(eventName) !== undefined);
    assert.ok((events2.get(eventName) ?? -1) >= 0);
    return;
  }
  static 'includes-duration'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'includes-duration'>
  ): void {
    const timer = Timing.create();
    TestClock.busyWait(scenarioCase.input.busyWaitMs);
    timer.event(TimingEvent.create(scenarioCase.input.event));
    const events = timer.getEvents();
    assert.ok(events.get('durationMs') !== undefined);
    assert.ok(events.get('durationMs')! >= scenarioCase.expected.minDurationMs);
    return;
  }
  static 'includes-later-events'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'includes-later-events'>
  ): void {
    const timer = Timing.create();
    timer.event(TimingEvent.create(scenarioCase.input.firstEvent));
    const events1 = timer.getEvents();
    timer.event(TimingEvent.create(scenarioCase.input.secondEvent));
    const events2 = timer.getEvents();
    assert.ok(
      TimingScenarioSupport.eventKeys(events2).length >
        TimingScenarioSupport.eventKeys(events1).length
    );
    assert.ok(events2.get(scenarioCase.expected.newKey) !== undefined);
    return;
  }
  static 'increasing-elapsed-times'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'increasing-elapsed-times'>
  ): void {
    const timer = Timing.create();
    for (let index = 0; index < scenarioCase.input.events.length; index++) {
      const fixture = scenarioCase.input.events[index];
      if (fixture !== undefined) {
        TestClock.busyWait(scenarioCase.input.busyWaitMs[index] ?? 0);
        timer.event(TimingEvent.create(fixture));
      }
    }

    const events = timer.getEvents();
    TimingScenarioSupport.assertEventKeysPresent(events, scenarioCase.expected.keysInOrder);
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
  }
  static 'initial-only-initialize'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'initial-only-initialize'>
  ): void {
    const timer = Timing.create();
    const events = timer.getEvents();
    assert.strictEqual(typeof events.get('durationMs'), scenarioCase.expected.durationMsType);
    assert.ok(typeof events === 'object');
    assert.deepEqual(TimingScenarioSupport.eventKeys(events), scenarioCase.expected.eventKeys);
    assert.strictEqual(
      events.get('initialize') !== undefined,
      scenarioCase.input.observeInitialize
    );
    return;
  }
  static 'json-serializable'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'json-serializable'>
  ): void {
    const timer = Timing.create();
    timer.event(TimingEvent.create(scenarioCase.input.event));
    const events = timer.getEvents();
    let parsed: typeof events;
    try {
      parsed = structuredClone(events);
    } catch (cause) {
      throw RuntimeError.create('timing events cannot be cloned', { 'cause': cause });
    }
    const eventName = TimingEvent.create(scenarioCase.input.event).event;
    assert.ok(typeof parsed.get('durationMs') === 'number');
    assert.ok(typeof parsed.get(eventName) === 'number');
    assert.strictEqual(scenarioCase.expected.serializable, true);
    return;
  }
  static 'logbody-context'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'logbody-context'>
  ): void {
    const timer = Timing.create();
    TimingScenarioSupport.recordTimingEvents(timer, scenarioCase.input.events);
    const context = timer.getEvents();
    TimingScenarioSupport.assertEventKeysPresent(context, scenarioCase.expected.keys);
    if (scenarioCase.expected.allValuesAreNumbers) {
      const contextValues = [...context.values()];
      for (let index = 0; index < contextValues.length; index++) {
        const value = contextValues[index];
        if (value !== undefined) {
          assert.strictEqual(typeof value, 'number');
        }
      }
    }
    return;
  }
  static 'maintains-most-recent-events'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'maintains-most-recent-events'>
  ): void {
    for (let index = 0; index < scenarioCase.input.cases.length; index++) {
      const caseData = scenarioCase.input.cases[index];
      if (caseData !== undefined) {
        const timer = Timing.create(caseData.timing);
        for (let eventIndex = 0; eventIndex < caseData.eventNames.length; eventIndex++) {
          const eventName = caseData.eventNames[eventIndex];
          if (eventName !== undefined) {
            timer.event(TimingScenarioSupport.createTimingEventFromName(eventName));
          }
        }
        const events = timer.getEvents();
        assert.strictEqual(
          TimingScenarioSupport.eventKeys(events).length,
          caseData.timing.maximumEvents
        );
        const expectedEventNames = scenarioCase.expected.retainedSets[index] ?? [];
        TimingScenarioSupport.assertEventKeysPresent(events, expectedEventNames);
      }
    }
    return;
  }
  static 'maximumEvents-accessible'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'maximumEvents-accessible'>
  ): void {
    const traced = new TracedTiming(scenarioCase.input.timing);
    assert.strictEqual(traced.testMaximumEvents, scenarioCase.expected.maximumEvents);
    assert.strictEqual(typeof traced.testStartTime, scenarioCase.expected.startTimeType);
    return;
  }
  static 'maximumEvents-defaults'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'maximumEvents-defaults'>
  ): void {
    const traced = new TracedTiming({});
    assert.strictEqual(DEFAULT_MAXIMUM_EVENTS, scenarioCase.input.defaultMaxEvents);
    assert.strictEqual(traced.testMaximumEvents, scenarioCase.expected.maximumEvents);
    return;
  }
  static 'mixes-status-and-plain'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'mixes-status-and-plain'>
  ): void {
    const timer = Timing.create();
    TimingScenarioSupport.recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    TimingScenarioSupport.assertEventKeysPresent(events, scenarioCase.expected.keys);
    return;
  }
  static 'non-negative-values'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'non-negative-values'>
  ): void {
    const timer = Timing.create();
    TimingScenarioSupport.recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    for (const elapsed of events.values()) {
      assert.strictEqual(elapsed >= 0, scenarioCase.expected.allElapsedNonNegative);
    }
    return;
  }
  static 'onClear-hook-called'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'onClear-hook-called'>
  ): void {
    const traced = new TracedTiming({});
    assert.strictEqual(traced.clearCount, 0);
    for (let clearIndex = 0; clearIndex < scenarioCase.input.batch.clearCount; clearIndex++) {
      traced.clear();
    }
    assert.strictEqual(traced.clearCount, scenarioCase.expected.clearCount);
    return;
  }
  static 'onEvent-hook-called'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'onEvent-hook-called'>
  ): void {
    const traced = new TracedTiming({});
    assert.strictEqual(traced.eventCount, 0);
    traced.event(TimingEvent.create(scenarioCase.input.event));
    assert.strictEqual(traced.eventCount, scenarioCase.expected.eventCountDelta);
    assert.ok(traced.lastEventData !== undefined);
    assert.strictEqual(traced.lastEventData.event, scenarioCase.expected.lastEventData);
    return;
  }
  static 'onEvict-hook-called'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'onEvict-hook-called'>
  ): void {
    const traced = new TracedTiming(scenarioCase.input.timing);
    assert.strictEqual(traced.evictCount, 0);
    TimingScenarioSupport.recordTimingEvents(traced, scenarioCase.input.events);
    assert.ok(
      traced.evictCount >= scenarioCase.expected.evictCountAtLeast,
      'onEvict should be called when cache overflows'
    );
    return;
  }
  static 'onGetEvents-hook-fires'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'onGetEvents-hook-fires'>
  ): void {
    const traced = new TracedTiming({});
    traced.getEvents();
    assert.strictEqual(traced.getEventsCount, 1);
    assert.strictEqual(traced.lastGetEventsEventCount, scenarioCase.expected.lastEventCounts[0]);
    TimingScenarioSupport.recordTimingEvents(traced, scenarioCase.input.events);
    traced.getEvents();
    assert.strictEqual(traced.getEventsCount, scenarioCase.expected.getEventsCount);
    assert.strictEqual(traced.lastGetEventsEventCount, scenarioCase.expected.lastEventCounts[1]);
    return;
  }
  static 'onInitialize-hook-fires'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'onInitialize-hook-fires'>
  ): void {
    assert.strictEqual(scenarioCase.input.construct, true);
    const traced = new TracedTiming({});
    assert.strictEqual(traced.initCount, scenarioCase.expected.initCount);
    assert.strictEqual(typeof traced.lastInitStartTime, scenarioCase.expected.startTimeType);
    return;
  }
  static 'optional-status'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'optional-status'>
  ): void {
    const timer = Timing.create();
    TimingScenarioSupport.recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    TimingScenarioSupport.assertEventKeysPresent(events, scenarioCase.expected.keys);
    return;
  }
  static 'read-hrtime-called'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'read-hrtime-called'>
  ): void {
    const counter = VirtualTimeCounter.create({ 'startMs': 0 });
    const provider = new CountingClockProvider(counter);
    const timer = Timing.create({ 'clock': Clock.create(provider) });
    const countBefore = provider.hrtimeCallCount;
    timer.event(TimingEvent.create(scenarioCase.input.event));
    assert.ok(
      provider.hrtimeCallCount >= countBefore + scenarioCase.expected.readCountDelta,
      'Clock provider hrtime should be called during event()'
    );
    return;
  }
  static 'returns-new-object'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'returns-new-object'>
  ): void {
    const timer = Timing.create();
    timer.event(TimingEvent.create(scenarioCase.input.event));
    const events1 = timer.getEvents();
    const events2 = timer.getEvents();
    assert.strictEqual(Object.is(events1, events2), scenarioCase.expected.sameReference);
    return;
  }
  static 'same-name-events'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'same-name-events'>
  ): void {
    const timer = Timing.create();
    timer.event(TimingEvent.create(scenarioCase.input.event));
    TestClock.busyWait(scenarioCase.input.busyWaitMs);
    timer.event(TimingEvent.create(scenarioCase.input.event));
    const events = timer.getEvents();
    TimingScenarioSupport.assertEventKeysPresent(events, scenarioCase.expected.keys);
    const expectedKeys = new Set(scenarioCase.expected.keys);
    const matchingKeys = TimingScenarioSupport.eventKeys(events).filter((key) => {
      const isExpectedKey = expectedKeys.has(key);
      return isExpectedKey;
    });
    assert.strictEqual(matchingKeys.length, scenarioCase.expected.uniqueCount);
    return;
  }
  static 'starts-immediately'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'starts-immediately'>
  ): void {
    const timer = Timing.create();
    TestClock.busyWait(scenarioCase.input.busyWaitMs);
    const events = timer.getEvents();
    assert.ok(events.get('durationMs') !== undefined);
    assert.ok(
      events.get('durationMs')! >= scenarioCase.expected.minDurationMs,
      `Expected durationMs >= ${scenarioCase.expected.minDurationMs}ms, got ${events.get('durationMs')}ms`
    );
    assert.strictEqual(events.get('initialize') !== undefined, scenarioCase.expected.hasInitialize);
    return;
  }
  static 'throwing-onClear'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'throwing-onClear'>
  ): void {
    class ThrowingClearTiming extends Timing {
      static override create(
        options: Parameters<typeof TimingOptionsEntity.create>[0] = {}
      ): ThrowingClearTiming {
        return new ThrowingClearTiming(options);
      }
      protected override onClear(): void {
        throw RuntimeError.create(scenarioCase.input.errorMessage);
      }
    }
    const timer = ThrowingClearTiming.create();
    timer.event(TimingEvent.create(scenarioCase.input.event));
    assert.throws(
      () => {
        timer.clear();
      },
      { 'name': scenarioCase.expected.errorName }
    );
    return;
  }
  static 'throwing-onEvent'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'throwing-onEvent'>
  ): void {
    class ThrowingEventTiming extends Timing {
      static override create(
        options: Parameters<typeof TimingOptionsEntity.create>[0] = {}
      ): ThrowingEventTiming {
        return new ThrowingEventTiming(options);
      }
      protected override onEvent(): void {
        throw RuntimeError.create(scenarioCase.input.errorMessage);
      }
    }
    const timer = ThrowingEventTiming.create();
    assert.throws(
      () => {
        timer.event(TimingEvent.create(scenarioCase.input.event));
      },
      { 'name': scenarioCase.expected.errorName }
    );
    return;
  }
  static 'throwing-onEvict'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'throwing-onEvict'>
  ): void {
    const input = scenarioCase.input;
    class ThrowingEvictTiming extends Timing {
      static override create(
        options: Parameters<typeof TimingOptionsEntity.create>[0] = {}
      ): ThrowingEvictTiming {
        return new ThrowingEvictTiming(options);
      }
      protected override onEvict(): void {
        throw RuntimeError.create(input.errorMessage);
      }
    }
    const timer = ThrowingEvictTiming.create(input.timing);
    assert.throws(
      () => {
        timer.event(TimingEvent.create(input.event));
      },
      { 'name': scenarioCase.expected.errorName }
    );
    return;
  }
  static 'throwing-onGetEvents'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'throwing-onGetEvents'>
  ): void {
    class ThrowingGetEventsTiming extends Timing {
      static override create(
        options: Parameters<typeof TimingOptionsEntity.create>[0] = {}
      ): ThrowingGetEventsTiming {
        return new ThrowingGetEventsTiming(options);
      }
      protected override onGetEvents(): void {
        throw RuntimeError.create(scenarioCase.input.errorMessage);
      }
    }
    const timer = ThrowingGetEventsTiming.create();
    assert.throws(
      () => {
        timer.getEvents();
      },
      { 'name': scenarioCase.expected.errorName }
    );
    return;
  }
  static 'throwing-onInitialize'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'throwing-onInitialize'>
  ): void {
    class ThrowingInitializeTiming extends Timing {
      static override create(
        options: Parameters<typeof TimingOptionsEntity.create>[0] = {}
      ): ThrowingInitializeTiming {
        return new ThrowingInitializeTiming(options);
      }
      protected override onInitialize(): void {
        throw RuntimeError.create(scenarioCase.input.errorMessage);
      }
    }
    assert.throws(
      () => {
        ThrowingInitializeTiming.create();
      },
      { 'name': scenarioCase.expected.errorName }
    );
    return;
  }
  static 'timing-status-constants'(
    scenarioCase: ScenarioCaseOfType<TimingScenarioCaseEntity.Type, 'timing-status-constants'>
  ): void {
    const timer = Timing.create();
    TimingScenarioSupport.recordTimingEvents(timer, scenarioCase.input.events);
    const events = timer.getEvents();
    TimingScenarioSupport.assertEventKeysPresent(events, scenarioCase.expected.keys);
    return;
  }
}
ScenarioSuite.register({
  'entity': TimingScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Timing',
  'runners': TimingRunners
});

void describe('Timing injected Clock', () => {
  void it('records deterministic elapsed values and insertion order from a virtual provider', () => {
    const counter = VirtualTimeCounter.create({ 'startMs': 100 });
    const clock = Clock.create(VirtualClockProvider.create(counter));
    const timing = Timing.create({ 'clock': clock });

    counter.advance(25);
    timing.event(TimingEvent.create({ 'component': 'cache', 'operation': 'read' }));
    counter.advance(5);
    timing.event(TimingEvent.create({ 'component': 'cache', 'operation': 'write' }));

    assert.deepEqual(
      [...timing.getEvents()],
      [
        ['initialize', 0],
        ['cache.read', 25],
        ['cache.write', 30],
        ['durationMs', 30]
      ]
    );
  });
});
