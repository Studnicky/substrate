import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import { Clock } from '../../src/clock/Clock.js';
import { RealTimeClockProvider } from '../../src/clock/RealTimeClockProvider.js';
import { VirtualClockProvider } from '../../src/clock/VirtualClockProvider.js';
import { VirtualTimeCounter } from '../../src/clock/VirtualTimeCounter.js';
import type { ClockProviderInterface } from '../../src/interfaces/ClockProviderInterface.js';
import { RealTimeClockProviderOptionsEntity } from '../../src/entities/RealTimeClockProviderOptionsEntity.js';
import { ClockError } from '../../src/errors/ClockError.js';
import scenarioGroups from './Clock.scenarios.json';

type ScenarioCase =
  | { advanceMs: number; description: string; expectedNow: number; kind: 'now-returns'; startMs: number }
  | { description: string; expectedNs: string; kind: 'hrtime-returns'; startMs: number }
  | { description: string; kind: 'real-hrtime-positive'; offsetMs: number }
  | { description: string; kind: 'real-now-within-range'; offsetMs: number }
  | { description: string; expectedMessage: string; kind: 'offset-invalid'; offsetMs: 'NaN' | 'Infinity' | '-Infinity' }
  | { description: string; expectedMessage: string; kind: 'clock-invalid-provider' }
  | { description: string; expectedMessage: string; kind: 'real-provider-invalid-options' }
  | { description: string; expectedMessage: string; kind: 'virtual-provider-invalid-counter' }
  | { description: string; expectedMessage: string; kind: 'counter-invalid-options' }
  | { description: string; kind: 'clock-error-with-cause' }
  | { description: string; kind: 'now-monotonic-same-instance' }
  | { description: string; kind: 'hrtime-monotonic-same-instance' }
  | { description: string; kind: 'two-instances-independent' }
  | { description: string; kind: 'clamp-backwards-provider-values' }
  | { description: string; kind: 'virtual-advance-reflected' }
  | { description: string; kind: 'hooked-clock-on-now' }
  | { description: string; kind: 'hooked-clock-on-now-clamped' }
  | { description: string; kind: 'hooked-clock-on-now-advanced' }
  | { description: string; kind: 'hooked-clock-on-hrtime' }
  | { description: string; kind: 'hooked-clock-on-hrtime-repeat' }
  | { description: string; kind: 'clock-async-on-now-rejection-contained' }
  | { description: string; kind: 'real-provider-on-now' }
  | { description: string; kind: 'real-provider-on-now-offset' }
  | { description: string; kind: 'real-provider-on-hrtime' }
  | { description: string; kind: 'real-provider-default-options' }
  | { description: string; kind: 'virtual-provider-on-now' }
  | { description: string; kind: 'virtual-provider-on-now-advance' }
  | { description: string; kind: 'virtual-provider-on-hrtime' }
  | { description: string; kind: 'virtual-counter-default-options' }
  | { description: string; kind: 'real-provider-throws-on-now' }
  | { description: string; kind: 'real-provider-throws-on-hrtime' }
  | { description: string; kind: 'virtual-provider-throws-on-now' }
  | { description: string; kind: 'virtual-provider-throws-on-hrtime' }
  | { description: string; kind: 'counter-on-advance' }
  | { description: string; kind: 'counter-on-advance-suppressed' }
  | { description: string; kind: 'counter-on-advance-sequence' }
  | { description: string; kind: 'counter-on-now-ms' }
  | { description: string; kind: 'counter-on-now-ms-repeat' }
  | { description: string; kind: 'clock-throws-on-now' }
  | { description: string; kind: 'clock-throws-on-hrtime' }
  | { description: string; kind: 'counter-throws-on-advance' }
  | { description: string; kind: 'counter-throws-on-now-ms' }
  | { description: string; kind: 'metered-clock-now' }
  | { description: string; kind: 'metered-clock-hrtime' }
  | { description: string; kind: 'offset-provider-now' }
  | { description: string; kind: 'offset-provider-offset' }
  | { description: string; kind: 'traced-virtual-provider-now' }
  | { description: string; kind: 'traced-virtual-provider-hrtime' }
  | { description: string; kind: 'long-uptime-precision' };

const NS_PER_MS = 1_000_000n;
const ZERO_NS = 0n;

type RuntimeNumberKind = 'infinity' | 'nan' | 'negative-infinity';
type RuntimeNumberInput = number | { kind: RuntimeNumberKind };
type RealTimeClockProviderOptionsInput = {
  kind: 'default' | 'options';
  value?: {
    offsetMs?: RuntimeNumberInput;
  };
};
type VirtualTimeCounterOptionsInput = {
  kind: 'default' | 'options';
  value?: {
    startMs?: RuntimeNumberInput;
  };
};
type ObjectFixtureInput = {
  kind: 'empty-object';
};

const runtimeNumberByKind = {
  'infinity': () => Number.POSITIVE_INFINITY,
  'nan': () => Number.NaN,
  'negative-infinity': () => Number.NEGATIVE_INFINITY
} satisfies Record<RuntimeNumberKind, () => number>;

function materializeRuntimeNumber(input: RuntimeNumberInput): number {
  return typeof input === 'number' ? input : runtimeNumberByKind[input.kind]();
}

const realTimeClockProviderOptionsByKind = {
  'default': () => undefined,
  'options': (input: RealTimeClockProviderOptionsInput) => {
    const offsetMs = input.value?.offsetMs;
    return offsetMs === undefined ? {} : { offsetMs: materializeRuntimeNumber(offsetMs) };
  }
} satisfies Record<
  RealTimeClockProviderOptionsInput['kind'],
  (input: RealTimeClockProviderOptionsInput) => Parameters<typeof RealTimeClockProvider.create>[0]
>;

function materializeRealTimeClockProviderOptions(
  input: RealTimeClockProviderOptionsInput
): Parameters<typeof RealTimeClockProvider.create>[0] {
  return realTimeClockProviderOptionsByKind[input.kind](input);
}

const virtualTimeCounterOptionsByKind = {
  'default': () => undefined,
  'options': (input: VirtualTimeCounterOptionsInput) => {
    const startMs = input.value?.startMs;
    return startMs === undefined ? {} : { startMs: materializeRuntimeNumber(startMs) };
  }
} satisfies Record<
  VirtualTimeCounterOptionsInput['kind'],
  (input: VirtualTimeCounterOptionsInput) => Parameters<typeof VirtualTimeCounter.create>[0]
>;

function materializeVirtualTimeCounterOptions(
  input: VirtualTimeCounterOptionsInput
): Parameters<typeof VirtualTimeCounter.create>[0] {
  return virtualTimeCounterOptionsByKind[input.kind](input);
}

const objectFixtureByKind = {
  'empty-object': () => ({})
} satisfies Record<ObjectFixtureInput['kind'], () => Record<string, never>>;

function materializeObjectFixture(input: ObjectFixtureInput): Record<string, never> {
  return objectFixtureByKind[input.kind]();
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

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

const runnerMap: Record<ScenarioCase['kind'], ScenarioRunner> = {
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
    const provider = createRealTimeClockProvider(input.realProviderOptions);
    assert.strictEqual(provider.hrtime() > ZERO_NS, expected.positive);
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
    const { input } = scenarioCase as ScenarioCase & {
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    const first = clock.now();
    counter.advance(input.advanceMs);
    const second = clock.now();
    counter.advance(0);
    const third = clock.now();
    assert.ok(first <= second);
    assert.ok(second <= third);
    return;
  },

  'hrtime-monotonic-same-instance': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    const first = clock.hrtime();
    counter.advance(input.advanceMs);
    const second = clock.hrtime();
    assert.ok(first <= second);
    return;
  },

  'two-instances-independent': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
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
    return;
  },

  'clamp-backwards-provider-values': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: {
        lowerCounterOptions: VirtualTimeCounterOptionsInput;
        counterOptions: VirtualTimeCounterOptionsInput;
      };
    };
    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = Clock.create(VirtualClockProvider.create(counter));
    const first = clock.now();
    const lowerCounter = createVirtualTimeCounter(input.lowerCounterOptions);
    const clockLower = Clock.create(VirtualClockProvider.create(lowerCounter));
    const lowerFirst = clockLower.now();
    const second = clockLower.now();
    assert.ok(first >= 0);
    assert.ok(lowerFirst >= 0);
    assert.ok(second >= lowerFirst);
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
    const clock = new HookedClock(VirtualClockProvider.create(counter));
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
    const clock = new HookedClock(VirtualClockProvider.create(counter));
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
    const clock = new HookedClock(VirtualClockProvider.create(counter));
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
    const clock = new HookedClock(VirtualClockProvider.create(counter));
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
    const clock = new HookedClock(VirtualClockProvider.create(counter));
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
    const clock = new AsyncRejectingNowClock(VirtualClockProvider.create(counter));
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);
    return (async () => {
      try {
        const result = clock.now();
        assert.strictEqual(result, expected.result);
        await new Promise((resolve) => { setImmediate(resolve); });
        await new Promise((resolve) => { setImmediate(resolve); });
        assert.strictEqual(rejectionEvents.length, expected.unhandledRejections);
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
      public constructor(options: RealTimeClockProviderOptionsEntity.Type = {}) { super(options); }
      protected override readRawMs(): number { return input.rawMs; }
      protected override readRawHrtimeMs(): number { return input.rawMs; }
      protected override onNow(timestamp: number): void { this.nowEvents.push(timestamp); }
      protected override onHrtime(value: bigint): void { this.hrtimeEvents.push(value); }
    }

    const provider = new HookedRealProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
    const result = provider.now();
    assert.deepStrictEqual(provider.nowEvents, expected.nowEvents);
    assert.strictEqual(result, expected.result);
    return;
  },

  'real-provider-on-now-offset': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { nowEvents: number[]; result: number };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class HookedRealProvider extends RealTimeClockProvider {
      readonly nowEvents: number[] = [];
      public constructor(options: RealTimeClockProviderOptionsEntity.Type = {}) { super(options); }
      protected override readRawMs(): number { return input.rawMs; }
      protected override onNow(timestamp: number): void { this.nowEvents.push(timestamp); }
    }

    const provider = new HookedRealProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
    provider.now();
    assert.deepStrictEqual(provider.nowEvents, expected.nowEvents);
    return;
  },

  'real-provider-on-hrtime': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hrtimeEvents: bigint[]; result: bigint };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class HookedRealProvider extends RealTimeClockProvider {
      readonly hrtimeEvents: bigint[] = [];
      public constructor(options: RealTimeClockProviderOptionsEntity.Type = {}) { super(options); }
      protected override readRawHrtimeMs(): number { return input.rawMs; }
      protected override onHrtime(value: bigint): void { this.hrtimeEvents.push(value); }
    }

    const provider = new HookedRealProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
    const result = provider.hrtime();
    assert.deepStrictEqual(provider.hrtimeEvents.map((value) => Number(value)), expected.hrtimeEvents.map(Number));
    assert.strictEqual(result, BigInt(String(expected.result)));
    return;
  },

  'real-provider-default-options': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { realProviderOptions: RealTimeClockProviderOptionsInput };
    };
    const provider = createRealTimeClockProvider(input.realProviderOptions);
    assert.strictEqual(provider.now() <= Date.now() + 10, true);
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
    const { input } = scenarioCase as ScenarioCase & {
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class ThrowingRealNowProvider extends RealTimeClockProvider {
      public constructor(options: RealTimeClockProviderOptionsEntity.Type = {}) { super(options); }
      protected override readRawMs(): number { return input.rawMs; }
      protected override onNow(): void { throw new Error('provider onNow boom'); }
    }

    const provider = new ThrowingRealNowProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
    assert.throws(() => { provider.now(); }, (thrown: unknown) => {
      assert.ok(thrown instanceof HookInvocationError);
      assert.strictEqual(thrown.hookName, 'onNow');
      assert.ok(thrown.cause instanceof Error);
      assert.strictEqual((thrown.cause as Error).message, 'provider onNow boom');
      return true;
    });
    return;
  },

  'real-provider-throws-on-hrtime': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class ThrowingRealHrtimeProvider extends RealTimeClockProvider {
      public constructor(options: RealTimeClockProviderOptionsEntity.Type = {}) { super(options); }
      protected override readRawHrtimeMs(): number { return input.rawMs; }
      protected override onHrtime(): void { throw new Error('provider onHrtime boom'); }
    }

    const provider = new ThrowingRealHrtimeProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
    assert.throws(() => { provider.hrtime(); }, (thrown: unknown) => {
      assert.ok(thrown instanceof HookInvocationError);
      assert.strictEqual(thrown.hookName, 'onHrtime');
      return true;
    });
    return;
  },

  'virtual-provider-throws-on-now': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class ThrowingVirtualNowProvider extends VirtualClockProvider {
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
      protected override onNow(): void { throw new Error('virtual provider onNow boom'); }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = new ThrowingVirtualNowProvider(counter);
    assert.throws(() => { provider.now(); }, (thrown: unknown) => {
      assert.ok(thrown instanceof HookInvocationError);
      assert.strictEqual(thrown.hookName, 'onNow');
      return true;
    });
    return;
  },

  'virtual-provider-throws-on-hrtime': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { counterOptions: VirtualTimeCounterOptionsInput };
    };
    class ThrowingVirtualHrtimeProvider extends VirtualClockProvider {
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
      protected override onHrtime(): void { throw new Error('virtual provider onHrtime boom'); }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = new ThrowingVirtualHrtimeProvider(counter);
    assert.throws(() => { provider.hrtime(); }, (thrown: unknown) => {
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
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(options ?? {}); }
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
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(options ?? {}); }
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
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(options ?? {}); }
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
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(options ?? {}); }
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
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(options ?? {}); }
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
    assert.throws(() => { clock.now(); }, (thrown: unknown) => {
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
    assert.throws(() => { clock.hrtime(); }, (thrown: unknown) => {
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
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(options ?? {}); }
      protected override onAdvance(): void { throw new Error('onAdvance boom'); }
    }

    const counter = new ThrowingAdvanceCounter(materializeVirtualTimeCounterOptions(input.counterOptions));
    assert.throws(() => { counter.advance(input.advanceMs); }, (thrown: unknown) => {
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
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(options ?? {}); }
      protected override onNowMs(): void { throw new Error('onNowMs boom'); }
    }

    const counter = new ThrowingNowMsCounter(materializeVirtualTimeCounterOptions(input.counterOptions));
    assert.throws(() => { counter.nowMs(); }, (thrown: unknown) => {
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
    class MeteredClock extends Clock {
      #nowCallCount = 0;
      #hrtimeCallCount = 0;
      public constructor(provider: ClockProviderInterface) { super(provider); }
      public get nowCallCount(): number { return this.#nowCallCount; }
      public get hrtimeCallCount(): number { return this.#hrtimeCallCount; }
      protected override readNow(): number {
        this.#nowCallCount += 1;
        return super.readNow();
      }
      protected override readHrtime(): bigint {
        this.#hrtimeCallCount += 1;
        return super.readHrtime();
      }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = new MeteredClock(VirtualClockProvider.create(counter));
    const first = clock.now();
    assert.strictEqual(first, expected.now);
    counter.advance(input.advanceMs);
    const second = clock.now();
    assert.ok(clock.nowCallCount > 0);
    assert.strictEqual(clock.nowCallCount, 2);
    assert.ok(first <= second);
    return;
  },

  'metered-clock-hrtime': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hrtime: string };
      input: { advanceMs: number; counterOptions: VirtualTimeCounterOptionsInput };
    };
    class MeteredClock extends Clock {
      #nowCallCount = 0;
      #hrtimeCallCount = 0;
      public constructor(provider: ClockProviderInterface) { super(provider); }
      public get nowCallCount(): number { return this.#nowCallCount; }
      public get hrtimeCallCount(): number { return this.#hrtimeCallCount; }
      protected override readNow(): number {
        this.#nowCallCount += 1;
        return super.readNow();
      }
      protected override readHrtime(): bigint {
        this.#hrtimeCallCount += 1;
        return super.readHrtime();
      }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const clock = new MeteredClock(VirtualClockProvider.create(counter));
    assert.strictEqual(clock.hrtime(), BigInt(expected.hrtime));
    counter.advance(input.advanceMs);
    clock.hrtime();
    assert.ok(clock.hrtimeCallCount > 0);
    assert.strictEqual(clock.hrtimeCallCount, 2);
    return;
  },

  'offset-provider-now': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { now: number };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class OffsetRealTimeClockProvider extends RealTimeClockProvider {
      public constructor(options: RealTimeClockProviderOptionsEntity.Type = {}) { super(options); }
      protected override readRawMs(): number { return input.rawMs; }
    }

    const provider = new OffsetRealTimeClockProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
    assert.strictEqual(provider.now(), expected.now);
    return;
  },

  'offset-provider-offset': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { now: number };
      input: { realProviderOptions: RealTimeClockProviderOptionsInput; rawMs: number };
    };
    class OffsetRealTimeClockProvider extends RealTimeClockProvider {
      public constructor(options: RealTimeClockProviderOptionsEntity.Type = {}) { super(options); }
      protected override readRawMs(): number { return input.rawMs; }
    }

    const provider = new OffsetRealTimeClockProvider(materializeRealTimeClockProviderOptions(input.realProviderOptions));
    assert.strictEqual(provider.now(), expected.now);
    return;
  },

  'traced-virtual-provider-now': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { now: number };
      input: { counterOptions: VirtualTimeCounterOptionsInput; virtualMs: number };
    };
    class TracedVirtualClockProvider extends VirtualClockProvider {
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
      protected override readVirtualMs(): number { return input.virtualMs; }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = new TracedVirtualClockProvider(counter);
    assert.strictEqual(provider.now(), expected.now);
    return;
  },

  'traced-virtual-provider-hrtime': (scenarioCase) => {
    const { expected, input } = scenarioCase as ScenarioCase & {
      expected: { hrtime: string };
      input: { counterOptions: VirtualTimeCounterOptionsInput; virtualMs: number };
    };
    class TracedVirtualClockProvider extends VirtualClockProvider {
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
      protected override readVirtualMs(): number { return input.virtualMs; }
    }

    const counter = createVirtualTimeCounter(input.counterOptions);
    const provider = new TracedVirtualClockProvider(counter);
    assert.strictEqual(provider.hrtime(), BigInt(expected.hrtime));
    return;
  },

  'long-uptime-precision': (scenarioCase) => {
    const { input } = scenarioCase as ScenarioCase & {
      input: { rawMs: number; realProviderOptions: RealTimeClockProviderOptionsInput };
    };
    class LongUptimeRealTimeClockProvider extends RealTimeClockProvider {
      public constructor(options: RealTimeClockProviderOptionsEntity.Type = {}) { super(options); }
      protected override readRawHrtimeMs(): number { return input.rawMs; }
    }

    const provider = new LongUptimeRealTimeClockProvider(
      materializeRealTimeClockProviderOptions(input.realProviderOptions)
    );
    const wholeMs = Math.trunc(input.rawMs);
    const fractionalMs = input.rawMs - wholeMs;
    const expectedNs = BigInt(wholeMs) * NS_PER_MS + BigInt(Math.round(fractionalMs * Number(NS_PER_MS)));
    const lossyNs = BigInt(Math.round(input.rawMs * Number(NS_PER_MS)));
    const result = provider.hrtime();
    assert.strictEqual(result, expectedNs);
    assert.notStrictEqual(result, lossyNs);
    return;
  }
};

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  return runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('Clock', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
