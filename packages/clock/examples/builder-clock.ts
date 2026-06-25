/** builder-clock — construct Clock and VirtualClockProvider via the fluent builder API. Run: npx tsx packages/clock/examples/builder-clock.ts */
import assert from 'node:assert/strict';

import { Clock, VirtualClockProvider, VirtualTimeCounter } from '../src/index.js';

// #region usage
// Build a VirtualTimeCounter starting at epoch 1_000 ms.
const counter = VirtualTimeCounter.builder()
  .withStartMs(1_000)
  .build();

console.log('counter initial nowMs:', counter.nowMs());

// Build a VirtualClockProvider backed by that counter.
const provider = VirtualClockProvider.builder()
  .withCounter(counter)
  .build();

console.log('provider initial now():', provider.now());

// Build a Clock that delegates to the provider.
const clock = Clock.builder()
  .withProvider(provider)
  .build();

console.log('clock initial now():', clock.now());

// Advance the counter by 500 ms — Clock and provider see the change immediately.
counter.advance(500);
console.log('after advance(500) — counter.nowMs():', counter.nowMs());
console.log('after advance(500) — clock.now():', clock.now());
// #endregion usage

assert.equal(counter.nowMs(), 1_500);
assert.equal(provider.now(), 1_500);
assert.equal(clock.now(), 1_500);

console.log('builder-clock: all assertions passed');
