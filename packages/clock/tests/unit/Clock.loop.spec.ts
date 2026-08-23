import assert from 'node:assert/strict';
import {
  describe, it, mock
} from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import { Clock } from '../../src/clock/Clock.js';
import { RealTimeClockProvider } from '../../src/clock/RealTimeClockProvider.js';
import { VirtualClockProvider } from '../../src/clock/VirtualClockProvider.js';
import { VirtualTimeCounter } from '../../src/clock/VirtualTimeCounter.js';
import type { ClockProviderInterface } from '../../src/interfaces/ClockProviderInterface.js';
import { RealTimeClockProviderOptionsEntity } from '../../src/entities/RealTimeClockProviderOptionsEntity.js';
import { VirtualTimeCounterOptionsEntity } from '../../src/entities/VirtualTimeCounterOptionsEntity.js';
import { ClockError } from '../../src/errors/ClockError.js';
import scenarioGroups from './Clock.scenarios.json' with { type: 'json' };

type ScenarioCase = ScenarioCaseVariant & { name: string };

type ScenarioCaseVariant =
  | { advanceMs: number; description: string; expectedNow: number; shape: 'now-returns'; startMs: number }
  | { description: string; expectedNs: string; shape: 'hrtime-returns'; startMs: number }
  | { description: string; shape: 'real-hrtime-positive'; offsetMs: number }
  | { description: string; shape: 'real-now-within-range'; offsetMs: number }
  | { description: string; expectedMessage: string; shape: 'offset-invalid'; offsetMs: 'NaN' | 'Infinity' | '-Infinity' }
  | { description: string; expectedMessage: string; shape: 'clock-invalid-provider' }
  | { description: string; expectedMessage: string; shape: 'real-provider-invalid-options' }
  | { description: string; expectedMessage: string; shape: 'virtual-provider-invalid-counter' }
  | { description: string; expectedMessage: string; shape: 'counter-invalid-options' }
  | { description: string; shape: 'clock-error-with-cause' }
  | { description: string; shape: 'now-monotonic-same-instance' }
  | { description: string; shape: 'hrtime-monotonic-same-instance' }
  | { description: string; shape: 'two-instances-independent' }
  | { description: string; shape: 'clamp-backwards-provider-values' }
  | { description: string; shape: 'virtual-advance-reflected' }
  | { description: string; shape: 'hooked-clock-on-now' }
  | { description: string; shape: 'hooked-clock-on-now-clamped' }
  | { description: string; shape: 'hooked-clock-on-now-advanced' }
  | { description: string; shape: 'hooked-clock-on-hrtime' }
  | { description: string; shape: 'hooked-clock-on-hrtime-repeat' }
  | { description: string; shape: 'clock-async-on-now-rejection-contained' }
  | { description: string; shape: 'real-provider-on-now' }
  | { description: string; shape: 'real-provider-on-now-offset' }
  | { description: string; shape: 'real-provider-on-hrtime' }
  | { description: string; shape: 'real-provider-default-options' }
  | { description: string; shape: 'virtual-provider-on-now' }
  | { description: string; shape: 'virtual-provider-on-now-advance' }
  | { description: string; shape: 'virtual-provider-on-hrtime' }
  | { description: string; shape: 'virtual-counter-default-options' }
  | { description: string; shape: 'real-provider-throws-on-now' }
  | { description: string; shape: 'real-provider-throws-on-hrtime' }
  | { description: string; shape: 'virtual-provider-throws-on-now' }
  | { description: string; shape: 'virtual-provider-throws-on-hrtime' }
  | { description: string; shape: 'counter-on-advance' }
  | { description: string; shape: 'counter-on-advance-suppressed' }
  | { description: string; shape: 'counter-on-advance-sequence' }
  | { description: string; shape: 'counter-on-now-ms' }
  | { description: string; shape: 'counter-on-now-ms-repeat' }
  | { description: string; shape: 'clock-throws-on-now' }
  | { description: string; shape: 'clock-throws-on-hrtime' }
  | { description: string; shape: 'counter-throws-on-advance' }
  | { description: string; shape: 'counter-throws-on-now-ms' }
  | { description: string; shape: 'metered-clock-now' }
  | { description: string; shape: 'metered-clock-hrtime' }
  | { description: string; shape: 'offset-provider-now' }
  | { description: string; shape: 'offset-provider-offset' }
  | { description: string; shape: 'traced-virtual-provider-now' }
  | { description: string; shape: 'traced-virtual-provider-hrtime' }
  | { description: string; shape: 'long-uptime-precision' };

const NS_PER_MS = 1_000_000n;
const ZERO_NS = 0n;

type RuntimeNumberShape = 'infinity' | 'nan' | 'negative-infinity';
type RuntimeNumberInput = number | { shape: RuntimeNumberShape };
type RealTimeClockProviderOptionsInput = {
  shape: 'default' | 'options';
  value?: {
    offsetMs?: RuntimeNumberInput;
  };
};
type VirtualTimeCounterOptionsInput = {
  shape: 'default' | 'options';
  value?: {
    startMs?: RuntimeNumberInput;
  };
};
type ObjectFixtureInput = {
  shape: 'empty-object';
};

const runtimeNumberByShape = {
  'infinity': () => Number.POSITIVE_INFINITY,
  'nan': () => Number.NaN,
  'negative-infinity': () => Number.NEGATIVE_INFINITY
} satisfies Record<RuntimeNumberShape, () => number>;

function materializeRuntimeNumber(input: RuntimeNumberInput): number {
  return typeof input === 'number' ? input : runtimeNumberByShape[input.shape]();
}

const realTimeClockProviderOptionsByShape = {
  'default': () => undefined,
  'options': (input: RealTimeClockProviderOptionsInput) => {
    const offsetMs = input.value?.offsetMs;
    return offsetMs === undefined ? {} : { offsetMs: materializeRuntimeNumber(offsetMs) };
  }
} satisfies Record<
  RealTimeClockProviderOptionsInput['shape'],
  (input: RealTimeClockProviderOptionsInput) => Parameters<typeof RealTimeClockProvider.create>[0]
>;

function materializeRealTimeClockProviderOptions(
  input: RealTimeClockProviderOptionsInput
): Parameters<typeof RealTimeClockProvider.create>[0] {
  return realTimeClockProviderOptionsByShape[input.shape](input);
}

const virtualTimeCounterOptionsByShape = {
  'default': () => undefined,
  'options': (input: VirtualTimeCounterOptionsInput) => {
    const startMs = input.value?.startMs;
    return startMs === undefined ? {} : { startMs: materializeRuntimeNumber(startMs) };
  }
} satisfies Record<
  VirtualTimeCounterOptionsInput['shape'],
  (input: VirtualTimeCounterOptionsInput) => Parameters<typeof VirtualTimeCounter.create>[0]
>;

function materializeVirtualTimeCounterOptions(
  input: VirtualTimeCounterOptionsInput
): Parameters<typeof VirtualTimeCounter.create>[0] {
  return virtualTimeCounterOptionsByShape[input.shape](input);
}

const objectFixtureByShape = {
  'empty-object': () => ({})
} satisfies Record<ObjectFixtureInput['shape'], () => Record<string, never>>;

function materializeObjectFixture(input: ObjectFixtureInput): Record<string, never> {
  return objectFixtureByShape[input.shape]();
}

function createRealTimeClockProvider(input: RealTimeClockProviderOptionsInput): RealTimeClockProvider {
  return RealTimeClockProvider.create(materializeRealTimeClockProviderOptions(input));
}

function createVirtualTimeCounter(input: VirtualTimeCounterOptionsInput): VirtualTimeCounter {
  return VirtualTimeCounter.create(materializeVirtualTimeCounterOptions(input));
}

function createVirtualClockProvider(input: VirtualTimeCounterOptionsInput): VirtualClockProvider {
  return VirtualClockProvider.create(createVirtualTimeCounter(input));
}

function createVirtualClock(input: VirtualTimeCounterOptionsInput): Clock {
  return Clock.create(createVirtualClockProvider(input));
}

function readVirtualTimeCounterStartMs(input: VirtualTimeCounterOptionsInput): number {
  return materializeVirtualTimeCounterOptions(input)?.startMs ?? 0;
}

interface RealTimeMockInterface {
  restore(): void;
}

function mockRealTime(rawTime: number): RealTimeMockInterface {
  const dateNowMock = mock.method(Date, 'now', Number.prototype.valueOf.bind(rawTime));
  const performanceNowMock = mock.method(performance, 'now', Number.prototype.valueOf.bind(rawTime));
  const result: RealTimeMockInterface = {
    restore(): void {
      dateNowMock.mock.restore();
      performanceNowMock.mock.restore();
    }
  };
  return result;
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
    const result = BigInt(this.#counter.nowMs()) * NS_PER_MS;
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

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'now-returns': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { now: number };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    counter.advance(input.advanceMs);
    assert.strictEqual(clock.now(), expected.now);
    return;
  },

  'hrtime-returns': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { ns: string };
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    const clock = createVirtualClock(input.counterOptions);
    assert.strictEqual(clock.hrtime(), BigInt(expected.ns));
    return;
  },

  'real-hrtime-positive': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { positive: boolean };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput };
    };
    const offsetMs = materializeRealTimeClockProviderOptions(input.realProviderOptions)?.offsetMs ?? 0;
    // Compare against a zero-offset baseline provider read at roughly the same
    // instant so the assertion proves the offset is actually reflected in the
    // returned nanoseconds (not just that the result happens to be positive,
    // which a wrong offset or unit-scaling bug would still satisfy).
    const baseline = RealTimeClockProvider.create();
    const provider = createRealTimeClockProvider(input.realProviderOptions);
    const baselineNs = baseline.hrtime();
    const offsetNs = provider.hrtime();
    assert.strictEqual(offsetNs > ZERO_NS, expected.positive);
    const deltaNs = offsetNs - baselineNs;
    const expectedDeltaNs = BigInt(offsetMs) * NS_PER_MS;
    const toleranceNs = 50n * NS_PER_MS;
    assert.ok(
      deltaNs >= expectedDeltaNs - toleranceNs && deltaNs <= expectedDeltaNs + toleranceNs,
      `expected hrtime delta ${deltaNs} to be within tolerance of ${expectedDeltaNs}`
    );
    return;
  },

  'real-now-within-range': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { withinTolerance: boolean };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput };
    };
    const before = Date.now();
    const clock = Clock.create(createRealTimeClockProvider(input.realProviderOptions));
    const value = clock.now();
    const after = Date.now();
    const toleranceMs = 5;
    assert.strictEqual(value >= before - toleranceMs && value <= after + toleranceMs, expected.withinTolerance);
    return;
  },

  'offset-invalid': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { message: string };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput };
    };
    assert.throws(() => {
      RealTimeClockProvider.create(materializeRealTimeClockProviderOptions(input.realProviderOptions));
    }, { message: expected.message });
    return;
  },
  'clock-invalid-provider': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { message: string };
      input: { providerFixture: ObjectFixtureInput };
    };
    assert.throws(() => {
      Clock.create(materializeObjectFixture(input.providerFixture) as never);
    }, { message: expected.message });
    return;
  },
  'real-provider-invalid-options': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { message: string };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput };
    };
    assert.throws(() => {
      RealTimeClockProvider.create(materializeRealTimeClockProviderOptions(input.realProviderOptions));
    }, { message: expected.message });
    return;
  },
  'virtual-provider-invalid-counter': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { message: string };
      input: { counterFixture: ObjectFixtureInput };
    };
    assert.throws(() => {
      VirtualClockProvider.create(materializeObjectFixture(input.counterFixture) as never);
    }, { message: expected.message });
    return;
  },
  'counter-invalid-options': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { message: string };
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    assert.throws(() => {
      VirtualTimeCounter.create(materializeVirtualTimeCounterOptions(input.counterOptions));
    }, { message: expected.message });
    return;
  },
  'clock-error-with-cause': (_scenarioCase) => {
    const cause = new Error('boom');
    const error = new ClockError('clock failed', cause);
    assert.strictEqual(error.message, 'clock failed');
    assert.strictEqual(error.cause, cause);
    return;
  },

  'now-monotonic-same-instance': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { monotonic: boolean };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    const first = clock.now();
    counter.advance(input.advanceMs);
    const second = clock.now();
    counter.advance(0);
    const third = clock.now();
    assert.equal(first <= second && second <= third, expected.monotonic);
    return;
  },

  'hrtime-monotonic-same-instance': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { monotonic: boolean };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    const first = clock.hrtime();
    counter.advance(input.advanceMs);
    const second = clock.hrtime();
    assert.equal(first <= second, expected.monotonic);
    return;
  },

  'two-instances-independent': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { sameResults: boolean };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    const startMs = readVirtualTimeCounterStartMs(input.counterOptions);
    const counter = createVirtualTimeCounter(input.counterOptions);
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
    return;
  },

  'clamp-backwards-provider-values': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { clamped: boolean };
      input: {
        lowerCounterOptions: VirtualTimeCounterOptionsInput;
        counterOptions: VirtualTimeCounterOptionsInput;
      };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    const lowerCounter = createVirtualTimeCounter(input.lowerCounterOptions);
    let readCount = 0;
    const provider: ClockProviderInterface = {
      hrtime(): bigint {
        const result = BigInt(counter.nowMs()) * NS_PER_MS;
        return result;
      },
      now(): number {
        readCount += 1;
        const result = readCount === 1 ? counter.nowMs() : lowerCounter.nowMs();
        return result;
      }
    };
    const clock = Clock.create(provider);
    const first = clock.now();
    const second = clock.now();
    assert.ok(first >= 0);
    assert.ok(lowerCounter.nowMs() >= 0);
    const clamped = second === first && second > lowerCounter.nowMs();
    assert.equal(clamped, expected.clamped);
    return;
  },

  'virtual-advance-reflected': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { now: number };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    counter.advance(input.advanceMs);
    assert.strictEqual(clock.now(), expected.now);
    return;
  },

  'hooked-clock-on-now': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { nowEvents: number[]; result: number };
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedClock extends Clock {
      readonly nowEvents: number[] = [];
      readonly hrtimeEvents: bigint[] = [];

      protected override onNow(timestamp: number): void {
        this.nowEvents.push(timestamp);
      }

      protected override onHrtime(value: bigint): void {
        this.hrtimeEvents.push(value);
      }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = HookedClock.create(VirtualClockProvider.create(counter));
    const result = clock.now();
    assert.deepStrictEqual(clock.nowEvents, expected.nowEvents);
    assert.strictEqual(result, expected.result);
    return;
  },

  'hooked-clock-on-now-clamped': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { nowEvents: number[] };
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedClock extends Clock {
      readonly nowEvents: number[] = [];
      protected override onNow(timestamp: number): void {
        this.nowEvents.push(timestamp);
      }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = HookedClock.create(VirtualClockProvider.create(counter));
    clock.now();
    clock.now();
    assert.deepStrictEqual(clock.nowEvents, expected.nowEvents);
    return;
  },

  'hooked-clock-on-now-advanced': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { nowEvents: number[] };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedClock extends Clock {
      readonly nowEvents: number[] = [];
      protected override onNow(timestamp: number): void {
        this.nowEvents.push(timestamp);
      }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = HookedClock.create(VirtualClockProvider.create(counter));
    clock.now();
    counter.advance(input.advanceMs);
    clock.now();
    assert.deepStrictEqual(clock.nowEvents, expected.nowEvents);
    return;
  },

  'hooked-clock-on-hrtime': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hrtimeEvents: bigint[]; result: bigint };
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedClock extends Clock {
      readonly hrtimeEvents: bigint[] = [];
      protected override onHrtime(value: bigint): void {
        this.hrtimeEvents.push(value);
      }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = HookedClock.create(VirtualClockProvider.create(counter));
    const result = clock.hrtime();
    assert.deepStrictEqual(clock.hrtimeEvents.map((value) => Number(value)), expected.hrtimeEvents.map(Number));
    assert.strictEqual(result, BigInt(String(expected.result)));
    return;
  },

  'hooked-clock-on-hrtime-repeat': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hrtimeEvents: bigint[] };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedClock extends Clock {
      readonly hrtimeEvents: bigint[] = [];
      protected override onHrtime(value: bigint): void {
        this.hrtimeEvents.push(value);
      }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = HookedClock.create(VirtualClockProvider.create(counter));
    clock.hrtime();
    counter.advance(input.advanceMs);
    clock.hrtime();
    assert.deepStrictEqual(clock.hrtimeEvents.map((value) => Number(value)), expected.hrtimeEvents.map(Number));
    return;
  },

  'clock-async-on-now-rejection-contained': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { result: number; unhandledRejections: number };
      input: { counterOptions: VirtualTimeCounterOptionsInput; message: string };
    };
    class AsyncRejectingNowClock extends Clock {
      protected override async onNow(_timestamp: number): Promise<void> {
        await Promise.resolve();
        throw new Error(input.message);
      }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = AsyncRejectingNowClock.create(VirtualClockProvider.create(counter));
    let rejectionEvents = 0;
    const onUnhandledRejection = (): void => {
      rejectionEvents++;
    };
    process.on('unhandledRejection', onUnhandledRejection);
    return (async () => {
      try {
        const result = clock.now();
        assert.strictEqual(result, expected.result);
        await new Promise((resolve) => { setImmediate(resolve); });
        await new Promise((resolve) => { setImmediate(resolve); });
        assert.strictEqual(rejectionEvents, expected.unhandledRejections);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    })();
  },

  'real-provider-on-now': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { nowEvents: number[]; result: number };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class HookedRealProvider extends RealTimeClockProvider {
      readonly nowEvents: number[] = [];
      readonly hrtimeEvents: bigint[] = [];
      public constructor(options: Parameters<typeof RealTimeClockProvider.create>[0] = {}) { super(RealTimeClockProviderOptionsEntity.intake(options)); }
      protected override onNow(timestamp: number): void { this.nowEvents.push(timestamp); }
      protected override onHrtime(value: bigint): void { this.hrtimeEvents.push(value); }
    }

    const realTimeMock = mockRealTime(input.rawMs);
    try {
      const provider = new HookedRealProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
      const result = provider.now();
      assert.deepStrictEqual(provider.nowEvents, expected.nowEvents);
      assert.strictEqual(result, expected.result);
    } finally {
      realTimeMock.restore();
    }
    return;
  },

  'real-provider-on-now-offset': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { nowEvents: number[]; result: number };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class HookedRealProvider extends RealTimeClockProvider {
      readonly nowEvents: number[] = [];
      public constructor(options: Parameters<typeof RealTimeClockProvider.create>[0] = {}) { super(RealTimeClockProviderOptionsEntity.intake(options)); }
      protected override onNow(timestamp: number): void { this.nowEvents.push(timestamp); }
    }

    const realTimeMock = mockRealTime(input.rawMs);
    try {
      const provider = new HookedRealProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
      provider.now();
      assert.deepStrictEqual(provider.nowEvents, expected.nowEvents);
    } finally {
      realTimeMock.restore();
    }
    return;
  },

  'real-provider-on-hrtime': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hrtimeEvents: bigint[]; result: bigint };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class HookedRealProvider extends RealTimeClockProvider {
      readonly hrtimeEvents: bigint[] = [];
      public constructor(options: Parameters<typeof RealTimeClockProvider.create>[0] = {}) { super(RealTimeClockProviderOptionsEntity.intake(options)); }
      protected override onHrtime(value: bigint): void { this.hrtimeEvents.push(value); }
    }

    const realTimeMock = mockRealTime(input.rawMs);
    try {
      const provider = new HookedRealProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
      const result = provider.hrtime();
      assert.deepStrictEqual(provider.hrtimeEvents.map((value) => Number(value)), expected.hrtimeEvents.map(Number));
      assert.strictEqual(result, BigInt(String(expected.result)));
    } finally {
      realTimeMock.restore();
    }
    return;
  },

  'real-provider-default-options': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { realProviderOptions: RealTimeClockProviderOptionsInput };
    };
    const before = Date.now();
    const provider = createRealTimeClockProvider(input.realProviderOptions);
    const value = provider.now();
    const after = Date.now();
    assert.strictEqual(value >= before - 10, true);
    assert.strictEqual(value <= after + 10, true);
    return;
  },

  'virtual-provider-on-now': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { nowEvents: number[]; result: number };
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedVirtualProvider extends VirtualClockProvider {
      readonly nowEvents: number[] = [];
      readonly hrtimeEvents: bigint[] = [];
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
      protected override onNow(timestamp: number): void { this.nowEvents.push(timestamp); }
      protected override onHrtime(value: bigint): void { this.hrtimeEvents.push(value); }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = new HookedVirtualProvider(counter);
    const result = provider.now();
    assert.deepStrictEqual(provider.nowEvents, expected.nowEvents);
    assert.strictEqual(result, expected.result);
    return;
  },

  'virtual-provider-on-now-advance': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { nowEvents: number[] };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedVirtualProvider extends VirtualClockProvider {
      readonly nowEvents: number[] = [];
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
      protected override onNow(timestamp: number): void { this.nowEvents.push(timestamp); }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = new HookedVirtualProvider(counter);
    provider.now();
    counter.advance(input.advanceMs);
    provider.now();
    assert.deepStrictEqual(provider.nowEvents, expected.nowEvents);
    return;
  },

  'virtual-provider-on-hrtime': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hrtimeEvents: bigint[]; result: bigint };
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedVirtualProvider extends VirtualClockProvider {
      readonly hrtimeEvents: bigint[] = [];
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
      protected override onHrtime(value: bigint): void { this.hrtimeEvents.push(value); }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = new HookedVirtualProvider(counter);
    const result = provider.hrtime();
    assert.deepStrictEqual(provider.hrtimeEvents.map((value) => Number(value)), expected.hrtimeEvents.map(Number));
    assert.strictEqual(result, BigInt(String(expected.result)));
    return;
  },

  'virtual-counter-default-options': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = VirtualClockProvider.create(counter);
    assert.strictEqual(provider.now(), 0);
    assert.strictEqual(counter.nowMs(), 0);
    return;
  },

  'real-provider-throws-on-now': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hookError: boolean };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class ThrowingRealNowProvider extends RealTimeClockProvider {
      public constructor(options: Parameters<typeof RealTimeClockProvider.create>[0] = {}) { super(RealTimeClockProviderOptionsEntity.intake(options)); }
      protected override onNow(): void { throw new Error('provider onNow boom'); }
    }

    const realTimeMock = mockRealTime(input.rawMs);
    try {
      const provider = new ThrowingRealNowProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
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
    return;
  },

  'real-provider-throws-on-hrtime': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hookError: boolean };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class ThrowingRealHrtimeProvider extends RealTimeClockProvider {
      public constructor(options: Parameters<typeof RealTimeClockProvider.create>[0] = {}) { super(RealTimeClockProviderOptionsEntity.intake(options)); }
      protected override onHrtime(): void { throw new Error('provider onHrtime boom'); }
    }

    const realTimeMock = mockRealTime(input.rawMs);
    try {
      const provider = new ThrowingRealHrtimeProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
      assert.throws(() => { provider.hrtime(); }, (thrown: Error) => {
        assert.equal(thrown instanceof HookInvocationError, expected.hookError);
        assert.ok(thrown instanceof HookInvocationError);
        assert.strictEqual(thrown.hookName, 'onHrtime');
        return true;
      });
    } finally {
      realTimeMock.restore();
    }
    return;
  },

  'virtual-provider-throws-on-now': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hookError: boolean };
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class ThrowingVirtualNowProvider extends VirtualClockProvider {
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
      protected override onNow(): void { throw new Error('virtual provider onNow boom'); }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = new ThrowingVirtualNowProvider(counter);
    assert.throws(() => { provider.now(); }, (thrown: Error) => {
      assert.equal(thrown instanceof HookInvocationError, expected.hookError);
      assert.ok(thrown instanceof HookInvocationError);
      assert.strictEqual(thrown.hookName, 'onNow');
      return true;
    });
    return;
  },

  'virtual-provider-throws-on-hrtime': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hookError: boolean };
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class ThrowingVirtualHrtimeProvider extends VirtualClockProvider {
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
      protected override onHrtime(): void { throw new Error('virtual provider onHrtime boom'); }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = new ThrowingVirtualHrtimeProvider(counter);
    assert.throws(() => { provider.hrtime(); }, (thrown: Error) => {
      assert.equal(thrown instanceof HookInvocationError, expected.hookError);
      assert.ok(thrown instanceof HookInvocationError);
      assert.strictEqual(thrown.hookName, 'onHrtime');
      return true;
    });
    return;
  },

  'counter-on-advance': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hookCalls: [number, number] };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedCounter extends VirtualTimeCounter {
      readonly advanceEvents: Array<{ deltaMs: number; nowMs: number }> = [];
      readonly nowMsEvents: number[] = [];
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(VirtualTimeCounterOptionsEntity.intake(options)); }
      protected override onAdvance(deltaMs: number, nowMs: number): void {
        this.advanceEvents.push({ deltaMs, nowMs });
      }
      protected override onNowMs(value: number): void {
        this.nowMsEvents.push(value);
      }
    }

    const counter = new HookedCounter(materializeVirtualTimeCounterOptions(input.counterOptions));
    counter.advance(input.advanceMs);
    assert.strictEqual(counter.advanceEvents.length, 1);
    assert.strictEqual(counter.advanceEvents[0]!.deltaMs, expected.hookCalls[0]);
    assert.strictEqual(counter.advanceEvents[0]!.nowMs, expected.hookCalls[1]);
    return;
  },

  'counter-on-advance-suppressed': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hookCalls: [] };
      input: { advances: number[]; counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedCounter extends VirtualTimeCounter {
      readonly advanceEvents: Array<{ deltaMs: number; nowMs: number }> = [];
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(VirtualTimeCounterOptionsEntity.intake(options)); }
      protected override onAdvance(deltaMs: number, nowMs: number): void {
        this.advanceEvents.push({ deltaMs, nowMs });
      }
    }

    const counter = new HookedCounter(materializeVirtualTimeCounterOptions(input.counterOptions));
    for (const advanceMs of input.advances) {
      counter.advance(advanceMs);
    }
    assert.strictEqual(counter.advanceEvents.length, expected.hookCalls.length);
    return;
  },

  'counter-on-advance-sequence': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hookCalls: number[] };
      input: { advances: number[]; counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedCounter extends VirtualTimeCounter {
      readonly advanceEvents: Array<{ deltaMs: number; nowMs: number }> = [];
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(VirtualTimeCounterOptionsEntity.intake(options)); }
      protected override onAdvance(deltaMs: number, nowMs: number): void {
        this.advanceEvents.push({ deltaMs, nowMs });
      }
    }

    const counter = new HookedCounter(materializeVirtualTimeCounterOptions(input.counterOptions));
    for (const advanceMs of input.advances) {
      counter.advance(advanceMs);
    }
    assert.deepStrictEqual(counter.advanceEvents.map(({ nowMs }) => nowMs), expected.hookCalls);
    return;
  },

  'counter-on-now-ms': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { values: number[] };
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedCounter extends VirtualTimeCounter {
      readonly nowMsEvents: number[] = [];
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(VirtualTimeCounterOptionsEntity.intake(options)); }
      protected override onNowMs(value: number): void {
        this.nowMsEvents.push(value);
      }
    }

    const counter = new HookedCounter(materializeVirtualTimeCounterOptions(input.counterOptions));
    const result = counter.nowMs();
    assert.strictEqual(counter.nowMsEvents.length, 1);
    assert.strictEqual(counter.nowMsEvents[0], result);
    assert.deepStrictEqual(counter.nowMsEvents, expected.values);
    return;
  },

  'counter-on-now-ms-repeat': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { values: number[] };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    class HookedCounter extends VirtualTimeCounter {
      readonly nowMsEvents: number[] = [];
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(VirtualTimeCounterOptionsEntity.intake(options)); }
      protected override onNowMs(value: number): void {
        this.nowMsEvents.push(value);
      }
    }

    const counter = new HookedCounter(materializeVirtualTimeCounterOptions(input.counterOptions));
    counter.nowMs();
    counter.advance(input.advanceMs);
    counter.nowMs();
    assert.strictEqual(counter.nowMsEvents.length, 2);
    assert.deepStrictEqual(counter.nowMsEvents, expected.values);
    return;
  },

  'clock-throws-on-now': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class ThrowingNowClock extends Clock {
      public constructor(provider: ClockProviderInterface) { super(provider); }
      protected override onNow(): void { throw new Error('onNow boom'); }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = new ThrowingNowClock(VirtualClockProvider.create(counter));
    assert.throws(() => { clock.now(); }, (thrown: Error) => {
      assert.ok(thrown instanceof HookInvocationError);
      assert.strictEqual(thrown.hookName, 'onNow');
      return true;
    });
    return;
  },

  'clock-throws-on-hrtime': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class ThrowingHrtimeClock extends Clock {
      public constructor(provider: ClockProviderInterface) { super(provider); }
      protected override onHrtime(): void { throw new Error('onHrtime boom'); }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = new ThrowingHrtimeClock(VirtualClockProvider.create(counter));
    assert.throws(() => { clock.hrtime(); }, (thrown: Error) => {
      assert.ok(thrown instanceof HookInvocationError);
      assert.strictEqual(thrown.hookName, 'onHrtime');
      return true;
    });
    return;
  },

  'counter-throws-on-advance': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    class ThrowingAdvanceCounter extends VirtualTimeCounter {
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(VirtualTimeCounterOptionsEntity.intake(options)); }
      protected override onAdvance(): void { throw new Error('onAdvance boom'); }
    }

    const counter = new ThrowingAdvanceCounter(materializeVirtualTimeCounterOptions(input.counterOptions));
    assert.throws(() => { counter.advance(input.advanceMs); }, (thrown: Error) => {
      assert.ok(thrown instanceof HookInvocationError);
      assert.strictEqual(thrown.hookName, 'onAdvance');
      return true;
    });
    return;
  },

  'counter-throws-on-now-ms': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class ThrowingNowMsCounter extends VirtualTimeCounter {
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(VirtualTimeCounterOptionsEntity.intake(options)); }
      protected override onNowMs(): void { throw new Error('onNowMs boom'); }
    }

    const counter = new ThrowingNowMsCounter(materializeVirtualTimeCounterOptions(input.counterOptions));
    assert.throws(() => { counter.nowMs(); }, (thrown: Error) => {
      assert.ok(thrown instanceof HookInvocationError);
      assert.strictEqual(thrown.hookName, 'onNowMs');
      return true;
    });
    return;
  },

  'metered-clock-now': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { now: number };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = new MeteredClockProvider(counter);
    const clock = Clock.create(provider);
    const first = clock.now();
    assert.strictEqual(first, expected.now);
    counter.advance(input.advanceMs);
    const second = clock.now();
    assert.ok(provider.nowCallCount > 0);
    assert.strictEqual(provider.nowCallCount, 2);
    assert.ok(first <= second);
    return;
  },

  'metered-clock-hrtime': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hrtime: string };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = new MeteredClockProvider(counter);
    const clock = Clock.create(provider);
    assert.strictEqual(clock.hrtime(), BigInt(expected.hrtime));
    counter.advance(input.advanceMs);
    clock.hrtime();
    assert.ok(provider.hrtimeCallCount > 0);
    assert.strictEqual(provider.hrtimeCallCount, 2);
    return;
  },

  'offset-provider-now': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { now: number };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    const realTimeMock = mockRealTime(input.rawMs);
    try {
      const provider = RealTimeClockProvider.create(materializeRealTimeClockProviderOptions(input.realProviderOptions));
      assert.strictEqual(provider.now(), expected.now);
    } finally {
      realTimeMock.restore();
    }
    return;
  },

  'offset-provider-offset': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { now: number };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class OffsetRealTimeClockProvider extends RealTimeClockProvider {
      public constructor(options: Parameters<typeof RealTimeClockProvider.create>[0] = {}) { super(RealTimeClockProviderOptionsEntity.intake(options)); }
      // Exposes the protected `offsetMs` getter so the subclass-access claim in
      // this scenario's description is actually exercised.
      public get exposedOffsetMs(): number { return this.offsetMs; }
    }

    const realTimeMock = mockRealTime(input.rawMs);
    try {
      const provider = new OffsetRealTimeClockProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
      const expectedOffsetMs = materializeRealTimeClockProviderOptions(input.realProviderOptions)?.offsetMs ?? 0;
      assert.strictEqual(provider.exposedOffsetMs, expectedOffsetMs);
      assert.strictEqual(provider.now(), expected.now);
    } finally {
      realTimeMock.restore();
    }
    return;
  },

  'traced-virtual-provider-now': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { now: number };
      input: { counterOptions: VirtualTimeCounterOptionsInput; virtualMs: number };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    counter.advance(input.virtualMs - counter.nowMs());
    const provider = VirtualClockProvider.create(counter);
    assert.strictEqual(provider.now(), expected.now);
    return;
  },

  'traced-virtual-provider-hrtime': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hrtime: string };
      input: { counterOptions: VirtualTimeCounterOptionsInput; virtualMs: number };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    counter.advance(input.virtualMs - counter.nowMs());
    const provider = VirtualClockProvider.create(counter);
    assert.strictEqual(provider.hrtime(), BigInt(expected.hrtime));
    return;
  },

  'long-uptime-precision': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { precise: boolean };
      input: { rawMs: number; realProviderOptions: RealTimeClockProviderOptionsInput };
    };
    // Derive the expected nanosecond value independently of the production
    // trunc/multiply/round split used by RealTimeClockProvider.hrtime(): format
    // the raw ms value as a fixed-point decimal string with microsecond
    // precision and read the whole/fractional parts straight out of the text,
    // so a bug in the source's float-splitting formula cannot reproduce
    // identically here.
    const [wholeMsText, fractionalNsText] = input.rawMs.toFixed(6).split('.');
    const expectedNs = BigInt(wholeMsText!) * NS_PER_MS + BigInt(fractionalNsText!);
    const lossyNs = BigInt(Math.round(input.rawMs * Number(NS_PER_MS)));
    const realTimeMock = mockRealTime(input.rawMs);
    try {
      const provider = RealTimeClockProvider.create(materializeRealTimeClockProviderOptions(input.realProviderOptions));
      const result = provider.hrtime();
      const precise = result === expectedNs && result !== lossyNs;
      assert.equal(precise, expected.precise);
    } finally {
      realTimeMock.restore();
    }
    return;
  }
};

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Clock', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
