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
import { VirtualClockProvider } from '../../src/clock/VirtualClockProvider.js';
import { VirtualTimeCounter } from '../../src/clock/VirtualTimeCounter.js';
import type { Scenario } from '../helpers/Scenario.js';
import { ScenarioRunner } from '../helpers/runScenarios.js';

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
  const counter = new VirtualTimeCounter(input.startMs);
  const clock = new Clock(new VirtualClockProvider(counter));

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
  const counter = new VirtualTimeCounter(input.startMs);
  const clock = new Clock(new VirtualClockProvider(counter));

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
  const provider = new RealTimeClockProvider(input.offsetMs);

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
  const clock = new Clock(new RealTimeClockProvider(input.offsetMs));
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
  new RealTimeClockProvider(input.offsetMs);
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
      const counter = new VirtualTimeCounter(START_MS_C);
      const clock = new Clock(new VirtualClockProvider(counter));
      const first = clock.now();

      counter.advance(ADVANCE_50);
      const second = clock.now();

      counter.advance(0);
      const third = clock.now();

      assert.ok(first <= second, 'first <= second');
      assert.ok(second <= third, 'second <= third');
    });

    void it('hrtime() is monotonically non-decreasing — same instance', () => {
      const counter = new VirtualTimeCounter(START_MS_C);
      const clock = new Clock(new VirtualClockProvider(counter));
      const first = clock.hrtime();

      counter.advance(1);
      const second = clock.hrtime();

      assert.ok(first <= second);
    });

    void it('two instances with the same provider track monotonicity independently', () => {
      const counter = new VirtualTimeCounter(START_MS_B);
      const provider = new VirtualClockProvider(counter);
      const clockA = new Clock(provider);
      const clockB = new Clock(provider);

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
      const counter = new VirtualTimeCounter(START_MS_B);
      const clock = new Clock(new VirtualClockProvider(counter));

      const first = clock.now();

      const lowerCounter = new VirtualTimeCounter(START_MS_A);
      const clockLower = new Clock(new VirtualClockProvider(lowerCounter));
      const lowerFirst = clockLower.now();

      const second = clockLower.now();

      assert.ok(first >= 0, 'first clock: value non-negative');
      assert.ok(lowerFirst >= 0, 'lower clock: value non-negative');
      assert.ok(second >= lowerFirst, 'lower clock: does not decrease');
    });

    void it('VirtualClockProvider advance is reflected in subsequent now() calls', () => {
      const counter = new VirtualTimeCounter(0);
      const clock = new Clock(new VirtualClockProvider(counter));

      counter.advance(START_MS_A);
      const value = clock.now();

      assert.equal(value, START_MS_A);
    });
  });

  void describe('unhappy path', () => {
    ScenarioRunner.run('RealTimeClockProvider offsetMs validation', offsetErrorScenarios, execOffsetConstruct);

    void it('per-instance monotonicity: two clocks from same provider are independent', () => {
      const counter = new VirtualTimeCounter(START_MS_A);
      const provider = new VirtualClockProvider(counter);
      const clockFast = new Clock(provider);
      const clockSlow = new Clock(provider);

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

  void describe('subclass extension seams', () => {
    // -------------------------------------------------------------------------
    // MeteredClock — instruments readNow() and readHrtime()
    // -------------------------------------------------------------------------

    class MeteredClock extends Clock {
      #nowCallCount = 0;
      #hrtimeCallCount = 0;

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
      const counter = new VirtualTimeCounter(START_MS_A);
      const clock = new MeteredClock(new VirtualClockProvider(counter));

      const first = clock.now();
      counter.advance(ADVANCE_50);
      const second = clock.now();

      assert.ok(clock.nowCallCount > 0, 'readNow() was called at least once');
      assert.equal(clock.nowCallCount, 2, 'readNow() called once per now() invocation');
      assert.ok(first <= second, 'monotonicity holds after subclass override');
    });

    void it('MeteredClock.readHrtime() intercepts hrtime() calls', () => {
      const counter = new VirtualTimeCounter(START_MS_A);
      const clock = new MeteredClock(new VirtualClockProvider(counter));

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
      protected override readRawMs(): number {
        return FIXED_RAW_MS;
      }
    }

    void it('OffsetRealTimeClockProvider.now() returns fixed raw value when offset is zero', () => {
      const provider = new OffsetRealTimeClockProvider(0);

      assert.equal(provider.now(), FIXED_RAW_MS, 'now() uses overridden readRawMs()');
    });

    void it('OffsetRealTimeClockProvider.offsetMs getter is accessible to subclass', () => {
      const provider = new OffsetRealTimeClockProvider(ADVANCE_50);

      assert.equal(provider.now(), FIXED_RAW_MS + ADVANCE_50, 'offsetMs accessor applied correctly');
    });

    // -------------------------------------------------------------------------
    // TracedVirtualClockProvider — replaces readVirtualMs() source
    // -------------------------------------------------------------------------

    const FIXED_VIRTUAL_MS = 9000;
    const EXPECTED_VIRTUAL_NS = BigInt(FIXED_VIRTUAL_MS) * NS_PER_MS;

    class TracedVirtualClockProvider extends VirtualClockProvider {
      protected override readVirtualMs(): number {
        return FIXED_VIRTUAL_MS;
      }
    }

    void it('TracedVirtualClockProvider.now() returns fixed virtual ms', () => {
      const counter = new VirtualTimeCounter(0);
      const provider = new TracedVirtualClockProvider(counter);

      assert.equal(provider.now(), FIXED_VIRTUAL_MS, 'now() uses overridden readVirtualMs()');
    });

    void it('TracedVirtualClockProvider.hrtime() returns fixed virtual ns', () => {
      const counter = new VirtualTimeCounter(0);
      const provider = new TracedVirtualClockProvider(counter);

      assert.equal(provider.hrtime(), EXPECTED_VIRTUAL_NS, 'hrtime() uses overridden readVirtualMs()');
    });
  });
});
