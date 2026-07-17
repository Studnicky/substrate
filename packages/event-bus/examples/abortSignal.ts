/** abortSignal — AbortSignal lifecycle: the subscription signal aborts on unsubscribe/close. Run: npx tsx examples/abortSignal.ts */

import assert from 'node:assert/strict';

import type { PingEventMapEntity } from './entities/PingEventMapEntity.js';

// #region usage
import { EventBus } from '../src/index.js';
import { AbortSignalFixture } from './fixtures/AbortSignalFixture.js';

const bus = EventBus.create<PingEventMapEntity.Type>();
const controller = new AbortController();

bus.subscribe('ping', (payload, signal) => {
  // The signal is the subscription lifecycle signal — check it to bail out of
  // long-running async work early, or pass it to fetch()/setTimeout() etc.
  if (signal.aborted) { return; }
  AbortSignalFixture.received.push(payload);

  // Register a listener so in-flight async work can react to teardown.
  signal.addEventListener('abort', () => {
    AbortSignalFixture.abortedDuringDelivery.push(true);
  }, { 'once': true });
}, { 'signal': controller.signal });

await bus.publish('ping', 'first');
await bus.drain();

console.log('Received before abort:', AbortSignalFixture.received);

// Abort the subscriber — its signal aborts and it will no longer receive events.
controller.abort();

await bus.publish('ping', 'second');
await bus.drain();

console.log('Received after abort:', AbortSignalFixture.received);
// #endregion usage

assert.equal(AbortSignalFixture.received.length, 1, 'should have received first ping');
assert.equal(AbortSignalFixture.received[0], 'first');
assert.equal(AbortSignalFixture.abortedDuringDelivery.length, 1, 'abort listener should have fired once on teardown');

await bus.close();

console.log('abortSignal: all assertions passed');
