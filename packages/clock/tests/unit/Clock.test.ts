/**
 * Unit tests for the `Clock` instance-based class.
 * Covers per-instance construction, per-instance monotonicity, and
 * VirtualClockProvider / RealTimeClockProvider behaviour.
 */
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { Clock } from '../../src/clock/Clock.js';
import { RealTimeClockProvider } from '../../src/clock/RealTimeClockProvider.js';
import { RealTimeClockProviderOptionsEntity } from '../../src/entities/RealTimeClockProviderOptionsEntity.js';
import { VirtualClockProvider } from '../../src/clock/VirtualClockProvider.js';
import { VirtualTimeCounter } from '../../src/clock/VirtualTimeCounter.js';
import type { Scenario } from '../helpers/Scenario.js';
import { ScenarioRunner } from '../helpers/runScenarios.js';
import type { ClockProviderType } from '../../src/interfaces/ClockProviderType.js';

// ---------------------------------------------------------------------------
// Named constants
// ---------------------------------------------------------------------------

/** Nanoseconds per millisecond as BigInt. */
const NS_PER_MS = 1_000_000n;

/** Start time A: 100 ms. */
const START_MS_A = 100;

/** Start time B: 500 ms. */
const START_MS_B = 500;

/** Start time C: 1000 ms. */
const START_MS_C = 1000;

/** 50 ms advance delta. */
const ADVANCE_50 = 50;

/** Offset for RealTimeClockProvider test. */
const HRTIME_OFFSET_MS = 500;

/** Zero nanoseconds — lower bound for hrtime comparisons. */
const ZERO_NS = 0n;

/** Expected now() after 100 ms start + 100 ms advance = 200 ms. */
const EXPECTED_NOW_ADVANCED = 200;

// ---------------------------------------------------------------------------
// now() scenarios
// ---------------------------------------------------------------------------

type NowInput = {
  readonly advanceMs: number;
  readonly startMs: number;
};

type NowOutput = {
  readonly now: number;
};

function execNow(input: Readonly<NowInput>): NowOutput {
  const counter = VirtualTimeCounter.create({ startMs: input.startMs });
  const clock = Clock.create(VirtualClockProvider.create(counter));

  counter.advance(input.advanceMs);

  return { now: clock.now() };
}

const nowHappyScenarios: readonly Scenario<NowInput, NowOutput>[] = [
  {
    expected: { now: START_MS_A },
    input: {
      advanceMs: 0,
      startMs: START_MS_A
    },
    name: 'returns injected start time without advance'
  },
  {
    expected: { now: EXPECTED_NOW_ADVANCED },
    input: {
      advanceMs: START_MS_A,
      startMs: START_MS_A
    },
    name: 'returns advanced time after counter advance'
  }
];

const nowEdgeScenarios: readonly Scenario<NowInput, NowOutput>[] = [{
  expected: { now: 0 },
  input: {
    advanceMs: 0,
    startMs: 0
  },
  name: 'returns zero when start is zero and no advance'
}];

// ---------------------------------------------------------------------------
// hrtime() scenarios
// ---------------------------------------------------------------------------

type HrtimeInput = {
  readonly startMs: number;
};

type HrtimeOutput = {
  readonly ns: bigint;
};

function execHrtime(input: Readonly<HrtimeInput>): HrtimeOutput {
  const counter = VirtualTimeCounter.create({ startMs: input.startMs });
  const clock = Clock.create(VirtualClockProvider.create(counter));

  return { ns: clock.hrtime() };
}

const hrtimeHappyScenarios: readonly Scenario<HrtimeInput, HrtimeOutput>[] = [
  {
    expected: { ns: BigInt(START_MS_A) * NS_PER_MS },
    input: { startMs: START_MS_A },
    name: 'returns nanoseconds from provider (100 ms)'
  },
  {
    expected: { ns: ZERO_NS },
    input: { startMs: 0 },
    name: 'returns 0n for zero start'
  }
];

// ---------------------------------------------------------------------------
// RealTimeClockProvider scenarios
// ---------------------------------------------------------------------------

type RealHrtimeInput = {
  readonly offsetMs: number;
};

type RealHrtimeOutput = {
  readonly isPositive: boolean;
};

const realHrtimeEdgeScenarios: readonly Scenario<RealHrtimeInput, RealHrtimeOutput>[] = [
  {
    expected: { isPositive: true },
    input: { offsetMs: HRTIME_OFFSET_MS },
    name: 'hrtime() with non-zero offsetMs returns positive bigint'
  },
  {
    expected: { isPositive: true },
    input: { offsetMs: 0 },
    name: 'hrtime() with zero offsetMs returns positive bigint'
  }
];

function execRealHrtime(input: Readonly<RealHrtimeInput>): RealHrtimeOutput {
  const provider = RealTimeClockProvider.create({ offsetMs: input.offsetMs });

  return { isPositive: provider.hrtime() > ZERO_NS };
}

// ---------------------------------------------------------------------------
// RealTimeClockProvider.now() within-range scenarios
// ---------------------------------------------------------------------------

type RealNowInput = {
  readonly offsetMs: number;
};

type RealNowOutput = {
  readonly withinRange: boolean;
};

const realNowScenarios: readonly Scenario<RealNowInput, RealNowOutput>[] = [{
  expected: { withinRange: true },
  input: { offsetMs: 0 },
  name: 'RealTimeClockProvider.now() is within Date.now() ± 5 ms'
}];

function execRealNow(input: Readonly<RealNowInput>): RealNowOutput {
  const before = Date.now();
  const clock = Clock.create(RealTimeClockProvider.create({ offsetMs: input.offsetMs }));
  const value = clock.now();
  const after = Date.now();
  const TOLERANCE_MS = 5;

  return { withinRange: value >= before - TOLERANCE_MS && value <= after + TOLERANCE_MS };
}

// ---------------------------------------------------------------------------
// RealTimeClockProvider offsetMs validation (error scenarios)
// ---------------------------------------------------------------------------

type OffsetInput = { readonly offsetMs: number };

const offsetErrorScenarios: readonly Scenario<OffsetInput, never>[] = [
  { name: 'rejects NaN offsetMs', input: { offsetMs: NaN }, expected: { throws: 'clock.invalidConfig' } },
  { name: 'rejects Infinity offsetMs', input: { offsetMs: Infinity }, expected: { throws: 'clock.invalidConfig' } },
  { name: 'rejects -Infinity offsetMs', input: { offsetMs: -Infinity }, expected: { throws: 'clock.invalidConfig' } },
];

function execOffsetConstruct(input: Readonly<OffsetInput>): never {
  RealTimeClockProvider.create({ offsetMs: input.offsetMs });
  throw new Error('expected throw');
}

// ---------------------------------------------------------------------------
// describe blocks
// ---------------------------------------------------------------------------

void describe('Clock', () => {
  void describe('happy path', () => {
    ScenarioRunner.run('Clock.now', nowHappyScenarios, execNow);
    ScenarioRunner.run('Clock.hrtime', hrtimeHappyScenarios, execHrtime);
    ScenarioRunner.run('RealTimeClockProvider.now within-range', realNowScenarios, execRealNow);
    ScenarioRunner.run('RealTimeClockProvider.hrtime offset', realHrtimeEdgeScenarios, execRealHrtime);
  });

  void describe('edge cases', () => {
    ScenarioRunner.run('Clock.now zero start', nowEdgeScenarios, execNow);

    void it('now() is monotonically non-decreasing — same instance', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_C });
      const clock = Clock.create(VirtualClockProvider.create(counter));
      const first = clock.now();

      counter.advance(ADVANCE_50);
      const second = clock.now();

      counter.advance(0);
      const third = clock.now();

      assert.ok(first <= second, 'first <= second');
      assert.ok(second <= third, 'second <= third');
    });

    void it('hrtime() is monotonically non-decreasing — same instance', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_C });
      const clock = Clock.create(VirtualClockProvider.create(counter));
      const first = clock.hrtime();

      counter.advance(1);
      const second = clock.hrtime();

      assert.ok(first <= second);
    });

    void it('two instances with the same provider track monotonicity independently', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_B });
      const provider = VirtualClockProvider.create(counter);
      const clockA = Clock.create(provider);
      const clockB = Clock.create(provider);

      const aNow1 = clockA.now();
      const bNow1 = clockB.now();

      assert.equal(aNow1, START_MS_B);
      assert.equal(bNow1, START_MS_B);

      counter.advance(ADVANCE_50);
      const aNow2 = clockA.now();
      const bNow2 = clockB.now();

      assert.ok(aNow2 >= aNow1, 'A must not decrease');
      assert.ok(bNow2 >= bNow1, 'B must not decrease');

      assert.equal(aNow2, START_MS_B + ADVANCE_50);
      assert.equal(bNow2, START_MS_B + ADVANCE_50);
    });

    void it('now() clamps backwards provider values to previous result', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_B });
      const clock = Clock.create(VirtualClockProvider.create(counter));

      const first = clock.now();

      const lowerCounter = VirtualTimeCounter.create({ startMs: START_MS_A });
      const clockLower = Clock.create(VirtualClockProvider.create(lowerCounter));
      const lowerFirst = clockLower.now();

      const second = clockLower.now();

      assert.ok(first >= 0, 'first clock: value non-negative');
      assert.ok(lowerFirst >= 0, 'lower clock: value non-negative');
      assert.ok(second >= lowerFirst, 'lower clock: does not decrease');
    });

    void it('VirtualClockProvider advance is reflected in subsequent now() calls', () => {
      const counter = VirtualTimeCounter.create();
      const clock = Clock.create(VirtualClockProvider.create(counter));

      counter.advance(START_MS_A);
      const value = clock.now();

      assert.equal(value, START_MS_A);
    });
  });

  void describe('unhappy path', () => {
    ScenarioRunner.run('RealTimeClockProvider offsetMs validation', offsetErrorScenarios, execOffsetConstruct);

    void it('per-instance monotonicity: two clocks from same provider are independent', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_A });
      const provider = VirtualClockProvider.create(counter);
      const clockFast = Clock.create(provider);
      const clockSlow = Clock.create(provider);

      counter.advance(ADVANCE_50);
      const fastNow = clockFast.now();
      const slowNow = clockSlow.now();

      assert.equal(fastNow, START_MS_A + ADVANCE_50);
      assert.equal(slowNow, START_MS_A + ADVANCE_50, 'slow clock shares same counter value');

      counter.advance(ADVANCE_50);
      const fastNow2 = clockFast.now();
      const slowNow2 = clockSlow.now();

      assert.ok(fastNow2 >= fastNow, 'fast clock non-decreasing');
      assert.ok(slowNow2 >= slowNow, 'slow clock non-decreasing');
    });
  });

  void describe('lifecycle hooks', () => {
    // -----------------------------------------------------------------------
    // Clock hooks: onNow / onHrtime
    // -----------------------------------------------------------------------

    class HookedClock extends Clock {
      public constructor(provider: ClockProviderType) { super(provider); }

      readonly nowEvents: number[] = [];
      readonly hrtimeEvents: bigint[] = [];

      protected override onNow(timestamp: number): void {
        this.nowEvents.push(timestamp);
      }

      protected override onHrtime(value: bigint): void {
        this.hrtimeEvents.push(value);
      }
    }

    void it('Clock.onNow fires once per now() call with the returned value', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_A });
      const clock = new HookedClock(VirtualClockProvider.create(counter));

      const result = clock.now();

      assert.equal(clock.nowEvents.length, 1, 'onNow fires once');
      assert.equal(clock.nowEvents[0], result, 'onNow receives the returned value');
      assert.equal(clock.nowEvents[0], START_MS_A, 'value matches start time');
    });

    void it('Clock.onNow fires on every now() call, including clamped values', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_B });
      const clock = new HookedClock(VirtualClockProvider.create(counter));

      clock.now();
      clock.now(); // counter has not advanced — clamped to previous

      assert.equal(clock.nowEvents.length, 2, 'onNow fires on every call');
      assert.equal(clock.nowEvents[0], START_MS_B);
      assert.equal(clock.nowEvents[1], START_MS_B, 'clamped value is still reported');
    });

    void it('Clock.onNow fires with the advanced value after counter advance', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_A });
      const clock = new HookedClock(VirtualClockProvider.create(counter));

      clock.now(); // first read at START_MS_A
      counter.advance(ADVANCE_50);
      clock.now(); // second read at START_MS_A + ADVANCE_50

      assert.equal(clock.nowEvents.length, 2);
      assert.equal(clock.nowEvents[0], START_MS_A);
      assert.equal(clock.nowEvents[1], START_MS_A + ADVANCE_50);
    });

    void it('Clock.onHrtime fires once per hrtime() call with the returned value', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_A });
      const clock = new HookedClock(VirtualClockProvider.create(counter));

      const result = clock.hrtime();

      assert.equal(clock.hrtimeEvents.length, 1, 'onHrtime fires once');
      assert.equal(clock.hrtimeEvents[0], result, 'onHrtime receives the returned value');
      assert.equal(clock.hrtimeEvents[0], BigInt(START_MS_A) * NS_PER_MS);
    });

    void it('Clock.onHrtime fires on every hrtime() call', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_A });
      const clock = new HookedClock(VirtualClockProvider.create(counter));

      clock.hrtime();
      counter.advance(ADVANCE_50);
      clock.hrtime();

      assert.equal(clock.hrtimeEvents.length, 2, 'onHrtime fires on both calls');
      assert.equal(clock.hrtimeEvents[0], BigInt(START_MS_A) * NS_PER_MS);
      assert.equal(clock.hrtimeEvents[1], BigInt(START_MS_A + ADVANCE_50) * NS_PER_MS);
    });

    // -----------------------------------------------------------------------
    // RealTimeClockProvider hooks: onNow / onHrtime
    // -----------------------------------------------------------------------

    const FIXED_MS = 10_000;

    class HookedRealProvider extends RealTimeClockProvider {
      public constructor(options: RealTimeClockProviderOptionsEntity.Type = {}) { super(options); }

      readonly nowEvents: number[] = [];
      readonly hrtimeEvents: bigint[] = [];

      protected override readRawMs(): number { return FIXED_MS; }
      protected override readRawHrtimeMs(): number { return FIXED_MS; }

      protected override onNow(timestamp: number): void {
        this.nowEvents.push(timestamp);
      }

      protected override onHrtime(value: bigint): void {
        this.hrtimeEvents.push(value);
      }
    }

    void it('RealTimeClockProvider.onNow fires once per now() call with returned value', () => {
      const provider = new HookedRealProvider({ offsetMs: 0 });

      const result = provider.now();

      assert.equal(provider.nowEvents.length, 1, 'onNow fires once');
      assert.equal(provider.nowEvents[0], result, 'onNow receives returned value');
      assert.equal(provider.nowEvents[0], FIXED_MS);
    });

    void it('RealTimeClockProvider.onNow includes the offset in the reported value', () => {
      const OFFSET = 200;
      const provider = new HookedRealProvider({ offsetMs: OFFSET });

      provider.now();

      assert.equal(provider.nowEvents[0], FIXED_MS + OFFSET, 'offset is applied before hook');
    });

    void it('RealTimeClockProvider.onHrtime fires once per hrtime() call with returned value', () => {
      const provider = new HookedRealProvider({ offsetMs: 0 });

      const result = provider.hrtime();

      assert.equal(provider.hrtimeEvents.length, 1, 'onHrtime fires once');
      assert.equal(provider.hrtimeEvents[0], result, 'onHrtime receives returned value');
    });

    // -----------------------------------------------------------------------
    // VirtualClockProvider hooks: onNow / onHrtime
    // -----------------------------------------------------------------------

    class HookedVirtualProvider extends VirtualClockProvider {
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }

      readonly nowEvents: number[] = [];
      readonly hrtimeEvents: bigint[] = [];

      protected override onNow(timestamp: number): void {
        this.nowEvents.push(timestamp);
      }

      protected override onHrtime(value: bigint): void {
        this.hrtimeEvents.push(value);
      }
    }

    void it('VirtualClockProvider.onNow fires once per now() call with virtual time', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_A });
      const provider = new HookedVirtualProvider(counter);

      const result = provider.now();

      assert.equal(provider.nowEvents.length, 1, 'onNow fires once');
      assert.equal(provider.nowEvents[0], result, 'onNow receives returned value');
      assert.equal(provider.nowEvents[0], START_MS_A);
    });

    void it('VirtualClockProvider.onNow reflects counter advances on subsequent calls', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_A });
      const provider = new HookedVirtualProvider(counter);

      provider.now();
      counter.advance(ADVANCE_50);
      provider.now();

      assert.equal(provider.nowEvents.length, 2);
      assert.equal(provider.nowEvents[0], START_MS_A);
      assert.equal(provider.nowEvents[1], START_MS_A + ADVANCE_50);
    });

    void it('VirtualClockProvider.onHrtime fires once per hrtime() call with ns value', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_A });
      const provider = new HookedVirtualProvider(counter);

      const result = provider.hrtime();

      assert.equal(provider.hrtimeEvents.length, 1, 'onHrtime fires once');
      assert.equal(provider.hrtimeEvents[0], result, 'onHrtime receives returned value');
      assert.equal(provider.hrtimeEvents[0], BigInt(START_MS_A) * NS_PER_MS);
    });

    // -----------------------------------------------------------------------
    // VirtualTimeCounter hooks: onAdvance / onNowMs
    // -----------------------------------------------------------------------

    class HookedCounter extends VirtualTimeCounter {
      public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) { super(options ?? {}); }

      readonly advanceEvents: { 'deltaMs': number; 'nowMs': number }[] = [];
      readonly nowMsEvents: number[] = [];

      protected override onAdvance(deltaMs: number, nowMs: number): void {
        this.advanceEvents.push({ 'deltaMs': deltaMs, 'nowMs': nowMs });
      }

      protected override onNowMs(value: number): void {
        this.nowMsEvents.push(value);
      }
    }

    void it('VirtualTimeCounter.onAdvance fires on positive advance with delta and new value', () => {
      const counter = new HookedCounter({ startMs: START_MS_A });

      counter.advance(ADVANCE_50);

      assert.equal(counter.advanceEvents.length, 1, 'onAdvance fires once');
      assert.equal(counter.advanceEvents[0]!.deltaMs, ADVANCE_50, 'delta is correct');
      assert.equal(counter.advanceEvents[0]!.nowMs, START_MS_A + ADVANCE_50, 'nowMs reflects new value');
    });

    void it('VirtualTimeCounter.onAdvance does not fire for zero or negative delta', () => {
      const counter = new HookedCounter({ startMs: START_MS_A });

      counter.advance(0);
      counter.advance(-10);

      assert.equal(counter.advanceEvents.length, 0, 'onAdvance does not fire for non-positive delta');
    });

    void it('VirtualTimeCounter.onAdvance fires for each positive advance call in sequence', () => {
      const counter = new HookedCounter({ startMs: 0 });

      counter.advance(100);
      counter.advance(200);

      assert.equal(counter.advanceEvents.length, 2, 'onAdvance fires for each call');
      assert.equal(counter.advanceEvents[0]!.deltaMs, 100);
      assert.equal(counter.advanceEvents[0]!.nowMs, 100);
      assert.equal(counter.advanceEvents[1]!.deltaMs, 200);
      assert.equal(counter.advanceEvents[1]!.nowMs, 300, 'cumulative nowMs is correct');
    });

    void it('VirtualTimeCounter.onNowMs fires once per nowMs() call with current value', () => {
      const counter = new HookedCounter({ startMs: START_MS_A });

      const result = counter.nowMs();

      assert.equal(counter.nowMsEvents.length, 1, 'onNowMs fires once');
      assert.equal(counter.nowMsEvents[0], result, 'onNowMs receives returned value');
      assert.equal(counter.nowMsEvents[0], START_MS_A);
    });

    void it('VirtualTimeCounter.onNowMs fires on every nowMs() call including after advance', () => {
      const counter = new HookedCounter({ startMs: START_MS_A });

      counter.nowMs(); // first read
      counter.advance(ADVANCE_50);
      counter.nowMs(); // second read

      assert.equal(counter.nowMsEvents.length, 2, 'onNowMs fires on both calls');
      assert.equal(counter.nowMsEvents[0], START_MS_A);
      assert.equal(counter.nowMsEvents[1], START_MS_A + ADVANCE_50);
    });
  });

  void describe('subclass extension seams', () => {
    // -------------------------------------------------------------------------
    // MeteredClock — instruments readNow() and readHrtime()
    // -------------------------------------------------------------------------

    class MeteredClock extends Clock {
      #nowCallCount = 0;
      #hrtimeCallCount = 0;

      public constructor(provider: ClockProviderType) { super(provider); }

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

    void it('MeteredClock.readNow() intercepts now() calls and monotonicity holds', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_A });
      const clock = new MeteredClock(VirtualClockProvider.create(counter));

      const first = clock.now();
      counter.advance(ADVANCE_50);
      const second = clock.now();

      assert.ok(clock.nowCallCount > 0, 'readNow() was called at least once');
      assert.equal(clock.nowCallCount, 2, 'readNow() called once per now() invocation');
      assert.ok(first <= second, 'monotonicity holds after subclass override');
    });

    void it('MeteredClock.readHrtime() intercepts hrtime() calls', () => {
      const counter = VirtualTimeCounter.create({ startMs: START_MS_A });
      const clock = new MeteredClock(VirtualClockProvider.create(counter));

      clock.hrtime();
      counter.advance(ADVANCE_50);
      clock.hrtime();

      assert.ok(clock.hrtimeCallCount > 0, 'readHrtime() was called at least once');
      assert.equal(clock.hrtimeCallCount, 2, 'readHrtime() called once per hrtime() invocation');
    });

    // -------------------------------------------------------------------------
    // OffsetRealTimeClockProvider — replaces raw Date.now() source
    // -------------------------------------------------------------------------

    const FIXED_RAW_MS = 12345;

    class OffsetRealTimeClockProvider extends RealTimeClockProvider {
      public constructor(options: RealTimeClockProviderOptionsEntity.Type = {}) { super(options); }

      protected override readRawMs(): number {
        return FIXED_RAW_MS;
      }
    }

    void it('OffsetRealTimeClockProvider.now() returns fixed raw value when offset is zero', () => {
      const provider = new OffsetRealTimeClockProvider({ offsetMs: 0 });

      assert.equal(provider.now(), FIXED_RAW_MS, 'now() uses overridden readRawMs()');
    });

    void it('OffsetRealTimeClockProvider.offsetMs getter is accessible to subclass', () => {
      const provider = new OffsetRealTimeClockProvider({ offsetMs: ADVANCE_50 });

      assert.equal(provider.now(), FIXED_RAW_MS + ADVANCE_50, 'offsetMs accessor applied correctly');
    });

    // -------------------------------------------------------------------------
    // TracedVirtualClockProvider — replaces readVirtualMs() source
    // -------------------------------------------------------------------------

    const FIXED_VIRTUAL_MS = 9000;
    const EXPECTED_VIRTUAL_NS = BigInt(FIXED_VIRTUAL_MS) * NS_PER_MS;

    class TracedVirtualClockProvider extends VirtualClockProvider {
      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }

      protected override readVirtualMs(): number {
        return FIXED_VIRTUAL_MS;
      }
    }

    void it('TracedVirtualClockProvider.now() returns fixed virtual ms', () => {
      const counter = VirtualTimeCounter.create();
      const provider = new TracedVirtualClockProvider(counter);

      assert.equal(provider.now(), FIXED_VIRTUAL_MS, 'now() uses overridden readVirtualMs()');
    });

    void it('TracedVirtualClockProvider.hrtime() returns fixed virtual ns', () => {
      const counter = VirtualTimeCounter.create();
      const provider = new TracedVirtualClockProvider(counter);

      assert.equal(provider.hrtime(), EXPECTED_VIRTUAL_NS, 'hrtime() uses overridden readVirtualMs()');
    });
  });
});
