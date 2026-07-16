/** multiSubscriber — multiple subscribers on the same topic all receive the payload; unsubscribe removes one. Run: npx tsx examples/multiSubscriber.ts */

import assert from 'node:assert/strict';

import type { OrderPlacementEventMapEntity } from './entities/OrderPlacementEventMapEntity.js';

// #region usage
import { EventBus } from '../src/index.js';
import { MultiSubscriberFixture } from './fixtures/MultiSubscriberFixture.js';

const bus = EventBus.create<OrderPlacementEventMapEntity.Type>();

const unsubscribeA = bus.subscribe('order:placed', (payload) => {
  MultiSubscriberFixture.receivedA.push(payload.orderId);
});

bus.subscribe('order:placed', (payload) => {
  MultiSubscriberFixture.receivedB.push(payload.orderId);
});

// Both handlers receive the first event
await bus.publish('order:placed', { 'orderId': 'order-1' });
await bus.drain();

console.log('After first publish — A:', MultiSubscriberFixture.receivedA, 'B:', MultiSubscriberFixture.receivedB);

// Unsubscribe handler A — only B receives subsequent events
unsubscribeA();

await bus.publish('order:placed', { 'orderId': 'order-2' });
await bus.drain();

console.log('After unsubscribe + second publish — A:', MultiSubscriberFixture.receivedA, 'B:', MultiSubscriberFixture.receivedB);
// #endregion usage

assert.equal(MultiSubscriberFixture.receivedA.length, 1, 'handler A should have received first event');
assert.equal(MultiSubscriberFixture.receivedB.length, 2, 'handler B should have received both events');
assert.equal(MultiSubscriberFixture.receivedA[0], 'order-1');
assert.equal(MultiSubscriberFixture.receivedB[0], 'order-1');
assert.equal(MultiSubscriberFixture.receivedB[1], 'order-2');

await bus.close();

console.log('multiSubscriber: all assertions passed');
