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
import { it } from 'node:test';

import { EventBus } from '../../src/EventBus.js';

interface TestTopics {
  ping: string;
  count: number;
}

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

void it('handler receives an AbortSignal as second argument that is not aborted during normal delivery', async () => {
  const bus = EventBus.create<TestTopics>();
  let capturedSignal: AbortSignal | undefined;

  bus.subscribe('ping', (payload, signal) => {
    capturedSignal = signal;
  });

  await bus.publish('ping', 'hello');
  await bus.drain();

  deepStrictEqual(capturedSignal instanceof AbortSignal, true, 'signal should be an AbortSignal');
  deepStrictEqual(capturedSignal?.aborted, false, 'signal should not be aborted during normal delivery');
  await bus.close();
});

void it('captured subscription signal is aborted after unsubscribe()', async () => {
  const bus = EventBus.create<TestTopics>();
  let capturedSignal: AbortSignal | undefined;

  const unsub = bus.subscribe('ping', (payload, signal) => {
    capturedSignal = signal;
  });

  await bus.publish('ping', 'first');
  await bus.drain();

  deepStrictEqual(capturedSignal?.aborted, false, 'signal should not be aborted before unsubscribe');
  unsub();
  deepStrictEqual(capturedSignal?.aborted, true, 'signal should be aborted after unsubscribe');
  await bus.close();
});

void it('captured subscription signal is aborted after bus.close()', async () => {
  const bus = EventBus.create<TestTopics>();
  let capturedSignal: AbortSignal | undefined;

  bus.subscribe('ping', (payload, signal) => {
    capturedSignal = signal;
  });

  await bus.publish('ping', 'hello');
  await bus.drain();

  deepStrictEqual(capturedSignal?.aborted, false, 'signal should not be aborted before close');
  await bus.close();
  deepStrictEqual(capturedSignal?.aborted, true, 'signal should be aborted after bus.close()');
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
