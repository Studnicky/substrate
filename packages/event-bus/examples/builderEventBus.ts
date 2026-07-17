/** builderEventBus — constructs an EventBus via EventBus.builder().build() and exercises subscribe/publish/drain/close. Run: npx tsx examples/builderEventBus.ts */

import assert from 'node:assert/strict';

import type { OrderLifecycleEventMapEntity } from './entities/OrderLifecycleEventMapEntity.js';

// #region usage
import { EventBus } from '../src/index.js';

// Build an EventBus using the fluent builder
const bus = EventBus.builder<OrderLifecycleEventMapEntity.Type>().build();

console.log('EventBus built.');

const received: { 'payload': unknown; 'topic': string; }[] = [];

// Subscribe to both topics
bus.subscribe('order:placed', (payload) => {
  console.log(`[handler] order:placed id=${payload.id} total=${payload.total}`);
  received.push({ 'payload': payload, 'topic': 'order:placed' });
});

bus.subscribe('order:shipped', (payload) => {
  console.log(`[handler] order:shipped id=${payload.id} carrier=${payload.carrier}`);
  received.push({ 'payload': payload, 'topic': 'order:shipped' });
});

// Publish events
await bus.publish('order:placed', { 'id': 'ORD-1', 'total': 149 });
await bus.publish('order:shipped', { 'carrier': 'FedEx', 'id': 'ORD-1' });
await bus.publish('order:placed', { 'id': 'ORD-2', 'total': 29 });

await bus.drain();

console.log('Events received:', received.length);
for (const { payload, topic } of received) {
  console.log(` - ${topic}:`, payload);
}

await bus.close();
// #endregion usage

assert.equal(received.length, 3, 'All 3 published events received');
assert.equal(received[0]?.topic, 'order:placed');
assert.equal(received[1]?.topic, 'order:shipped');
assert.equal(received[2]?.topic, 'order:placed');

console.log('builderEventBus: all assertions passed');
