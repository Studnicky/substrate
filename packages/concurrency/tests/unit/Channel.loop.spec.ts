import { RuntimeError, HookInvocationError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Channel } from '../../src/Channel.js';
import { ChannelOptionsEntity } from '../../src/entities/ChannelOptionsEntity.js';
import { ChannelScenarioCaseEntity } from './entities/ChannelScenarioCaseEntity.js';
import scenarioGroups from './Channel.scenarios.json' with { type: 'json' };

type ScenarioCase = ChannelScenarioCaseEntity.Type;

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

  static override create<T>(options?: ChannelOptionsEntity.InputType): ObservedChannel<T> {
    return new ObservedChannel<T>(ChannelOptionsEntity.intake(options ?? {}));
  }

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

  static override create<T>(options?: ChannelOptionsEntity.InputType): OverflowChannel<T> {
    return new OverflowChannel<T>(ChannelOptionsEntity.intake(options ?? {}));
  }
  protected override onOverflow(key: string, depth: number): void {
    this.overflowEvents.push({ 'key': key, 'depth': depth });
  }
}

type ScenarioRunner<K extends ScenarioCase['shape']> = (
  scenarioCase: Extract<ScenarioCase, { shape: K }>
) => Promise<void>;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const scenarioRunners: RunnerMap = {
  'buffered-publish': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const ch = Channel.create<number>();
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    const items = await collectN(ch.subscribe(input.key), input.items.length);
    assert.deepEqual(items, expected.items);
  },

  'live-subscribe': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
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
    const { input, expected } = scenarioCase;
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
    const { input, expected } = scenarioCase;
    const ch = Channel.create<string>();
    await ch.publish(input.left, input.leftItem);
    await ch.publish(input.right, input.rightItem);
    const [left, right] = await Promise.all([collectN(ch.subscribe(input.left), 1), collectN(ch.subscribe(input.right), 1)]);
    assert.deepEqual(left, expected.left);
    assert.deepEqual(right, expected.right);
  },

  'publish-after-close': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
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
    const { input, expected } = scenarioCase;
    const ch = Channel.create<string>();
    const subscriber = ch.subscribe(input.key);
    const active = subscriber.next();
    const duplicate = ch.subscribe(input.key);
    await assert.rejects(() => duplicate.next(), { 'name': expected.errorName });
    await ch.close();
    await active;
    await subscriber.return(undefined);
  },

  'onEnqueue-hooks': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const ch = ObservedChannel.create();
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    assert.equal(ch.enqueueEvents.length, expected.count);
    assert.deepEqual(ch.enqueueEvents, expected.entries);
  },

  'onDequeue-hooks': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const ch = ObservedChannel.create();
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    await collectN(ch.subscribe(input.key), input.items.length);
    assert.equal(ch.dequeueEvents.length, expected.count);
    assert.deepEqual(ch.dequeueEvents, expected.entries);
  },

  'onPublishDropped-hooks': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const ch = ObservedChannel.create();
    await ch.close();
    await ch.publish(input.key, input.item);
    assert.equal(ch.droppedEvents.length, expected.count);
    assert.deepEqual(ch.droppedEvents[0], expected.entry);
  },

  'onClose-hooks': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const ch = ObservedChannel.create();
    assert.equal(ch.closeCount, input.before);
    assert.equal(input.before, expected.before);
    await ch.close();
    assert.equal(ch.closeCount, input.after);
    assert.equal(input.after, expected.after);
  },

  'no-high-water-mark': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const ch = OverflowChannel.create();
    for (let i = 0; i < input.count; i += 1) {
      await ch.publish(input.key, i);
    }
    assert.equal(ch.overflowEvents.length, expected.overflowCount);
    const items = await collectN(ch.subscribe(input.key), input.count);
    assert.deepEqual(items, expected.items);
  },

  'high-water-mark': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const ch = OverflowChannel.create({ 'highWaterMark': input.channel.highWaterMark });
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    assert.deepEqual(ch.overflowEvents.map((event) => event.depth), expected.overflowDepths);
    const items = await collectN(ch.subscribe(input.key), input.items.length);
    assert.deepEqual(items, expected.items);
  },

  'enqueue-rollback': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    class RejectFirstEnqueueChannel<T> extends Channel<T> {
      #enqueueCount = 0;
      protected override onEnqueue(): void {
        this.#enqueueCount += 1;
        if (this.#enqueueCount === 1) {
          throw RuntimeError.create('hook boom');
        }
      }
    }
    const ch = RejectFirstEnqueueChannel.create<number>();
    const subscriber = ch.subscribe(input.key);
    const next = subscriber.next();
    await assert.rejects(() => ch.publish(input.key, input.first), HookInvocationError);
    await ch.publish(input.key, input.second);
    assert.deepEqual(await next, { 'done': false, 'value': expected.nextValue });
    await subscriber.return(undefined);
  },

  'dequeue-hook-error': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    class ThrowingDequeueChannel<T> extends Channel<T> {
      protected override onDequeue(): void {
        throw RuntimeError.create('hook boom');
      }
    }
    const ch = ThrowingDequeueChannel.create<number>();
    await ch.publish(input.key, input.item);
    await assert.rejects(() => collectN(ch.subscribe(input.key), 1), { 'name': expected.errorName });
  },

  'async-enqueue-hook': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    class AsyncRejectingEnqueueChannel<T> extends Channel<T> {
      #enqueueCount = 0;
      protected override async onEnqueue(): Promise<void> {
        this.#enqueueCount += 1;
        if (this.#enqueueCount !== 1) {
          return;
        }
        await new Promise((resolve) => { setImmediate(resolve); });
        throw RuntimeError.create('async hook boom');
      }
    }

    let rejectionCount = 0;
    const onUnhandledRejection = (): void => { rejectionCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const ch = AsyncRejectingEnqueueChannel.create<number>();
      const subscriber = ch.subscribe(input.key);
      const next = subscriber.next();
      await assert.rejects(() => ch.publish(input.key, input.first), HookInvocationError);
      await ch.publish(input.key, input.second);
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionCount, expected.rejectionCount);
      assert.deepEqual(await next, { 'done': false, 'value': expected.nextValue });
      await subscriber.return(undefined);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await scenarioRunners[scenarioCase.shape](scenarioCase);
}

const fileIntake = ScenarioFileCompiler.compileIntake(ChannelScenarioCaseEntity.Schema, ChannelScenarioCaseEntity.Node);

void describe('Channel', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
