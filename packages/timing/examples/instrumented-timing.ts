/** instrumented-timing — subclass Timing to intercept events via the onEvent hook for test assertions, metrics export, or structured logging. Run: npx tsx examples/instrumented-timing.ts */

import assert from 'node:assert/strict';

// #region usage
import { Timing, TimingEvent } from '../src/index.js';

class InstrumentedTiming extends Timing {
  readonly fired: string[] = [];

  protected override onEvent(data: { 'event': string }): void {
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

console.log('fired:', timing.fired);
// #endregion usage

// fired array captures event names in recording order
assert.equal(timing.fired.length, 2);
assert.equal(timing.fired[0], 'GraphAdapter.query');
assert.equal(timing.fired[1], 'AuthService.verify');

console.log('instrumented-timing: all assertions passed');
