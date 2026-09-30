import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';
import type { Mock } from 'node:test';

import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import timersPromises from 'node:timers/promises';

import type { ClockProviderInterface } from '../../src/interfaces/ClockProviderInterface.js';
import type { RealTimeClockProviderOptionsFixtureEntity } from './entities/RealTimeClockProviderOptionsFixtureEntity.js';
import type { RuntimeNumberEntity } from './entities/RuntimeNumberEntity.js';
import type { VirtualTimeCounterOptionsFixtureEntity } from './entities/VirtualTimeCounterOptionsFixtureEntity.js';

import { Clock } from '../../src/clock/Clock.js';
import { ClockProviderEntity } from '../../src/clock/ClockProviderEntity.js';
import { RealTimeClockProvider } from '../../src/clock/RealTimeClockProvider.js';
import { VirtualClockProvider } from '../../src/clock/VirtualClockProvider.js';
import { VirtualTimeCounter } from '../../src/clock/VirtualTimeCounter.js';
import { VirtualTimeCounterEntity } from '../../src/clock/VirtualTimeCounterEntity.js';
import { RealTimeClockProviderOptionsEntity } from '../../src/entities/RealTimeClockProviderOptionsEntity.js';
import { VirtualTimeCounterOptionsEntity } from '../../src/entities/VirtualTimeCounterOptionsEntity.js';
import { ClockError } from '../../src/errors/ClockError.js';
import scenarioGroups from './Clock.scenarios.json' with { 'type': 'json' };
import { ClockScenarioCaseEntity } from './entities/ClockScenarioCaseEntity.js';

/** Nanosecond conversion constants used by the scenarios. */
class ClockUnits {
  public static readonly nanosecondsPerMillisecond = 1_000_000n;
  public static readonly zeroNanoseconds = 0n;
}

/** Raised when a scenario value cannot be converted to a bigint. */
class ClockScenarioError extends BaseError {
  public override readonly name: string = 'ClockScenarioError';

  public constructor(message: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'clock.scenarioValueInvalid',
      'message': message,
      'retryable': false
    });
  }
}

class ScenarioBigInt {
  public static from(value: number | string): bigint {
    try {
      const converted = BigInt(value);
      return converted;
    } catch (error) {
      throw new ClockScenarioError(`Scenario value ${String(value)} is not a bigint`, error);
    }
  }
}

/** Replaces `Date.now` and `performance.now` with a fixed raw time until restored. */
class RealTimeMock {
  readonly #dateNowMock: Mock<() => number>;
  readonly #performanceNowMock: Mock<() => number>;

  public constructor(rawTime: number) {
    this.#dateNowMock = mock.method(Date, 'now', () => { return rawTime; });
    this.#performanceNowMock = mock.method(performance, 'now', () => { return rawTime; });
  }

  public restore(): void {
    this.#dateNowMock.mock.restore();
    this.#performanceNowMock.mock.restore();
  }
}

/** Turns serialized scenario fixtures into clock, provider, and counter instances. */
class ClockOptionsFactory {
  public static createRealProvider(input: RealTimeClockProviderOptionsFixtureEntity.Type): RealTimeClockProvider {
    const provider = RealTimeClockProvider.create(ClockOptionsFactory.materializeRealOptions(input));
    return provider;
  }

  public static createVirtualClock(input: VirtualTimeCounterOptionsFixtureEntity.Type): Clock {
    const clock = Clock.create(ClockOptionsFactory.createVirtualProvider(input));
    return clock;
  }

  public static createVirtualCounter(input: VirtualTimeCounterOptionsFixtureEntity.Type): VirtualTimeCounter {
    const counter = VirtualTimeCounter.create(ClockOptionsFactory.materializeCounterOptions(input));
    return counter;
  }

  public static createVirtualProvider(input: VirtualTimeCounterOptionsFixtureEntity.Type): VirtualClockProvider {
    const provider = VirtualClockProvider.create(ClockOptionsFactory.createVirtualCounter(input));
    return provider;
  }

  public static materializeCounterOptions(input: VirtualTimeCounterOptionsFixtureEntity.Type): VirtualTimeCounterOptionsEntity.InputType | undefined {
    if (input.shape === 'options') {
      const startMs = input.value?.startMs;
      const options = startMs === undefined ? {} : { 'startMs': ClockOptionsFactory.materializeNumber(startMs) };
      return options;
    }
    return undefined;
  }

  public static materializeNumber(input: RuntimeNumberEntity.Type): number {
    if (typeof input === 'number') {
      return input;
    }
    if (input.shape === 'infinity') {
      return Number.POSITIVE_INFINITY;
    }
    if (input.shape === 'nan') {
      return Number.NaN;
    }
    return Number.NEGATIVE_INFINITY;
  }

  public static materializeRealOptions(input: RealTimeClockProviderOptionsFixtureEntity.Type): RealTimeClockProviderOptionsEntity.InputType | undefined {
    if (input.shape === 'options') {
      const offsetMs = input.value?.offsetMs;
      const options = offsetMs === undefined ? {} : { 'offsetMs': ClockOptionsFactory.materializeNumber(offsetMs) };
      return options;
    }
    return undefined;
  }

  public static readCounterStartMs(input: VirtualTimeCounterOptionsFixtureEntity.Type): number {
    const startMs = ClockOptionsFactory.materializeCounterOptions(input)?.startMs ?? 0;
    return startMs;
  }

  public static toNumbers(values: readonly bigint[]): number[] {
    const numbers: number[] = [];
    for (let index = 0; index < values.length; index += 1) {
      numbers.push(Number(values[index]));
    }
    return numbers;
  }
}

class MeteredClockProvider implements ClockProviderInterface {
  readonly #counter: VirtualTimeCounter;
  #hrtimeCallCount: number;
  #nowCallCount: number;

  public constructor(counter: VirtualTimeCounter) {
    this.#counter = counter;
    this.#hrtimeCallCount = 0;
    this.#nowCallCount = 0;
  }

  public get hrtimeCallCount(): number {
    return this.#hrtimeCallCount;
  }

  public hrtime(): bigint {
    this.#hrtimeCallCount += 1;
    const result = ScenarioBigInt.from(this.#counter.nowMs()) * ClockUnits.nanosecondsPerMillisecond;
    return result;
  }

  public get nowCallCount(): number {
    return this.#nowCallCount;
  }

  public now(): number {
    this.#nowCallCount += 1;
    const result = this.#counter.nowMs();
    return result;
  }
}

/** Reports the first `now()` from one counter and every later `now()` from a lower counter. */
class BackwardsClockProvider implements ClockProviderInterface {
  readonly #counter: VirtualTimeCounter;
  readonly #lowerCounter: VirtualTimeCounter;
  #readCount = 0;

  public constructor(counter: VirtualTimeCounter, lowerCounter: VirtualTimeCounter) {
    this.#counter = counter;
    this.#lowerCounter = lowerCounter;
  }

  public hrtime(): bigint {
    const result = ScenarioBigInt.from(this.#counter.nowMs()) * ClockUnits.nanosecondsPerMillisecond;
    return result;
  }

  public now(): number {
    this.#readCount += 1;
    const result = this.#readCount === 1 ? this.#counter.nowMs() : this.#lowerCounter.nowMs();
    return result;
  }
}

class HookedClock extends Clock {
  readonly hrtimeEvents: bigint[] = [];
  readonly nowEvents: number[] = [];

  public static override create(provider: ClockProviderInterface): HookedClock {
    const clock = new HookedClock(provider);
    return clock;
  }

  protected override onHrtime(value: bigint): void {
    this.hrtimeEvents.push(value);
  }

  protected override onNow(timestamp: number): void {
    this.nowEvents.push(timestamp);
  }
}

class HookedCounter extends VirtualTimeCounter {
  readonly advanceEvents: { 'deltaMs': number; 'nowMs': number }[] = [];
  readonly nowMsEvents: number[] = [];

  public constructor(options: VirtualTimeCounterOptionsEntity.InputType = {}) {
    super(VirtualTimeCounterOptionsEntity.intake(options));
  }

  public advancedNowValues(): number[] {
    const values: number[] = [];
    for (let index = 0; index < this.advanceEvents.length; index += 1) {
      values.push(this.advanceEvents[index]?.nowMs ?? Number.NaN);
    }
    return values;
  }

  protected override onAdvance(deltaMs: number, nowMs: number): void {
    this.advanceEvents.push({ 'deltaMs': deltaMs, 'nowMs': nowMs });
  }

  protected override onNowMs(value: number): void {
    this.nowMsEvents.push(value);
  }
}

class HookedRealProvider extends RealTimeClockProvider {
  readonly hrtimeEvents: bigint[] = [];
  readonly nowEvents: number[] = [];

  public constructor(options: RealTimeClockProviderOptionsEntity.InputType = {}) {
    super(RealTimeClockProviderOptionsEntity.intake(options));
  }

  protected override onHrtime(value: bigint): void {
    this.hrtimeEvents.push(value);
  }

  protected override onNow(timestamp: number): void {
    this.nowEvents.push(timestamp);
  }
}

class HookedVirtualProvider extends VirtualClockProvider {
  readonly hrtimeEvents: bigint[] = [];
  readonly nowEvents: number[] = [];

  public constructor(counter: Readonly<VirtualTimeCounter>) {
    super(counter);
  }

  protected override onHrtime(value: bigint): void {
    this.hrtimeEvents.push(value);
  }

  protected override onNow(timestamp: number): void {
    this.nowEvents.push(timestamp);
  }
}

class OffsetRealTimeClockProvider extends RealTimeClockProvider {
  public constructor(options: RealTimeClockProviderOptionsEntity.InputType = {}) {
    super(RealTimeClockProviderOptionsEntity.intake(options));
  }

  // Exposes the protected `offsetMs` getter so the subclass-access claim in
  // this scenario's description is actually exercised.
  public get exposedOffsetMs(): number {
    return this.offsetMs;
  }
}

class ThrowingNowClock extends Clock {
  public constructor(provider: ClockProviderInterface) {
    super(provider);
  }

  protected override onNow(): void {
    throw RuntimeError.create('onNow boom');
  }
}

class ThrowingHrtimeClock extends Clock {
  public constructor(provider: ClockProviderInterface) {
    super(provider);
  }

  protected override onHrtime(): void {
    throw RuntimeError.create('onHrtime boom');
  }
}

class ThrowingAdvanceCounter extends VirtualTimeCounter {
  public constructor(options: VirtualTimeCounterOptionsEntity.InputType = {}) {
    super(VirtualTimeCounterOptionsEntity.intake(options));
  }

  protected override onAdvance(): void {
    throw RuntimeError.create('onAdvance boom');
  }
}

class ThrowingNowMsCounter extends VirtualTimeCounter {
  public constructor(options: VirtualTimeCounterOptionsEntity.InputType = {}) {
    super(VirtualTimeCounterOptionsEntity.intake(options));
  }

  protected override onNowMs(): void {
    throw RuntimeError.create('onNowMs boom');
  }
}

class ThrowingRealHrtimeProvider extends RealTimeClockProvider {
  public constructor(options: RealTimeClockProviderOptionsEntity.InputType = {}) {
    super(RealTimeClockProviderOptionsEntity.intake(options));
  }

  protected override onHrtime(): void {
    throw RuntimeError.create('provider onHrtime boom');
  }
}

class ThrowingRealNowProvider extends RealTimeClockProvider {
  public constructor(options: RealTimeClockProviderOptionsEntity.InputType = {}) {
    super(RealTimeClockProviderOptionsEntity.intake(options));
  }

  protected override onNow(): void {
    throw RuntimeError.create('provider onNow boom');
  }
}

class ThrowingVirtualHrtimeProvider extends VirtualClockProvider {
  public constructor(counter: Readonly<VirtualTimeCounter>) {
    super(counter);
  }

  protected override onHrtime(): void {
    throw RuntimeError.create('virtual provider onHrtime boom');
  }
}

class ThrowingVirtualNowProvider extends VirtualClockProvider {
  public constructor(counter: Readonly<VirtualTimeCounter>) {
    super(counter);
  }

  protected override onNow(): void {
    throw RuntimeError.create('virtual provider onNow boom');
  }
}

class ClockRunners {
  static 'clamp-backwards-provider-values'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'clamp-backwards-provider-values'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const lowerCounter = ClockOptionsFactory.createVirtualCounter(input.lowerCounterOptions);
    const provider = new BackwardsClockProvider(counter, lowerCounter);
    const clock = Clock.create(provider);
    const first = clock.now();
    const second = clock.now();
    assert.ok(first >= 0);
    assert.ok(lowerCounter.nowMs() >= 0);
    const clamped = second === first && second > lowerCounter.nowMs();
    assert.equal(clamped, expected.clamped);
  }

  static async 'clock-async-on-now-rejection-contained'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'clock-async-on-now-rejection-contained'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const clock = HookedClock.create(VirtualClockProvider.create(counter));
    Object.defineProperty(clock, 'onNow', {
      'value': (): Promise<void> => {
        const rejection = Promise.resolve().then((): void => {
          throw RuntimeError.create(input.message);
        });
        return rejection;
      }
    });
    let rejectionEvents = 0;
    const onUnhandledRejection = (): void => {
      rejectionEvents += 1;
    };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const result = clock.now();
      assert.strictEqual(result, expected.result);
      await timersPromises.setImmediate();
      await timersPromises.setImmediate();
      assert.strictEqual(rejectionEvents, expected.unhandledRejections);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static 'clock-error-with-cause'(_scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'clock-error-with-cause'>): void {
    const cause = RuntimeError.create('boom');
    const error = new ClockError('clock failed', cause);
    assert.strictEqual(error.message, 'clock failed');
    assert.strictEqual(error.cause, cause);
  }

  static 'clock-invalid-provider'(_scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'clock-invalid-provider'>): void {
    assert.strictEqual(ClockProviderEntity.validate({}), false);
  }

  static 'clock-throws-on-hrtime'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'clock-throws-on-hrtime'>): void {
    const counter = ClockOptionsFactory.createVirtualCounter(scenarioCase.input.counterOptions);
    const clock = new ThrowingHrtimeClock(VirtualClockProvider.create(counter));
    ClockRunners.assertHookFailure(() => { clock.hrtime(); }, 'onHrtime', scenarioCase.expected.hookError);
  }

  static 'clock-throws-on-now'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'clock-throws-on-now'>): void {
    const counter = ClockOptionsFactory.createVirtualCounter(scenarioCase.input.counterOptions);
    const clock = new ThrowingNowClock(VirtualClockProvider.create(counter));
    ClockRunners.assertHookFailure(() => { clock.now(); }, 'onNow', scenarioCase.expected.hookError);
  }

  static 'counter-invalid-options'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'counter-invalid-options'>): void {
    const { expected, input } = scenarioCase;
    assert.throws(() => {
      VirtualTimeCounter.create(ClockOptionsFactory.materializeCounterOptions(input.counterOptions));
    }, { 'message': expected.message });
  }

  static 'counter-on-advance'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'counter-on-advance'>): void {
    const { expected, input } = scenarioCase;
    const counter = new HookedCounter(ClockOptionsFactory.materializeCounterOptions(input.counterOptions));
    counter.advance(input.advanceMs);
    assert.strictEqual(counter.advanceEvents.length, 1);
    assert.strictEqual(counter.advanceEvents[0]?.deltaMs, expected.hookCalls[0]);
    assert.strictEqual(counter.advanceEvents[0]?.nowMs, expected.hookCalls[1]);
  }

  static 'counter-on-advance-sequence'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'counter-on-advance-sequence'>): void {
    const { expected, input } = scenarioCase;
    const counter = new HookedCounter(ClockOptionsFactory.materializeCounterOptions(input.counterOptions));
    for (let index = 0; index < input.advances.length; index += 1) {
      counter.advance(input.advances[index] ?? Number.NaN);
    }
    assert.deepStrictEqual(counter.advancedNowValues(), expected.hookCalls);
  }

  static 'counter-on-advance-suppressed'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'counter-on-advance-suppressed'>): void {
    const { expected, input } = scenarioCase;
    const counter = new HookedCounter(ClockOptionsFactory.materializeCounterOptions(input.counterOptions));
    for (let index = 0; index < input.advances.length; index += 1) {
      counter.advance(input.advances[index] ?? Number.NaN);
    }
    assert.strictEqual(counter.advanceEvents.length, expected.hookCalls.length);
  }

  static 'counter-on-now-ms'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'counter-on-now-ms'>): void {
    const { expected, input } = scenarioCase;
    const counter = new HookedCounter(ClockOptionsFactory.materializeCounterOptions(input.counterOptions));
    const result = counter.nowMs();
    assert.strictEqual(counter.nowMsEvents.length, 1);
    assert.strictEqual(counter.nowMsEvents[0], result);
    assert.deepStrictEqual(counter.nowMsEvents, expected.values);
  }

  static 'counter-on-now-ms-repeat'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'counter-on-now-ms-repeat'>): void {
    const { expected, input } = scenarioCase;
    const counter = new HookedCounter(ClockOptionsFactory.materializeCounterOptions(input.counterOptions));
    counter.nowMs();
    counter.advance(input.advanceMs);
    counter.nowMs();
    assert.strictEqual(counter.nowMsEvents.length, 2);
    assert.deepStrictEqual(counter.nowMsEvents, expected.values);
  }

  static 'counter-throws-on-advance'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'counter-throws-on-advance'>): void {
    const { expected, input } = scenarioCase;
    const counter = new ThrowingAdvanceCounter(ClockOptionsFactory.materializeCounterOptions(input.counterOptions));
    ClockRunners.assertHookFailure(() => { counter.advance(input.advanceMs); }, 'onAdvance', expected.hookError);
  }

  static 'counter-throws-on-now-ms'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'counter-throws-on-now-ms'>): void {
    const { expected, input } = scenarioCase;
    const counter = new ThrowingNowMsCounter(ClockOptionsFactory.materializeCounterOptions(input.counterOptions));
    ClockRunners.assertHookFailure(() => { counter.nowMs(); }, 'onNowMs', expected.hookError);
  }

  static 'hooked-clock-on-hrtime'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'hooked-clock-on-hrtime'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const clock = HookedClock.create(VirtualClockProvider.create(counter));
    const result = clock.hrtime();
    assert.deepStrictEqual(ClockOptionsFactory.toNumbers(clock.hrtimeEvents), expected.hrtimeEvents);
    assert.strictEqual(result, ScenarioBigInt.from(expected.result));
  }

  static 'hooked-clock-on-hrtime-repeat'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'hooked-clock-on-hrtime-repeat'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const clock = HookedClock.create(VirtualClockProvider.create(counter));
    clock.hrtime();
    counter.advance(input.advanceMs);
    clock.hrtime();
    assert.deepStrictEqual(ClockOptionsFactory.toNumbers(clock.hrtimeEvents), expected.hrtimeEvents);
  }

  static 'hooked-clock-on-now'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'hooked-clock-on-now'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const clock = HookedClock.create(VirtualClockProvider.create(counter));
    const result = clock.now();
    assert.deepStrictEqual(clock.nowEvents, expected.nowEvents);
    assert.strictEqual(result, expected.result);
  }

  static 'hooked-clock-on-now-advanced'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'hooked-clock-on-now-advanced'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const clock = HookedClock.create(VirtualClockProvider.create(counter));
    clock.now();
    counter.advance(input.advanceMs);
    clock.now();
    assert.deepStrictEqual(clock.nowEvents, expected.nowEvents);
  }

  static 'hooked-clock-on-now-clamped'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'hooked-clock-on-now-clamped'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const clock = HookedClock.create(VirtualClockProvider.create(counter));
    clock.now();
    clock.now();
    assert.deepStrictEqual(clock.nowEvents, expected.nowEvents);
  }

  static 'hrtime-monotonic-same-instance'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'hrtime-monotonic-same-instance'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    const first = clock.hrtime();
    counter.advance(input.advanceMs);
    const second = clock.hrtime();
    assert.equal(first <= second, expected.monotonic);
  }

  static 'hrtime-returns'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'hrtime-returns'>): void {
    const { expected, input } = scenarioCase;
    const clock = ClockOptionsFactory.createVirtualClock(input.counterOptions);
    assert.strictEqual(clock.hrtime(), ScenarioBigInt.from(expected.ns));
  }

  static 'long-uptime-precision'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'long-uptime-precision'>): void {
    const { expected, input } = scenarioCase;
    // Derive the expected nanosecond value independently of the production
    // trunc/multiply/round split used by RealTimeClockProvider.hrtime(): format
    // the raw ms value as a fixed-point decimal string with microsecond
    // precision and read the whole/fractional parts straight out of the text,
    // so a bug in the source's float-splitting formula cannot reproduce
    // identically here.
    const [wholeMsText, fractionalNsText] = input.rawMs.toFixed(6).split('.');
    assert.ok(wholeMsText !== undefined && fractionalNsText !== undefined);
    const expectedNs = ScenarioBigInt.from(wholeMsText) * ClockUnits.nanosecondsPerMillisecond + ScenarioBigInt.from(fractionalNsText);
    const lossyNs = ScenarioBigInt.from(Math.round(input.rawMs * Number(ClockUnits.nanosecondsPerMillisecond)));
    const realTimeMock = new RealTimeMock(input.rawMs);
    try {
      const provider = RealTimeClockProvider.create(ClockOptionsFactory.materializeRealOptions(input.realProviderOptions));
      const result = provider.hrtime();
      const precise = result === expectedNs && result !== lossyNs;
      assert.equal(precise, expected.precise);
    } finally {
      realTimeMock.restore();
    }
  }

  static 'metered-clock-hrtime'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'metered-clock-hrtime'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const provider = new MeteredClockProvider(counter);
    const clock = Clock.create(provider);
    assert.strictEqual(clock.hrtime(), ScenarioBigInt.from(expected.hrtime));
    counter.advance(input.advanceMs);
    clock.hrtime();
    assert.ok(provider.hrtimeCallCount > 0);
    assert.strictEqual(provider.hrtimeCallCount, 2);
  }

  static 'metered-clock-now'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'metered-clock-now'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const provider = new MeteredClockProvider(counter);
    const clock = Clock.create(provider);
    const first = clock.now();
    assert.strictEqual(first, expected.now);
    counter.advance(input.advanceMs);
    const second = clock.now();
    assert.ok(provider.nowCallCount > 0);
    assert.strictEqual(provider.nowCallCount, 2);
    assert.ok(first <= second);
  }

  static 'now-monotonic-same-instance'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'now-monotonic-same-instance'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    const first = clock.now();
    counter.advance(input.advanceMs);
    const second = clock.now();
    counter.advance(0);
    const third = clock.now();
    assert.equal(first <= second && second <= third, expected.monotonic);
  }

  static 'now-returns'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'now-returns'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    counter.advance(input.advanceMs);
    assert.strictEqual(clock.now(), expected.now);
  }

  static 'offset-invalid'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'offset-invalid'>): void {
    const { expected, input } = scenarioCase;
    assert.throws(() => {
      RealTimeClockProvider.create(ClockOptionsFactory.materializeRealOptions(input.realProviderOptions));
    }, { 'message': expected.message });
  }

  static 'offset-provider-now'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'offset-provider-now'>): void {
    const { expected, input } = scenarioCase;
    const realTimeMock = new RealTimeMock(input.rawMs);
    try {
      const provider = RealTimeClockProvider.create(ClockOptionsFactory.materializeRealOptions(input.realProviderOptions));
      assert.strictEqual(provider.now(), expected.now);
    } finally {
      realTimeMock.restore();
    }
  }

  static 'offset-provider-offset'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'offset-provider-offset'>): void {
    const { expected, input } = scenarioCase;
    const realTimeMock = new RealTimeMock(input.rawMs);
    try {
      const provider = new OffsetRealTimeClockProvider(ClockOptionsFactory.materializeRealOptions(input.realProviderOptions));
      const expectedOffsetMs = ClockOptionsFactory.materializeRealOptions(input.realProviderOptions)?.offsetMs ?? 0;
      assert.strictEqual(provider.exposedOffsetMs, expectedOffsetMs);
      assert.strictEqual(provider.now(), expected.now);
    } finally {
      realTimeMock.restore();
    }
  }

  static 'real-hrtime-positive'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'real-hrtime-positive'>): void {
    const { expected, input } = scenarioCase;
    const offsetMs = ClockOptionsFactory.materializeRealOptions(input.realProviderOptions)?.offsetMs ?? 0;
    // Compare against a zero-offset baseline provider read at roughly the same
    // instant so the assertion proves the offset is actually reflected in the
    // returned nanoseconds (not just that the result happens to be positive,
    // which a wrong offset or unit-scaling bug would still satisfy).
    const baseline = RealTimeClockProvider.create();
    const provider = ClockOptionsFactory.createRealProvider(input.realProviderOptions);
    const baselineNs = baseline.hrtime();
    const offsetNs = provider.hrtime();
    assert.strictEqual(offsetNs > ClockUnits.zeroNanoseconds, expected.positive);
    const deltaNs = offsetNs - baselineNs;
    const expectedDeltaNs = ScenarioBigInt.from(offsetMs) * ClockUnits.nanosecondsPerMillisecond;
    const toleranceNs = 50n * ClockUnits.nanosecondsPerMillisecond;
    assert.ok(
      deltaNs >= expectedDeltaNs - toleranceNs && deltaNs <= expectedDeltaNs + toleranceNs,
      `expected hrtime delta ${deltaNs} to be within tolerance of ${expectedDeltaNs}`
    );
  }

  static 'real-now-within-range'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'real-now-within-range'>): void {
    const { expected, input } = scenarioCase;
    const before = Date.now();
    const clock = Clock.create(ClockOptionsFactory.createRealProvider(input.realProviderOptions));
    const value = clock.now();
    const after = Date.now();
    const toleranceMs = 5;
    assert.strictEqual(value >= before - toleranceMs && value <= after + toleranceMs, expected.withinTolerance);
  }

  static 'real-provider-default-options'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'real-provider-default-options'>): void {
    const before = Date.now();
    const provider = ClockOptionsFactory.createRealProvider(scenarioCase.input.realProviderOptions);
    const value = provider.now();
    const after = Date.now();
    assert.strictEqual(value >= before - 10, true);
    assert.strictEqual(value <= after + 10, true);
  }

  static 'real-provider-invalid-options'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'real-provider-invalid-options'>): void {
    const { expected, input } = scenarioCase;
    assert.throws(() => {
      RealTimeClockProvider.create(ClockOptionsFactory.materializeRealOptions(input.realProviderOptions));
    }, { 'message': expected.message });
  }

  static 'real-provider-on-hrtime'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'real-provider-on-hrtime'>): void {
    const { expected, input } = scenarioCase;
    const realTimeMock = new RealTimeMock(input.rawMs);
    try {
      const provider = new HookedRealProvider(ClockOptionsFactory.materializeRealOptions(input.realProviderOptions));
      const result = provider.hrtime();
      assert.deepStrictEqual(ClockOptionsFactory.toNumbers(provider.hrtimeEvents), expected.hrtimeEvents);
      assert.strictEqual(result, ScenarioBigInt.from(expected.result));
    } finally {
      realTimeMock.restore();
    }
  }

  static 'real-provider-on-now'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'real-provider-on-now'>): void {
    const { expected, input } = scenarioCase;
    const realTimeMock = new RealTimeMock(input.rawMs);
    try {
      const provider = new HookedRealProvider(ClockOptionsFactory.materializeRealOptions(input.realProviderOptions));
      const result = provider.now();
      assert.deepStrictEqual(provider.nowEvents, expected.nowEvents);
      assert.strictEqual(result, expected.result);
    } finally {
      realTimeMock.restore();
    }
  }

  static 'real-provider-on-now-offset'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'real-provider-on-now-offset'>): void {
    const { expected, input } = scenarioCase;
    const realTimeMock = new RealTimeMock(input.rawMs);
    try {
      const provider = new HookedRealProvider(ClockOptionsFactory.materializeRealOptions(input.realProviderOptions));
      provider.now();
      assert.deepStrictEqual(provider.nowEvents, expected.nowEvents);
    } finally {
      realTimeMock.restore();
    }
  }

  static 'real-provider-throws-on-hrtime'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'real-provider-throws-on-hrtime'>): void {
    const { expected, input } = scenarioCase;
    const realTimeMock = new RealTimeMock(input.rawMs);
    try {
      const provider = new ThrowingRealHrtimeProvider(ClockOptionsFactory.materializeRealOptions(input.realProviderOptions));
      ClockRunners.assertHookFailure(() => { provider.hrtime(); }, 'onHrtime', expected.hookError);
    } finally {
      realTimeMock.restore();
    }
  }

  static 'real-provider-throws-on-now'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'real-provider-throws-on-now'>): void {
    const { expected, input } = scenarioCase;
    const realTimeMock = new RealTimeMock(input.rawMs);
    try {
      const provider = new ThrowingRealNowProvider(ClockOptionsFactory.materializeRealOptions(input.realProviderOptions));
      assert.throws(() => { provider.now(); }, (thrown: Error) => {
        assert.equal(thrown instanceof HookInvocationError, expected.hookError);
        assert.ok(thrown instanceof HookInvocationError);
        assert.strictEqual(thrown.hookName, 'onNow');
        assert.ok(thrown.cause instanceof Error);
        assert.strictEqual(thrown.cause.message, 'provider onNow boom');
        return true;
      });
    } finally {
      realTimeMock.restore();
    }
  }

  static 'traced-virtual-provider-hrtime'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'traced-virtual-provider-hrtime'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    counter.advance(input.virtualMs - counter.nowMs());
    const provider = VirtualClockProvider.create(counter);
    assert.strictEqual(provider.hrtime(), ScenarioBigInt.from(expected.hrtime));
  }

  static 'traced-virtual-provider-now'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'traced-virtual-provider-now'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    counter.advance(input.virtualMs - counter.nowMs());
    const provider = VirtualClockProvider.create(counter);
    assert.strictEqual(provider.now(), expected.now);
  }

  static 'two-instances-independent'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'two-instances-independent'>): void {
    const { expected, input } = scenarioCase;
    const startMs = ClockOptionsFactory.readCounterStartMs(input.counterOptions);
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const provider = VirtualClockProvider.create(counter);
    const clockA = Clock.create(provider);
    const clockB = Clock.create(provider);
    const aNow1 = clockA.now();
    const bNow1 = clockB.now();
    assert.strictEqual(aNow1, startMs);
    assert.strictEqual(bNow1, startMs);
    counter.advance(input.advanceMs);
    const aNow2 = clockA.now();
    const bNow2 = clockB.now();
    assert.ok(aNow2 >= aNow1);
    assert.ok(bNow2 >= bNow1);
    assert.strictEqual(aNow2, startMs + input.advanceMs);
    assert.strictEqual(bNow2, startMs + input.advanceMs);
    const sameResults = aNow1 === bNow1 && aNow2 === bNow2;
    assert.equal(sameResults, expected.sameResults);
  }

  static 'virtual-advance-reflected'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'virtual-advance-reflected'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    counter.advance(input.advanceMs);
    assert.strictEqual(clock.now(), expected.now);
  }

  static 'virtual-counter-default-options'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'virtual-counter-default-options'>): void {
    const counter = ClockOptionsFactory.createVirtualCounter(scenarioCase.input.counterOptions);
    const provider = VirtualClockProvider.create(counter);
    assert.strictEqual(provider.now(), 0);
    assert.strictEqual(counter.nowMs(), 0);
  }

  static 'virtual-provider-invalid-counter'(_scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'virtual-provider-invalid-counter'>): void {
    assert.strictEqual(VirtualTimeCounterEntity.validate({}), false);
  }

  static 'virtual-provider-on-hrtime'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'virtual-provider-on-hrtime'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const provider = new HookedVirtualProvider(counter);
    const result = provider.hrtime();
    assert.deepStrictEqual(ClockOptionsFactory.toNumbers(provider.hrtimeEvents), expected.hrtimeEvents);
    assert.strictEqual(result, ScenarioBigInt.from(expected.result));
  }

  static 'virtual-provider-on-now'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'virtual-provider-on-now'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const provider = new HookedVirtualProvider(counter);
    const result = provider.now();
    assert.deepStrictEqual(provider.nowEvents, expected.nowEvents);
    assert.strictEqual(result, expected.result);
  }

  static 'virtual-provider-on-now-advance'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'virtual-provider-on-now-advance'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const provider = new HookedVirtualProvider(counter);
    provider.now();
    counter.advance(input.advanceMs);
    provider.now();
    assert.deepStrictEqual(provider.nowEvents, expected.nowEvents);
  }

  static 'virtual-provider-throws-on-hrtime'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'virtual-provider-throws-on-hrtime'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const provider = new ThrowingVirtualHrtimeProvider(counter);
    ClockRunners.assertHookFailure(() => { provider.hrtime(); }, 'onHrtime', expected.hookError);
  }

  static 'virtual-provider-throws-on-now'(scenarioCase: ScenarioCaseOfType<ClockScenarioCaseEntity.Type, 'virtual-provider-throws-on-now'>): void {
    const { expected, input } = scenarioCase;
    const counter = ClockOptionsFactory.createVirtualCounter(input.counterOptions);
    const provider = new ThrowingVirtualNowProvider(counter);
    ClockRunners.assertHookFailure(() => { provider.now(); }, 'onNow', expected.hookError);
  }

  static declaresNonIntegerHrtime(): void {
    void it('surfaces a non-integer virtual time from hrtime as a ClockError carrying the platform error', () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const provider = VirtualClockProvider.create(counter);

      counter.advance(0.5);
      assert.throws(() => { provider.hrtime(); }, (caught) => {
        const thrown: unknown = caught;
        assert.ok(thrown instanceof ClockError);
        assert.equal(thrown.code, 'clock.invalidConfig');
        assert.ok(thrown.cause instanceof RangeError);
        return true;
      });
    });
  }

  private static assertHookFailure(action: () => void, hookName: string, hookErrorExpected: boolean): void {
    assert.throws(action, (thrown: Error) => {
      assert.equal(thrown instanceof HookInvocationError, hookErrorExpected);
      assert.ok(thrown instanceof HookInvocationError);
      assert.strictEqual(thrown.hookName, hookName);
      return true;
    });
  }
}

ScenarioSuite.register({
  'entity': ClockScenarioCaseEntity,
  'extraTests': ClockRunners.declaresNonIntegerHrtime,
  'file': scenarioGroups,
  'name': 'Clock',
  'runners': ClockRunners
});
