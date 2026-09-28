import { RuntimeError, HookInvocationError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it, mock
} from 'node:test';

import { Clock } from '../../src/clock/Clock.js';
import { RealTimeClockProvider } from '../../src/clock/RealTimeClockProvider.js';
import { VirtualClockProvider } from '../../src/clock/VirtualClockProvider.js';
import { VirtualTimeCounter } from '../../src/clock/VirtualTimeCounter.js';
import { ClockProviderEntity } from '../../src/clock/ClockProviderEntity.js';
import { VirtualTimeCounterEntity } from '../../src/clock/VirtualTimeCounterEntity.js';
import type { ClockProviderInterface } from '../../src/interfaces/ClockProviderInterface.js';
import { RealTimeClockProviderOptionsEntity } from '../../src/entities/RealTimeClockProviderOptionsEntity.js';
import { VirtualTimeCounterOptionsEntity } from '../../src/entities/VirtualTimeCounterOptionsEntity.js';
import { ClockError } from '../../src/errors/ClockError.js';
import { ClockScenarioCaseEntity } from './entities/ClockScenarioCaseEntity.js';
import scenarioGroups from './Clock.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(ClockScenarioCaseEntity.Schema, ClockScenarioCaseEntity.Node);

const NS_PER_MS = 1_000_000n;
const ZERO_NS = 0n;

const runtimeNumberByShape = {
  'infinity': () => Number.POSITIVE_INFINITY,
  'nan': () => Number.NaN,
  'negative-infinity': () => Number.NEGATIVE_INFINITY
} satisfies Record<ClockScenarioCaseEntity.RuntimeNumberShape, () => number>;

function materializeRuntimeNumber(input: ClockScenarioCaseEntity.RuntimeNumber): number {
  return typeof input === 'number' ? input : runtimeNumberByShape[input.shape]();
}

const realTimeClockProviderOptionsByShape = {
  'default': () => undefined,
  'options': (input: ClockScenarioCaseEntity.RealTimeClockProviderOptions) => {
    if (input.shape !== 'options') { throw RuntimeError.create('unreachable: expected options shape'); }
    const offsetMs = input.value?.offsetMs;
    return offsetMs === undefined ? {} : { offsetMs: materializeRuntimeNumber(offsetMs) };
  }
} satisfies Record<
  ClockScenarioCaseEntity.RealTimeClockProviderOptions['shape'],
  (input: ClockScenarioCaseEntity.RealTimeClockProviderOptions) => Parameters<typeof RealTimeClockProvider.create>[0]
>;

function materializeRealTimeClockProviderOptions(
  input: ClockScenarioCaseEntity.RealTimeClockProviderOptions
): Parameters<typeof RealTimeClockProvider.create>[0] {
  return realTimeClockProviderOptionsByShape[input.shape](input);
}

const virtualTimeCounterOptionsByShape = {
  'default': () => undefined,
  'options': (input: ClockScenarioCaseEntity.VirtualTimeCounterOptions) => {
    if (input.shape !== 'options') { throw RuntimeError.create('unreachable: expected options shape'); }
    const startMs = input.value?.startMs;
    return startMs === undefined ? {} : { startMs: materializeRuntimeNumber(startMs) };
  }
} satisfies Record<
  ClockScenarioCaseEntity.VirtualTimeCounterOptions['shape'],
  (input: ClockScenarioCaseEntity.VirtualTimeCounterOptions) => Parameters<typeof VirtualTimeCounter.create>[0]
>;

function materializeVirtualTimeCounterOptions(
  input: ClockScenarioCaseEntity.VirtualTimeCounterOptions
): Parameters<typeof VirtualTimeCounter.create>[0] {
  return virtualTimeCounterOptionsByShape[input.shape](input);
}

function createRealTimeClockProvider(input: ClockScenarioCaseEntity.RealTimeClockProviderOptions): RealTimeClockProvider {
  return RealTimeClockProvider.create(materializeRealTimeClockProviderOptions(input));
}

function createVirtualTimeCounter(input: ClockScenarioCaseEntity.VirtualTimeCounterOptions): VirtualTimeCounter {
  return VirtualTimeCounter.create(materializeVirtualTimeCounterOptions(input));
}

function createVirtualClockProvider(input: ClockScenarioCaseEntity.VirtualTimeCounterOptions): VirtualClockProvider {
  return VirtualClockProvider.create(createVirtualTimeCounter(input));
}

function createVirtualClock(input: ClockScenarioCaseEntity.VirtualTimeCounterOptions): Clock {
  return Clock.create(createVirtualClockProvider(input));
}

function readVirtualTimeCounterStartMs(input: ClockScenarioCaseEntity.VirtualTimeCounterOptions): number {
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

type ScenarioRunner = (scenarioCase: ClockScenarioCaseEntity.Type) => Promise<void> | void;

const runnerMap: Record<ClockScenarioCaseEntity.Type['shape'], ScenarioRunner> = {
  'now-returns': (scenarioCase) => {
    if (scenarioCase.shape !== 'now-returns') { throw RuntimeError.create('unreachable: expected now-returns shape'); }
    const { expected, input } = scenarioCase;
    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    counter.advance(input.advanceMs);
    assert.strictEqual(clock.now(), expected.now);
    return;
  },

  'hrtime-returns': (scenarioCase) => {
    if (scenarioCase.shape !== 'hrtime-returns') { throw RuntimeError.create('unreachable: expected hrtime-returns shape'); }
    const { expected, input } = scenarioCase;
    const clock = createVirtualClock(input.counterOptions);
    assert.strictEqual(clock.hrtime(), BigInt(expected.ns));
    return;
  },

  'real-hrtime-positive': (scenarioCase) => {
    if (scenarioCase.shape !== 'real-hrtime-positive') { throw RuntimeError.create('unreachable: expected real-hrtime-positive shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'real-now-within-range') { throw RuntimeError.create('unreachable: expected real-now-within-range shape'); }
    const { expected, input } = scenarioCase;
    const before = Date.now();
    const clock = Clock.create(createRealTimeClockProvider(input.realProviderOptions));
    const value = clock.now();
    const after = Date.now();
    const toleranceMs = 5;
    assert.strictEqual(value >= before - toleranceMs && value <= after + toleranceMs, expected.withinTolerance);
    return;
  },

  'offset-invalid': (scenarioCase) => {
    if (scenarioCase.shape !== 'offset-invalid') { throw RuntimeError.create('unreachable: expected offset-invalid shape'); }
    const { expected, input } = scenarioCase;
    assert.throws(() => {
      RealTimeClockProvider.create(materializeRealTimeClockProviderOptions(input.realProviderOptions));
    }, { message: expected.message });
    return;
  },
  'clock-invalid-provider': (scenarioCase) => {
    if (scenarioCase.shape !== 'clock-invalid-provider') { throw RuntimeError.create('unreachable: expected clock-invalid-provider shape'); }
    assert.strictEqual(ClockProviderEntity.validate({}), false);
    return;
  },
  'real-provider-invalid-options': (scenarioCase) => {
    if (scenarioCase.shape !== 'real-provider-invalid-options') { throw RuntimeError.create('unreachable: expected real-provider-invalid-options shape'); }
    const { expected, input } = scenarioCase;
    assert.throws(() => {
      RealTimeClockProvider.create(materializeRealTimeClockProviderOptions(input.realProviderOptions));
    }, { message: expected.message });
    return;
  },
  'virtual-provider-invalid-counter': (scenarioCase) => {
    if (scenarioCase.shape !== 'virtual-provider-invalid-counter') { throw RuntimeError.create('unreachable: expected virtual-provider-invalid-counter shape'); }
    assert.strictEqual(VirtualTimeCounterEntity.validate({}), false);
    return;
  },
  'counter-invalid-options': (scenarioCase) => {
    if (scenarioCase.shape !== 'counter-invalid-options') { throw RuntimeError.create('unreachable: expected counter-invalid-options shape'); }
    const { expected, input } = scenarioCase;
    assert.throws(() => {
      VirtualTimeCounter.create(materializeVirtualTimeCounterOptions(input.counterOptions));
    }, { message: expected.message });
    return;
  },
  'clock-error-with-cause': (_scenarioCase) => {
    const cause = RuntimeError.create('boom');
    const error = new ClockError('clock failed', cause);
    assert.strictEqual(error.message, 'clock failed');
    assert.strictEqual(error.cause, cause);
    return;
  },

  'now-monotonic-same-instance': (scenarioCase) => {
    if (scenarioCase.shape !== 'now-monotonic-same-instance') { throw RuntimeError.create('unreachable: expected now-monotonic-same-instance shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'hrtime-monotonic-same-instance') { throw RuntimeError.create('unreachable: expected hrtime-monotonic-same-instance shape'); }
    const { expected, input } = scenarioCase;
    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    const first = clock.hrtime();
    counter.advance(input.advanceMs);
    const second = clock.hrtime();
    assert.equal(first <= second, expected.monotonic);
    return;
  },

  'two-instances-independent': (scenarioCase) => {
    if (scenarioCase.shape !== 'two-instances-independent') { throw RuntimeError.create('unreachable: expected two-instances-independent shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'clamp-backwards-provider-values') { throw RuntimeError.create('unreachable: expected clamp-backwards-provider-values shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'virtual-advance-reflected') { throw RuntimeError.create('unreachable: expected virtual-advance-reflected shape'); }
    const { expected, input } = scenarioCase;
    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    counter.advance(input.advanceMs);
    assert.strictEqual(clock.now(), expected.now);
    return;
  },

  'hooked-clock-on-now': (scenarioCase) => {
    if (scenarioCase.shape !== 'hooked-clock-on-now') { throw RuntimeError.create('unreachable: expected hooked-clock-on-now shape'); }
    const { expected, input } = scenarioCase;
    class HookedClock extends Clock {
      public static override create(provider: ClockProviderInterface): HookedClock {
        return new HookedClock(provider);
      }
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
    if (scenarioCase.shape !== 'hooked-clock-on-now-clamped') { throw RuntimeError.create('unreachable: expected hooked-clock-on-now-clamped shape'); }
    const { expected, input } = scenarioCase;
    class HookedClock extends Clock {
      public static override create(provider: ClockProviderInterface): HookedClock {
        return new HookedClock(provider);
      }
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
    if (scenarioCase.shape !== 'hooked-clock-on-now-advanced') { throw RuntimeError.create('unreachable: expected hooked-clock-on-now-advanced shape'); }
    const { expected, input } = scenarioCase;
    class HookedClock extends Clock {
      public static override create(provider: ClockProviderInterface): HookedClock {
        return new HookedClock(provider);
      }
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
    if (scenarioCase.shape !== 'hooked-clock-on-hrtime') { throw RuntimeError.create('unreachable: expected hooked-clock-on-hrtime shape'); }
    const { expected, input } = scenarioCase;
    class HookedClock extends Clock {
      public static override create(provider: ClockProviderInterface): HookedClock {
        return new HookedClock(provider);
      }
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
    if (scenarioCase.shape !== 'hooked-clock-on-hrtime-repeat') { throw RuntimeError.create('unreachable: expected hooked-clock-on-hrtime-repeat shape'); }
    const { expected, input } = scenarioCase;
    class HookedClock extends Clock {
      public static override create(provider: ClockProviderInterface): HookedClock {
        return new HookedClock(provider);
      }
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
    if (scenarioCase.shape !== 'clock-async-on-now-rejection-contained') { throw RuntimeError.create('unreachable: expected clock-async-on-now-rejection-contained shape'); }
    const { expected, input } = scenarioCase;
    class AsyncRejectingNowClock extends Clock {
      public static override create(provider: ClockProviderInterface): AsyncRejectingNowClock {
        return new AsyncRejectingNowClock(provider);
      }
      protected override async onNow(_timestamp: number): Promise<void> {
        await Promise.resolve();
        throw RuntimeError.create(input.message);
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
    if (scenarioCase.shape !== 'real-provider-on-now') { throw RuntimeError.create('unreachable: expected real-provider-on-now shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'real-provider-on-now-offset') { throw RuntimeError.create('unreachable: expected real-provider-on-now-offset shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'real-provider-on-hrtime') { throw RuntimeError.create('unreachable: expected real-provider-on-hrtime shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'real-provider-default-options') { throw RuntimeError.create('unreachable: expected real-provider-default-options shape'); }
    const { input } = scenarioCase;
    const before = Date.now();
    const provider = createRealTimeClockProvider(input.realProviderOptions);
    const value = provider.now();
    const after = Date.now();
    assert.strictEqual(value >= before - 10, true);
    assert.strictEqual(value <= after + 10, true);
    return;
  },

  'virtual-provider-on-now': (scenarioCase) => {
    if (scenarioCase.shape !== 'virtual-provider-on-now') { throw RuntimeError.create('unreachable: expected virtual-provider-on-now shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'virtual-provider-on-now-advance') { throw RuntimeError.create('unreachable: expected virtual-provider-on-now-advance shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'virtual-provider-on-hrtime') { throw RuntimeError.create('unreachable: expected virtual-provider-on-hrtime shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'virtual-counter-default-options') { throw RuntimeError.create('unreachable: expected virtual-counter-default-options shape'); }
    const { input } = scenarioCase;
    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = VirtualClockProvider.create(counter);
    assert.strictEqual(provider.now(), 0);
    assert.strictEqual(counter.nowMs(), 0);
    return;
  },

  'real-provider-throws-on-now': (scenarioCase) => {
    if (scenarioCase.shape !== 'real-provider-throws-on-now') { throw RuntimeError.create('unreachable: expected real-provider-throws-on-now shape'); }
    const { expected, input } = scenarioCase;
    class ThrowingRealNowProvider extends RealTimeClockProvider {
      public constructor(options: Parameters<typeof RealTimeClockProvider.create>[0] = {}) { super(RealTimeClockProviderOptionsEntity.intake(options)); }
      protected override onNow(): void { throw RuntimeError.create('provider onNow boom'); }
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
    if (scenarioCase.shape !== 'real-provider-throws-on-hrtime') { throw RuntimeError.create('unreachable: expected real-provider-throws-on-hrtime shape'); }
    const { expected, input } = scenarioCase;
    class ThrowingRealHrtimeProvider extends RealTimeClockProvider {
      public constructor(options: Parameters<typeof RealTimeClockProvider.create>[0] = {}) { super(RealTimeClockProviderOptionsEntity.intake(options)); }
      protected override onHrtime(): void { throw RuntimeError.create('provider onHrtime boom'); }
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
    if (scenarioCase.shape !== 'virtual-provider-throws-on-now') { throw RuntimeError.create('unreachable: expected virtual-provider-throws-on-now shape'); }
    const { expected, input } = scenarioCase;
    class ThrowingVirtualNowProvider extends VirtualClockProvider {
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
      protected override onNow(): void { throw RuntimeError.create('virtual provider onNow boom'); }
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
    if (scenarioCase.shape !== 'virtual-provider-throws-on-hrtime') { throw RuntimeError.create('unreachable: expected virtual-provider-throws-on-hrtime shape'); }
    const { expected, input } = scenarioCase;
    class ThrowingVirtualHrtimeProvider extends VirtualClockProvider {
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
      protected override onHrtime(): void { throw RuntimeError.create('virtual provider onHrtime boom'); }
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
    if (scenarioCase.shape !== 'counter-on-advance') { throw RuntimeError.create('unreachable: expected counter-on-advance shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'counter-on-advance-suppressed') { throw RuntimeError.create('unreachable: expected counter-on-advance-suppressed shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'counter-on-advance-sequence') { throw RuntimeError.create('unreachable: expected counter-on-advance-sequence shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'counter-on-now-ms') { throw RuntimeError.create('unreachable: expected counter-on-now-ms shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'counter-on-now-ms-repeat') { throw RuntimeError.create('unreachable: expected counter-on-now-ms-repeat shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'clock-throws-on-now') { throw RuntimeError.create('unreachable: expected clock-throws-on-now shape'); }
    const { input } = scenarioCase;
    class ThrowingNowClock extends Clock {
      public constructor(provider: ClockProviderInterface) { super(provider); }
      protected override onNow(): void { throw RuntimeError.create('onNow boom'); }
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
    if (scenarioCase.shape !== 'clock-throws-on-hrtime') { throw RuntimeError.create('unreachable: expected clock-throws-on-hrtime shape'); }
    const { input } = scenarioCase;
    class ThrowingHrtimeClock extends Clock {
      public constructor(provider: ClockProviderInterface) { super(provider); }
      protected override onHrtime(): void { throw RuntimeError.create('onHrtime boom'); }
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
    if (scenarioCase.shape !== 'counter-throws-on-advance') { throw RuntimeError.create('unreachable: expected counter-throws-on-advance shape'); }
    const { input } = scenarioCase;
    class ThrowingAdvanceCounter extends VirtualTimeCounter {
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(VirtualTimeCounterOptionsEntity.intake(options)); }
      protected override onAdvance(): void { throw RuntimeError.create('onAdvance boom'); }
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
    if (scenarioCase.shape !== 'counter-throws-on-now-ms') { throw RuntimeError.create('unreachable: expected counter-throws-on-now-ms shape'); }
    const { input } = scenarioCase;
    class ThrowingNowMsCounter extends VirtualTimeCounter {
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(VirtualTimeCounterOptionsEntity.intake(options)); }
      protected override onNowMs(): void { throw RuntimeError.create('onNowMs boom'); }
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
    if (scenarioCase.shape !== 'metered-clock-now') { throw RuntimeError.create('unreachable: expected metered-clock-now shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'metered-clock-hrtime') { throw RuntimeError.create('unreachable: expected metered-clock-hrtime shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'offset-provider-now') { throw RuntimeError.create('unreachable: expected offset-provider-now shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'offset-provider-offset') { throw RuntimeError.create('unreachable: expected offset-provider-offset shape'); }
    const { expected, input } = scenarioCase;
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
    if (scenarioCase.shape !== 'traced-virtual-provider-now') { throw RuntimeError.create('unreachable: expected traced-virtual-provider-now shape'); }
    const { expected, input } = scenarioCase;
    const counter = createVirtualTimeCounter(input.counterOptions);
    counter.advance(input.virtualMs - counter.nowMs());
    const provider = VirtualClockProvider.create(counter);
    assert.strictEqual(provider.now(), expected.now);
    return;
  },

  'traced-virtual-provider-hrtime': (scenarioCase) => {
    if (scenarioCase.shape !== 'traced-virtual-provider-hrtime') { throw RuntimeError.create('unreachable: expected traced-virtual-provider-hrtime shape'); }
    const { expected, input } = scenarioCase;
    const counter = createVirtualTimeCounter(input.counterOptions);
    counter.advance(input.virtualMs - counter.nowMs());
    const provider = VirtualClockProvider.create(counter);
    assert.strictEqual(provider.hrtime(), BigInt(expected.hrtime));
    return;
  },

  'long-uptime-precision': (scenarioCase) => {
    if (scenarioCase.shape !== 'long-uptime-precision') { throw RuntimeError.create('unreachable: expected long-uptime-precision shape'); }
    const { expected, input } = scenarioCase;
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

function runCase(scenarioCase: ClockScenarioCaseEntity.Type): Promise<void> | void {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Clock', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
