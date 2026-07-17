/** observedClock — trace every now/hrtime/advance read via protected hook overrides. Run: npx tsx examples/observedClock.ts */

import assert from 'node:assert/strict';

// #region usage
import {
  Clock,
  VirtualClockProvider,
  VirtualTimeCounter
} from '../src/index.js';

class TracedCounter extends VirtualTimeCounter {
  public constructor(options: Parameters<typeof VirtualTimeCounter.create>[0] = {}) {
    super(options ?? {});
  }

  protected override onAdvance(deltaMs: number, nowMs: number): void {
    console.log(`[clock] counter.advance  delta=${deltaMs}ms  nowMs=${nowMs}ms`);
  }

  protected override onNowMs(value: number): void {
    console.log(`[clock] counter.nowMs    value=${value}ms`);
  }
}

class TracedVirtualProvider extends VirtualClockProvider {
  public constructor(counter: Readonly<VirtualTimeCounter>) {
    super(counter);
  }

  protected override onNow(timestamp: number): void {
    console.log(`[clock] provider.now     timestamp=${timestamp}ms`);
  }

  protected override onHrtime(value: bigint): void {
    console.log(`[clock] provider.hrtime  value=${value}ns`);
  }
}

class TracedClock extends Clock {
  public constructor(provider: VirtualClockProvider) {
    super(provider);
  }

  protected override onNow(timestamp: number): void {
    console.log(`[clock] clock.now        timestamp=${timestamp}ms`);
  }

  protected override onHrtime(value: bigint): void {
    console.log(`[clock] clock.hrtime     value=${value}ns`);
  }
}

class ObservedClockExample {
  static run(): void {
    // Capture events for assertion
    const advanceEvents: { 'deltaMs': number; 'nowMs': number }[] = [];
    const nowMsEvents: number[] = [];
    const providerNowEvents: number[] = [];
    const clockNowEvents: number[] = [];
    const clockHrtimeEvents: bigint[] = [];

    class RecordingCounter extends TracedCounter {
      protected override onAdvance(deltaMs: number, nowMs: number): void {
        super.onAdvance(deltaMs, nowMs);
        advanceEvents.push({ 'deltaMs': deltaMs, 'nowMs': nowMs });
      }

      protected override onNowMs(value: number): void {
        super.onNowMs(value);
        nowMsEvents.push(value);
      }
    }

    class RecordingProvider extends TracedVirtualProvider {
      protected override onNow(timestamp: number): void {
        super.onNow(timestamp);
        providerNowEvents.push(timestamp);
      }
    }

    class RecordingClock extends TracedClock {
      protected override onNow(timestamp: number): void {
        super.onNow(timestamp);
        clockNowEvents.push(timestamp);
      }

      protected override onHrtime(value: bigint): void {
        super.onHrtime(value);
        clockHrtimeEvents.push(value);
      }
    }

    console.log('--- scenario: advance then read ---');

    const counter = new RecordingCounter({ 'startMs': 1000 });
    const provider = new RecordingProvider(counter);
    const clock = new RecordingClock(provider);

    const t0 = clock.now();
    counter.advance(500);
    const t1 = clock.now();
    counter.advance(250);
    const t2 = clock.now();
    const h0 = clock.hrtime();

    console.log(`\nReturned values: t0=${t0} t1=${t1} t2=${t2} h0=${h0}n`);

    // Assertions
    assert.equal(clockNowEvents.length, 3, 'clock.onNow fires 3 times');
    assert.equal(clockNowEvents[0], 1000, 'first now is 1000');
    assert.equal(clockNowEvents[1], 1500, 'second now is 1500 after +500');
    assert.equal(clockNowEvents[2], 1750, 'third now is 1750 after +250');

    assert.equal(clockHrtimeEvents.length, 1, 'clock.onHrtime fires once');
    assert.equal(clockHrtimeEvents[0], 1750n * 1_000_000n, 'hrtime matches final nowMs in ns');

    assert.equal(advanceEvents.length, 2, 'counter.onAdvance fires twice');
    assert.equal(advanceEvents[0]!.deltaMs, 500);
    assert.equal(advanceEvents[0]!.nowMs, 1500);
    assert.equal(advanceEvents[1]!.deltaMs, 250);
    assert.equal(advanceEvents[1]!.nowMs, 1750);

    assert.equal(providerNowEvents.length, 3, 'provider.onNow fires 3 times');

    console.log('\nobservedClock: all assertions passed');
  }
}

ObservedClockExample.run();
// #endregion usage
