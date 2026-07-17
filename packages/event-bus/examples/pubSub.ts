/** pubSub — basic pub/sub: subscribe to a topic, publish a payload, assert handler received it. Run: npx tsx examples/pubSub.ts */

import assert from 'node:assert/strict';

import type { UserCreatedEventMapEntity } from './entities/UserCreatedEventMapEntity.js';

// #region usage
import { EventBus } from '../src/index.js';

const bus = EventBus.create<UserCreatedEventMapEntity.Type>();

const received: { 'email': string; 'id': string; }[] = [];

bus.subscribe('user:created', (payload) => {
  received.push(payload);
});

await bus.publish('user:created', { 'email': 'a@example.com', 'id': '1' });
await bus.drain();

console.log('Received:', received);
// #endregion usage

assert.equal(received.length, 1);
assert.equal(received[0]!.id, '1');
assert.equal(received[0]!.email, 'a@example.com');

await bus.close();

console.log('pubSub: all assertions passed');
