/**
 * EventBus Unit Tests
 *
 * Tests typed multi-topic pub/sub:
 * - publish() delivers to all subscribers on a topic
 * - subscribe() returns unsubscribe fn that stops delivery
 * - multiple subscribers on same topic receive independently
 * - different topics are isolated
 * - close() stops all delivery
 */

import { deepStrictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EventBus } from '../../src/EventBus.js';

interface TestTopics {
  ping: string;
  count: number;
}

void describe('EventBus', () => {
  void it('publish() delivers payload to all subscribers on the topic', async () => {
    const bus = EventBus.create<TestTopics>();
    const received: string[] = [];

    bus.subscribe('ping', async (payload) => { received.push(payload); });

    await bus.publish('ping', 'hello');
    await bus.drain();

    deepStrictEqual(received, ['hello']);
    await bus.close();
  });

  void it('unsubscribe fn stops delivery to that subscriber', async () => {
    const bus = EventBus.create<TestTopics>();
    const received: string[] = [];

    const unsub = bus.subscribe('ping', async (payload) => { received.push(payload); });

    await bus.publish('ping', 'first');
    await bus.drain();

    unsub();

    await bus.publish('ping', 'second');
    await bus.drain();

    deepStrictEqual(received, ['first'], 'Only first message should be received');
    await bus.close();
  });

  void it('multiple subscribers on the same topic each receive the payload independently', async () => {
    const bus = EventBus.create<TestTopics>();
    const receivedA: string[] = [];
    const receivedB: string[] = [];

    bus.subscribe('ping', async (payload) => { receivedA.push(payload); });
    bus.subscribe('ping', async (payload) => { receivedB.push(payload); });

    await bus.publish('ping', 'broadcast');
    await bus.drain();

    deepStrictEqual(receivedA, ['broadcast']);
    deepStrictEqual(receivedB, ['broadcast']);
    await bus.close();
  });

  void it('different topics are isolated from each other', async () => {
    const bus = EventBus.create<TestTopics>();
    const pings: string[] = [];
    const counts: number[] = [];

    bus.subscribe('ping', async (payload) => { pings.push(payload); });
    bus.subscribe('count', async (payload) => { counts.push(payload); });

    await bus.publish('ping', 'pong');
    await bus.publish('count', 42);
    await bus.drain();

    deepStrictEqual(pings, ['pong']);
    deepStrictEqual(counts, [42]);
    await bus.close();
  });

  void it('close() stops all delivery across all topics', async () => {
    const bus = EventBus.create<TestTopics>();
    const received: string[] = [];

    bus.subscribe('ping', async (payload) => { received.push(payload); });

    await bus.publish('ping', 'before-close');
    await bus.drain();
    await bus.close();

    // Publish after close — should be a no-op since the subscriber queue is aborted
    await bus.publish('ping', 'after-close');
    // Allow any pending microtasks to settle
    await Promise.resolve();
    await Promise.resolve();

    deepStrictEqual(received, ['before-close'], 'No messages should arrive after close()');
  });
});
