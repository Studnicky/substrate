/** observedThrottle — subclass Throttle, override onAcquire and onRelease to collect telemetry, assert hooks fired. Run: npx tsx examples/observedThrottle.ts */

import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import { Throttle } from '../src/index.js';

// #region usage

class TelemetryThrottle extends Throttle {
  static override create(config?: Parameters<typeof Throttle.create>[0]): TelemetryThrottle {
    return new TelemetryThrottle(config);
  }

  readonly acquireEvents: { 'activeCount': number; 'queuedCount': number }[] = [];
  readonly releaseEvents: { 'activeCount': number; 'totalExecuted': number }[] = [];

  public constructor(config?: Parameters<typeof Throttle.create>[0]) {
    super(config);
  }

  protected override onAcquire(activeCount: number, queuedCount: number): void {
    this.acquireEvents.push({ 'activeCount': activeCount, 'queuedCount': queuedCount });
  }

  protected override onRelease(activeCount: number, totalExecuted: number): void {
    this.releaseEvents.push({ 'activeCount': activeCount, 'totalExecuted': totalExecuted });
  }
}

const throttle = TelemetryThrottle.create({ 'concurrencyLimit': 2 });

await Promise.all(
  [1, 2, 3].map((i) => {
    const result = throttle.execute(async () => {
      await setTimeout(1);
      return i;
    });
    return result;
  })
);

console.log('observedThrottle acquireEvents:', throttle.acquireEvents);
console.log('observedThrottle releaseEvents:', throttle.releaseEvents);
console.log('observedThrottle stats:', throttle.getStats());
// #endregion usage

// onAcquire fires only for immediately-acquired slots (activeCount < limit).
// With concurrencyLimit 2 and 3 ops, the first 2 acquire immediately; the 3rd queues.
assert.equal(throttle.acquireEvents.length, 2, 'Expected 2 immediate acquire events (third op was queued)');

// onRelease fires for each completed operation
assert.ok(throttle.releaseEvents.length >= 3, 'Expected at least 3 release events');

// All acquire events have positive activeCount
for (const event of throttle.acquireEvents) {
  assert.ok(event.activeCount > 0, 'activeCount must be > 0 at acquire');
}

// totalExecuted increments with each release
const lastRelease = throttle.releaseEvents.at(-1);
assert.ok(lastRelease !== undefined, 'Should have at least one release event');
assert.ok(lastRelease.totalExecuted >= 3, 'totalExecuted should be >= 3 after all ops complete');

console.log('observedThrottle: all assertions passed');
