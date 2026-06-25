/** observedEventBus — trace every lifecycle stage with console.log overrides. Run: npx tsx examples/observedEventBus.ts */

import assert from 'node:assert/strict';

// #region usage
import { EventBus } from '../src/index.js';

type OrderEvents = {
  'order:created': { 'id': string; 'total': number };
  'order:updated': { 'id': string; 'status': string };
};

class TracedBus extends EventBus<OrderEvents> {
  static override create(): TracedBus {
    return new TracedBus();
  }

  readonly deliverLog: { 'payload': unknown; 'topic': string }[] = [];
  readonly dequeueLog: string[] = [];
  readonly disposeLog: number[] = [];
  readonly enqueueLog: string[] = [];
  readonly publishLog: { 'payload': unknown; 'topic': string }[] = [];
  readonly subscribeLog: string[] = [];
  readonly unsubscribeLog: string[] = [];

  protected override onDeliver<K extends keyof OrderEvents>(topic: K, payload: OrderEvents[K]): void {
    console.log(`[event-bus] deliver topic=${String(topic)} payload=${JSON.stringify(payload)}`);
    this.deliverLog.push({ 'payload': payload, 'topic': String(topic) });
  }
  protected override onDequeue<K extends keyof OrderEvents>(topic: K): void {
    console.log(`[event-bus] dequeue topic=${String(topic)}`);
    this.dequeueLog.push(String(topic));
  }
  protected override onDispose(): void {
    console.log('[event-bus] dispose');
    this.disposeLog.push(1);
  }
  protected override onEnqueue<K extends keyof OrderEvents>(topic: K): void {
    console.log(`[event-bus] enqueue topic=${String(topic)}`);
    this.enqueueLog.push(String(topic));
  }
  protected override onPublish<K extends keyof OrderEvents>(topic: K, payload: OrderEvents[K]): void {
    console.log(`[event-bus] publish topic=${String(topic)} payload=${JSON.stringify(payload)}`);
    this.publishLog.push({ 'payload': payload, 'topic': String(topic) });
  }
  protected override onSubscribe<K extends keyof OrderEvents>(topic: K): void {
    console.log(`[event-bus] subscribe topic=${String(topic)}`);
    this.subscribeLog.push(String(topic));
  }
  protected override onUnsubscribe<K extends keyof OrderEvents>(topic: K): void {
    console.log(`[event-bus] unsubscribe topic=${String(topic)}`);
    this.unsubscribeLog.push(String(topic));
  }
}

const bus = TracedBus.create();

// Subscribe two handlers to 'order:created', one to 'order:updated'
const unsub1 = bus.subscribe('order:created', (payload) => {
  console.log(`[handler-A] order:created id=${payload.id} total=${payload.total}`);
});
bus.subscribe('order:created', (payload) => {
  console.log(`[handler-B] order:created id=${payload.id}`);
});
bus.subscribe('order:updated', (payload) => {
  console.log(`[handler-C] order:updated id=${payload.id} status=${payload.status}`);
});

// Publish order:created twice, order:updated once
await bus.publish('order:created', { 'id': 'ord-1', 'total': 99 });
await bus.publish('order:created', { 'id': 'ord-2', 'total': 42 });
await bus.publish('order:updated', { 'id': 'ord-1', 'status': 'shipped' });
await bus.drain();

// Unsubscribe one handler
unsub1();

// Close bus
await bus.close();
// #endregion usage

// Assertions
assert.equal(bus.subscribeLog.length, 3, 'Three subscribes');
assert.equal(bus.publishLog.length, 3, 'Three publishes');
// 2 handlers × 2 order:created publishes = 4, plus 1 handler × 1 order:updated = 5 delivers
assert.equal(bus.deliverLog.length, 5, 'Five delivers total');
// 2 subscribers × 2 publishes + 1 × 1 = 5 enqueues
assert.equal(bus.enqueueLog.length, 5, 'Five enqueues');
assert.equal(bus.dequeueLog.length, 5, 'Five dequeues');
assert.equal(bus.unsubscribeLog.length, 1, 'One explicit unsubscribe');
assert.equal(bus.disposeLog.length, 1, 'One dispose');

console.log('observedEventBus: all assertions passed');
