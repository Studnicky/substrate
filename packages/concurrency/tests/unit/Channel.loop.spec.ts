import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import { Channel } from '../../src/Channel.js';
import { ChannelError } from '../../src/errors/ChannelError.js';
import scenarioGroups from './Channel.scenarios.json';

type ScenarioCase =
  | { description: string; expected: { items: readonly number[] }; input: { items: readonly number[]; key: string }; shape: 'buffered-publish'; name: string }
  | { description: string; expected: { items: readonly string[] }; input: { items: readonly string[]; key: string }; shape: 'live-subscribe'; name: string }
  | { description: string; expected: { items: readonly number[] }; input: { items: readonly number[]; key: string }; shape: 'close-terminates'; name: string }
  | { description: string; expected: { left: readonly string[]; right: readonly string[] }; input: { left: string; leftItem: string; key: string; right: string; rightItem: string }; shape: 'independent-keys'; name: string }
  | { description: string; expected: { items: readonly unknown[] }; input: { item: number; key: string }; shape: 'publish-after-close'; name: string }
  | { description: string; expected: { errorName: string }; input: { key: string }; shape: 'duplicate-subscribe'; name: string }
  | { description: string; expected: { entries: ReadonlyArray<{ item: string; key: string }>; count: number }; input: { items: readonly string[]; key: string }; shape: 'onEnqueue-hooks'; name: string }
  | { description: string; expected: { entries: ReadonlyArray<{ item: number; key: string }>; count: number }; input: { items: readonly number[]; key: string }; shape: 'onDequeue-hooks'; name: string }
  | { description: string; expected: { count: number; entry: { item: string; key: string } }; input: { item: string; key: string }; shape: 'onPublishDropped-hooks'; name: string }
  | { description: string; expected: { before: number; after: number }; input: Record<string, never>; shape: 'onClose-hooks'; name: string }
  | { description: string; expected: { items: readonly number[]; overflowCount: number }; input: { count: number; key: string }; shape: 'no-high-water-mark'; name: string }
  | { description: string; expected: { items: readonly number[]; overflowDepths: readonly number[] }; input: { channel: { highWaterMark: number }; items: readonly number[]; key: string }; shape: 'high-water-mark'; name: string }
  | { description: string; expected: { nextValue: number }; input: { first: number; key: string; second: number }; shape: 'enqueue-rollback'; name: string }
  | { description: string; expected: { errorName: string; item: number; key: string }; input: { item: number; key: string }; shape: 'dequeue-hook-error'; name: string }
  | { description: string; expected: { nextValue: number; rejectionCount: number }; input: { first: number; key: string; second: number }; shape: 'async-enqueue-hook'; name: string };

async function collectN<T>(gen: AsyncGenerator<T>, n: number): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) {
    items.push(item);
    if (items.length >= n) {
      break;
    }
  }
  return items;
}

class ObservedChannel<T> extends Channel<T> {
  readonly enqueueEvents: { 'key': string; 'item': T }[] = [];
  readonly dequeueEvents: { 'key': string; 'item': T }[] = [];
  readonly droppedEvents: { 'key': string; 'item': T }[] = [];
  closeCount = 0;

  protected override onEnqueue(key: string, item: T): void {
    this.enqueueEvents.push({ 'key': key, 'item': item });
  }
  protected override onDequeue(key: string, item: T): void {
    this.dequeueEvents.push({ 'key': key, 'item': item });
  }
  protected override onPublishDropped(key: string, item: T): void {
    this.droppedEvents.push({ 'key': key, 'item': item });
  }
  protected override onClose(): void {
    this.closeCount += 1;
  }
}

class OverflowChannel<T> extends Channel<T> {
  readonly overflowEvents: { 'key': string; 'depth': number }[] = [];
  protected override onOverflow(key: string, depth: number): void {
    this.overflowEvents.push({ 'key': key, 'depth': depth });
  }
}

const scenarioRunners: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'buffered-publish': async (scenarioCase) => {
    const input = scenarioCase.input as { items: readonly number[]; key: string };
    const expected = scenarioCase.expected as { items: readonly number[] };
    const ch = Channel.create<number>();
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    const items = await collectN(ch.subscribe(input.key), input.items.length);
    assert.deepEqual(items, expected.items);
  },

  'live-subscribe': async (scenarioCase) => {
    const input = scenarioCase.input as { items: readonly string[]; key: string };
    const expected = scenarioCase.expected as { items: readonly string[] };
    const ch = Channel.create<string>();
    const gen = ch.subscribe(input.key);
    const collected: string[] = [];
    const done = (async () => {
      for await (const item of gen) {
        collected.push(item);
        if (collected.length === input.items.length) {
          break;
        }
      }
    })();
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    await done;
    assert.deepEqual(collected, expected.items);
  },

  'close-terminates': async (scenarioCase) => {
    const input = scenarioCase.input as { items: readonly number[]; key: string };
    const expected = scenarioCase.expected as { items: readonly number[] };
    const ch = Channel.create<number>();
    const gen = ch.subscribe(input.key);
    const items: number[] = [];
    const done = (async () => {
      for await (const item of gen) {
        items.push(item);
      }
    })();
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    await ch.close();
    await done;
    assert.deepEqual(items, expected.items);
  },

  'independent-keys': async (scenarioCase) => {
    const input = scenarioCase.input as { left: string; leftItem: string; key: string; right: string; rightItem: string };
    const expected = scenarioCase.expected as { left: readonly string[]; right: readonly string[] };
    const ch = Channel.create<string>();
    await ch.publish(input.left, input.leftItem);
    await ch.publish(input.right, input.rightItem);
    const [left, right] = await Promise.all([collectN(ch.subscribe(input.left), 1), collectN(ch.subscribe(input.right), 1)]);
    assert.deepEqual(left, expected.left);
    assert.deepEqual(right, expected.right);
  },

  'publish-after-close': async (scenarioCase) => {
    const input = scenarioCase.input as { item: number; key: string };
    const expected = scenarioCase.expected as { items: readonly unknown[] };
    const ch = Channel.create<number>();
    await ch.close();
    await ch.publish(input.key, input.item);
    const items: number[] = [];
    for await (const item of ch.subscribe(input.key)) {
      items.push(item);
    }
    assert.deepEqual(items, expected.items);
  },

  'duplicate-subscribe': async (scenarioCase) => {
    const input = scenarioCase.input as { key: string };
    const expected = scenarioCase.expected as { errorName: string };
    const ch = Channel.create<string>();
    const subscriber = ch.subscribe(input.key);
    const active = subscriber.next();
    const duplicate = ch.subscribe(input.key);
    await assert.rejects(() => duplicate.next(), (error: unknown) => {
      assert.ok(error instanceof ChannelError);
      assert.equal(error.constructor.name, expected.errorName);
      return true;
    });
    await ch.close();
    await active;
    await subscriber.return(undefined);
  },

  'onEnqueue-hooks': async (scenarioCase) => {
    const input = scenarioCase.input as { items: readonly string[]; key: string };
    const expected = scenarioCase.expected as { count: number; entries: ReadonlyArray<{ item: string; key: string }> };
    const ch = new ObservedChannel<string>();
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    assert.equal(ch.enqueueEvents.length, expected.count);
    assert.deepEqual(ch.enqueueEvents, expected.entries);
  },

  'onDequeue-hooks': async (scenarioCase) => {
    const input = scenarioCase.input as { items: readonly number[]; key: string };
    const expected = scenarioCase.expected as { count: number; entries: ReadonlyArray<{ item: number; key: string }> };
    const ch = new ObservedChannel<number>();
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    await collectN(ch.subscribe(input.key), input.items.length);
    assert.equal(ch.dequeueEvents.length, expected.count);
    assert.deepEqual(ch.dequeueEvents, expected.entries);
  },

  'onPublishDropped-hooks': async (scenarioCase) => {
    const input = scenarioCase.input as { item: string; key: string };
    const expected = scenarioCase.expected as { count: number; entry: { item: string; key: string } };
    const ch = new ObservedChannel<string>();
    await ch.close();
    await ch.publish(input.key, input.item);
    assert.equal(ch.droppedEvents.length, expected.count);
    assert.deepEqual(ch.droppedEvents[0], expected.entry);
  },

  'onClose-hooks': async (scenarioCase) => {
    const input = scenarioCase.input as { before: number; after: number };
    const expected = scenarioCase.expected as { before: number; after: number };
    const ch = new ObservedChannel<string>();
    assert.equal(ch.closeCount, input.before);
    assert.equal(input.before, expected.before);
    await ch.close();
    assert.equal(ch.closeCount, input.after);
    assert.equal(input.after, expected.after);
  },

  'no-high-water-mark': async (scenarioCase) => {
    const input = scenarioCase.input as { count: number; key: string };
    const expected = scenarioCase.expected as { items: readonly number[]; overflowCount: number };
    const ch = new OverflowChannel<number>();
    for (let i = 0; i < input.count; i += 1) {
      await ch.publish(input.key, i);
    }
    assert.equal(ch.overflowEvents.length, expected.overflowCount);
    const items = await collectN(ch.subscribe(input.key), input.count);
    assert.deepEqual(items, expected.items);
  },

  'high-water-mark': async (scenarioCase) => {
    const input = scenarioCase.input as { channel: { highWaterMark: number }; items: readonly number[]; key: string };
    const expected = scenarioCase.expected as { items: readonly number[]; overflowDepths: readonly number[] };
    const ch = new OverflowChannel<number>({ 'highWaterMark': input.channel.highWaterMark });
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    assert.deepEqual(ch.overflowEvents.map((event) => event.depth), expected.overflowDepths);
    const items = await collectN(ch.subscribe(input.key), input.items.length);
    assert.deepEqual(items, expected.items);
  },

  'enqueue-rollback': async (scenarioCase) => {
    const input = scenarioCase.input as { first: number; key: string; second: number };
    const expected = scenarioCase.expected as { nextValue: number };
    class RejectFirstEnqueueChannel<T> extends Channel<T> {
      #enqueueCount = 0;
      protected override onEnqueue(): void {
        this.#enqueueCount += 1;
        if (this.#enqueueCount === 1) {
          throw new Error('hook boom');
        }
      }
    }
    const ch = new RejectFirstEnqueueChannel<number>();
    const subscriber = ch.subscribe(input.key);
    const next = subscriber.next();
    await assert.rejects(() => ch.publish(input.key, input.first), HookInvocationError);
    await ch.publish(input.key, input.second);
    assert.deepEqual(await next, { 'done': false, 'value': expected.nextValue });
    await subscriber.return(undefined);
  },

  'dequeue-hook-error': async (scenarioCase) => {
    const input = scenarioCase.input as { item: number; key: string };
    const expected = scenarioCase.expected as { errorName: string; item: number; key: string };
    class ThrowingDequeueChannel<T> extends Channel<T> {
      protected override onDequeue(): void {
        throw new Error('hook boom');
      }
    }
    const ch = ThrowingDequeueChannel.create<number>();
    await ch.publish(input.key, input.item);
    await assert.rejects(() => collectN(ch.subscribe(input.key), 1), (error: unknown) => {
      assert.ok(error instanceof HookInvocationError);
      assert.equal(error.constructor.name, expected.errorName);
      return true;
    });
  },

  'async-enqueue-hook': async (scenarioCase) => {
    const input = scenarioCase.input as { first: number; key: string; second: number };
    const expected = scenarioCase.expected as { nextValue: number; rejectionCount: number };
    class AsyncRejectingEnqueueChannel<T> extends Channel<T> {
      #enqueueCount = 0;
      protected override async onEnqueue(): Promise<void> {
        this.#enqueueCount += 1;
        if (this.#enqueueCount !== 1) {
          return;
        }
        await new Promise((resolve) => { setImmediate(resolve); });
        throw new Error('async hook boom');
      }
    }

    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const ch = new AsyncRejectingEnqueueChannel<number>();
      const subscriber = ch.subscribe(input.key);
      const next = subscriber.next();
      await assert.rejects(() => ch.publish(input.key, input.first), HookInvocationError);
      await ch.publish(input.key, input.second);
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionEvents.length, expected.rejectionCount);
      assert.deepEqual(await next, { 'done': false, 'value': expected.nextValue });
      await subscriber.return(undefined);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await scenarioRunners[scenarioCase.shape](scenarioCase);
}

void describe('Channel', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
