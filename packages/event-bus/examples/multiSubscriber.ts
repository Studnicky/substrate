/** multiSubscriber — multiple subscribers on the same topic all receive the payload; unsubscribe removes one. Run: npx tsx examples/multiSubscriber.ts */

import assert from 'node:assert/strict';

// #region usage
import { EventBus } from '../src/index.js';

type AppEvents = {
  'order:placed': { 'orderId': string };
};

const bus = EventBus.create<AppEvents>();

const receivedA: string[] = [];
const receivedB: string[] = [];

const unsubscribeA = bus.subscribe('order:placed', (payload) => {
  receivedA.push(payload.orderId);
});

bus.subscribe('order:placed', (payload) => {
  receivedB.push(payload.orderId);
});

// Both handlers receive the first event
await bus.publish('order:placed', { 'orderId': 'order-1' });
await bus.drain();

console.log('After first publish — A:', receivedA, 'B:', receivedB);

// Unsubscribe handler A — only B receives subsequent events
unsubscribeA();

await bus.publish('order:placed', { 'orderId': 'order-2' });
await bus.drain();

console.log('After unsubscribe + second publish — A:', receivedA, 'B:', receivedB);
// #endregion usage

assert.equal(receivedA.length, 1, 'handler A should have received first event');
assert.equal(receivedB.length, 2, 'handler B should have received both events');
assert.equal(receivedA[0], 'order-1');
assert.equal(receivedB[0], 'order-1');
assert.equal(receivedB[1], 'order-2');

await bus.close();

console.log('multiSubscriber: all assertions passed');
