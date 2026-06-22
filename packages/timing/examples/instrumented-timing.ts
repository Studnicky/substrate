// Demonstrates subclassing Timing to intercept events via the onEvent hook —
// useful for test assertions, metrics export, or structured logging.
// Run: npx tsx packages/timing/examples/instrumented-timing.ts

import assert from 'node:assert/strict';

import { Timing, TimingEvent } from '../src/index.js';

class InstrumentedTiming extends Timing {
  readonly fired: string[] = [];

  protected override onEvent(data: { event: string }): void {
    this.fired.push(data.event);
  }

  static of(): InstrumentedTiming {
    return new InstrumentedTiming({});
  }
}

const timing = InstrumentedTiming.of();

timing.event(
  TimingEvent.create().component('GraphAdapter').operation('query').build()
);

timing.event(
  TimingEvent.create().component('AuthService').operation('verify').build()
);

// fired array captures event names in recording order
assert.equal(timing.fired.length, 2);
assert.equal(timing.fired[0], 'GraphAdapter.query');
assert.equal(timing.fired[1], 'AuthService.verify');

console.log('fired:', timing.fired);
