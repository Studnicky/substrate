import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { Channel } from '../../src/Channel.js';
import { ChannelOptionsEntity } from '../../src/entities/ChannelOptionsEntity.js';
import scenarioGroups from './Channel.scenarios.json' with { 'type': 'json' };
import { ChannelScenarioCaseEntity } from './entities/ChannelScenarioCaseEntity.js';

class ObservedChannel<T> extends Channel<T> {
  readonly enqueueEvents: { 'item': T; 'key': string; }[] = [];
  readonly dequeueEvents: { 'item': T; 'key': string; }[] = [];
  readonly droppedEvents: { 'item': T; 'key': string; }[] = [];
  closeCount = 0;

  static override create<T>(options?: ChannelOptionsEntity.InputType): ObservedChannel<T> {
    return new ObservedChannel<T>(ChannelOptionsEntity.intake(options ?? {}));
  }

  protected override onEnqueue(key: string, item: T): void {
    this.enqueueEvents.push({ 'item': item, 'key': key });
  }
  protected override onDequeue(key: string, item: T): void {
    this.dequeueEvents.push({ 'item': item, 'key': key });
  }
  protected override onPublishDropped(key: string, item: T): void {
    this.droppedEvents.push({ 'item': item, 'key': key });
  }
  protected override onClose(): void {
    this.closeCount += 1;
  }
}

class OverflowChannel<T> extends Channel<T> {
  readonly overflowEvents: { 'depth': number; 'key': string; }[] = [];

  static override create<T>(options?: ChannelOptionsEntity.InputType): OverflowChannel<T> {
    return new OverflowChannel<T>(ChannelOptionsEntity.intake(options ?? {}));
  }
  protected override onOverflow(key: string, depth: number): void {
    this.overflowEvents.push({ 'depth': depth, 'key': key });
  }
}

class AsyncRejectingEnqueueChannel<T> extends Channel<T> {
  #enqueueCount = 0;

  static make(): AsyncRejectingEnqueueChannel<number> {
    const channel = new AsyncRejectingEnqueueChannel<number>(ChannelOptionsEntity.intake({}));
    Object.defineProperty(channel, 'onEnqueue', { 'value': channel.rejectFirstEnqueue });
    return channel;
  }

  private async rejectFirstEnqueue(): Promise<void> {
    this.#enqueueCount += 1;
    if (this.#enqueueCount === 1) {
      await new Promise((resolve) => { setImmediate(resolve); });
      throw RuntimeError.create('async hook boom');
    }
  }
}

class ThrowingDequeueChannel<T> extends Channel<T> {
  protected override onDequeue(): void {
    throw RuntimeError.create('hook boom');
  }
}

class RejectFirstEnqueueChannel<T> extends Channel<T> {
  #enqueueCount = 0;
  protected override onEnqueue(): void {
    this.#enqueueCount += 1;
    if (this.#enqueueCount === 1) {
      throw RuntimeError.create('hook boom');
    }
  }
}

class ChannelRunners {
  static async 'async-enqueue-hook'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'async-enqueue-hook'>): Promise<void> {
    const { expected, input } = scenarioCase;

    let rejectionCount = 0;
    const onUnhandledRejection = (): void => { rejectionCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const ch = AsyncRejectingEnqueueChannel.make();
      const subscriber = ch.subscribe(input.key);
      const next = subscriber.next();
      await assert.rejects(() => {
        const result = ch.publish(input.key, input.first);
        return result;
      }, HookInvocationError);
      await ch.publish(input.key, input.second);
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionCount, expected.rejectionCount);
      assert.deepEqual(await next, { 'done': false, 'value': expected.nextValue });
      await subscriber.return(undefined);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'buffered-publish'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'buffered-publish'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = Channel.create<number>();
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    const items = await ChannelRunners.collectN(ch.subscribe(input.key), input.items.length);
    assert.deepEqual(items, expected.items);
  }

  static async 'close-terminates'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'close-terminates'>): Promise<void> {
    const { expected, input } = scenarioCase;
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
  }

  static async 'dequeue-hook-error'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'dequeue-hook-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = ThrowingDequeueChannel.create<number>();
    await ch.publish(input.key, input.item);
    await assert.rejects(() => {
      const result = ChannelRunners.collectN(ch.subscribe(input.key), 1);
      return result;
    }, { 'name': expected.errorName });
  }

  static async 'duplicate-subscribe'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'duplicate-subscribe'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = Channel.create<string>();
    const subscriber = ch.subscribe(input.key);
    const active = subscriber.next();
    const duplicate = ch.subscribe(input.key);
    await assert.rejects(() => {
      const result = duplicate.next();
      return result;
    }, { 'name': expected.errorName });
    await ch.close();
    await active;
    await subscriber.return(undefined);
  }

  static async 'enqueue-rollback'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'enqueue-rollback'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = RejectFirstEnqueueChannel.create<number>();
    const subscriber = ch.subscribe(input.key);
    const next = subscriber.next();
    await assert.rejects(() => {
      const result = ch.publish(input.key, input.first);
      return result;
    }, HookInvocationError);
    await ch.publish(input.key, input.second);
    assert.deepEqual(await next, { 'done': false, 'value': expected.nextValue });
    await subscriber.return(undefined);
  }

  static async 'high-water-mark'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'high-water-mark'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = OverflowChannel.create({ 'highWaterMark': input.channel.highWaterMark });
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    assert.deepEqual(ch.overflowEvents.map((event) => {return event.depth;}), expected.overflowDepths);
    const items = await ChannelRunners.collectN(ch.subscribe(input.key), input.items.length);
    assert.deepEqual(items, expected.items);
  }

  static async 'independent-keys'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'independent-keys'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = Channel.create<string>();
    await ch.publish(input.left, input.leftItem);
    await ch.publish(input.right, input.rightItem);
    const [left, right] = await Promise.all([ChannelRunners.collectN(ch.subscribe(input.left), 1), ChannelRunners.collectN(ch.subscribe(input.right), 1)]);
    assert.deepEqual(left, expected.left);
    assert.deepEqual(right, expected.right);
  }

  static async 'live-subscribe'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'live-subscribe'>): Promise<void> {
    const { expected, input } = scenarioCase;
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
  }

  static async 'no-high-water-mark'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'no-high-water-mark'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = OverflowChannel.create();
    for (let i = 0; i < input.count; i += 1) {
      await ch.publish(input.key, i);
    }
    assert.equal(ch.overflowEvents.length, expected.overflowCount);
    const items = await ChannelRunners.collectN(ch.subscribe(input.key), input.count);
    assert.deepEqual(items, expected.items);
  }

  static async 'onClose-hooks'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'onClose-hooks'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = ObservedChannel.create();
    assert.equal(ch.closeCount, input.before);
    assert.equal(input.before, expected.before);
    await ch.close();
    assert.equal(ch.closeCount, input.after);
    assert.equal(input.after, expected.after);
  }

  static async 'onDequeue-hooks'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'onDequeue-hooks'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = ObservedChannel.create();
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    await ChannelRunners.collectN(ch.subscribe(input.key), input.items.length);
    assert.equal(ch.dequeueEvents.length, expected.count);
    assert.deepEqual(ch.dequeueEvents, expected.entries);
  }

  static async 'onEnqueue-hooks'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'onEnqueue-hooks'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = ObservedChannel.create();
    for (const item of input.items) {
      await ch.publish(input.key, item);
    }
    assert.equal(ch.enqueueEvents.length, expected.count);
    assert.deepEqual(ch.enqueueEvents, expected.entries);
  }

  static async 'onPublishDropped-hooks'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'onPublishDropped-hooks'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = ObservedChannel.create();
    await ch.close();
    await ch.publish(input.key, input.item);
    assert.equal(ch.droppedEvents.length, expected.count);
    assert.deepEqual(ch.droppedEvents[0], expected.entry);
  }

  static async 'publish-after-close'(scenarioCase: ScenarioCaseOfType<ChannelScenarioCaseEntity.Type, 'publish-after-close'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const ch = Channel.create<number>();
    await ch.close();
    await ch.publish(input.key, input.item);
    const items = await Array.fromAsync(ch.subscribe(input.key));
    assert.deepEqual(items, expected.items);
  }

  private static async collectN<T>(gen: AsyncGenerator<T>, n: number): Promise<T[]> {
    const items: T[] = [];
    for await (const item of gen) {
      items.push(item);
      if (items.length >= n) {
        break;
      }
    }
    return items;
  }
}

ScenarioSuite.register({
  'entity': ChannelScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Channel',
  'runners': ChannelRunners
});
