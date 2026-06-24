/** abortSignal — AbortSignal lifecycle: when signal aborts, subscriber stops receiving events. Run: npx tsx examples/abortSignal.ts */

import assert from 'node:assert/strict';

// #region usage
import { EventBus } from '../src/index.js';

type AppEvents = {
  'ping': string;
};

const bus = EventBus.create<AppEvents>();
const controller = new AbortController();

const received: string[] = [];

bus.subscribe('ping', (payload) => {
  received.push(payload);
}, { 'signal': controller.signal });

await bus.publish('ping', 'first');
await bus.drain();

console.log('Received before abort:', received);

// Abort the subscriber — it will no longer receive events
controller.abort();

await bus.publish('ping', 'second');
await bus.drain();

console.log('Received after abort:', received);
// #endregion usage

assert.equal(received.length, 1, 'should have received first ping');
assert.equal(received[0], 'first');
assert.equal(received.length, 1, 'aborted subscriber should not receive second ping');

await bus.close();

console.log('abortSignal: all assertions passed');
