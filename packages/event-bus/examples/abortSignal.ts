/** abortSignal — AbortSignal lifecycle: the subscription signal aborts on unsubscribe/close. Run: npx tsx examples/abortSignal.ts */

import assert from 'node:assert/strict';

// #region usage
import { EventBus } from '../src/index.js';

type AppEvents = {
  'ping': string;
};

const bus = EventBus.create<AppEvents>();
const controller = new AbortController();

const received: string[] = [];
const abortedDuringDelivery: boolean[] = [];

bus.subscribe('ping', (payload, signal) => {
  // The signal is the subscription lifecycle signal — check it to bail out of
  // long-running async work early, or pass it to fetch()/setTimeout() etc.
  if (signal.aborted) { return; }
  received.push(payload);

  // Register a listener so in-flight async work can react to teardown.
  signal.addEventListener('abort', () => {
    abortedDuringDelivery.push(true);
  }, { 'once': true });
}, { 'signal': controller.signal });

await bus.publish('ping', 'first');
await bus.drain();

console.log('Received before abort:', received);

// Abort the subscriber — its signal aborts and it will no longer receive events.
controller.abort();

await bus.publish('ping', 'second');
await bus.drain();

console.log('Received after abort:', received);
// #endregion usage

assert.equal(received.length, 1, 'should have received first ping');
assert.equal(received[0], 'first');
assert.equal(abortedDuringDelivery.length, 1, 'abort listener should have fired once on teardown');

await bus.close();

console.log('abortSignal: all assertions passed');
