import { it } from 'node:test';
import assert from 'node:assert/strict';
import { HookInvocationError } from '@studnicky/errors';
import { Channel } from '../../src/Channel.js';
import { ChannelError } from '../../src/errors/ChannelError.js';

async function collectN<T>(gen: AsyncGenerator<T>, n: number): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) {
    items.push(item);
    if (items.length >= n) { break; }
  }
  return items;
}

const channelScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'publish then subscribe yields buffered items',
    exec: async () => {
      const ch = Channel.create<number>();

      ch.publish('a', 1);
      ch.publish('a', 2);
      ch.publish('a', 3);

      const items = await collectN(ch.subscribe('a'), 3);
      assert.deepEqual(items, [1, 2, 3]);
    },
  },
  {
    description: 'subscribe receives items published after subscription starts',
    exec: async () => {
      const ch = Channel.create<string>();
      const gen = ch.subscribe('b');

      const collected: string[] = [];
      const done = (async () => {
        for await (const item of gen) {
          collected.push(item);
          if (collected.length === 2) { break; }
        }
      })();

      ch.publish('b', 'hello');
      ch.publish('b', 'world');

      await done;
      assert.deepEqual(collected, ['hello', 'world']);
    },
  },
  {
    description: 'close() terminates subscribe',
    exec: async () => {
      const ch = Channel.create<number>();
      const gen = ch.subscribe('c');

      const items: number[] = [];
      const done = (async () => {
        for await (const item of gen) { items.push(item); }
      })();

      ch.publish('c', 10);
      ch.publish('c', 20);
      ch.close();

      await done;
      assert.deepEqual(items, [10, 20]);
    },
  },
  {
    description: 'multiple keys are independent',
    exec: async () => {
      const ch = Channel.create<string>();

      ch.publish('x', 'from-x');
      ch.publish('y', 'from-y');

      const [x, y] = await Promise.all([
        collectN(ch.subscribe('x'), 1),
        collectN(ch.subscribe('y'), 1),
      ]);

      assert.deepEqual(x, ['from-x']);
      assert.deepEqual(y, ['from-y']);
    },
  },
  {
    description: 'publish after close is a no-op',
    exec: async () => {
      const ch = Channel.create<number>();
      ch.close();

      ch.publish('z', 99); // must not throw

      const items: number[] = [];
      for await (const item of ch.subscribe('z')) { items.push(item); }
      assert.deepEqual(items, []);
    },
  },
];
for (const { description, exec } of channelScenarios) {
  it(description, exec);
}

// Hook observation tests
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

it('onEnqueue fires for each publish when open', async () => {
  const ch = new ObservedChannel<string>();
  await ch.publish('k', 'a');
  await ch.publish('k', 'b');
  assert.equal(ch.enqueueEvents.length, 2);
  assert.deepEqual(ch.enqueueEvents[0], { 'key': 'k', 'item': 'a' });
  assert.deepEqual(ch.enqueueEvents[1], { 'key': 'k', 'item': 'b' });
});

it('onDequeue fires for each consumed item', async () => {
  const ch = new ObservedChannel<number>();
  ch.publish('ev', 1);
  ch.publish('ev', 2);
  await collectN(ch.subscribe('ev'), 2);
  assert.equal(ch.dequeueEvents.length, 2);
  assert.deepEqual(ch.dequeueEvents[0], { 'key': 'ev', 'item': 1 });
  assert.deepEqual(ch.dequeueEvents[1], { 'key': 'ev', 'item': 2 });
});

it('onPublishDropped fires when publishing to closed channel', async () => {
  const ch = new ObservedChannel<string>();
  await ch.close();
  await ch.publish('x', 'dropped');
  assert.equal(ch.droppedEvents.length, 1);
  assert.deepEqual(ch.droppedEvents[0], { 'key': 'x', 'item': 'dropped' });
});

it('onClose fires once on close()', async () => {
  const ch = new ObservedChannel<string>();
  assert.equal(ch.closeCount, 0);
  await ch.close();
  assert.equal(ch.closeCount, 1);
});

// highWaterMark / onOverflow
class OverflowChannel<T> extends Channel<T> {
  readonly overflowEvents: { 'key': string; 'depth': number }[] = [];

  protected override onOverflow(key: string, depth: number): void {
    this.overflowEvents.push({ 'key': key, 'depth': depth });
  }
}

it('no highWaterMark configured: onOverflow never fires, buffer grows unbounded', async () => {
  const ch = new OverflowChannel<number>();

  for (let i = 0; i < 50; i += 1) { ch.publish('k', i); }

  assert.equal(ch.overflowEvents.length, 0);

  const items = await collectN(ch.subscribe('k'), 50);
  assert.equal(items.length, 50);
  assert.deepEqual(items, Array.from({ 'length': 50 }, (_v, i) => i));
});

it('highWaterMark configured: onOverflow fires at configured depth without dropping items', async () => {
  const ch = new OverflowChannel<number>({ 'highWaterMark': 3 });

  await ch.publish('k', 1);
  assert.equal(ch.overflowEvents.length, 0);
  await ch.publish('k', 2);
  assert.equal(ch.overflowEvents.length, 0);
  await ch.publish('k', 3);
  assert.equal(ch.overflowEvents.length, 1);
  assert.deepEqual(ch.overflowEvents[0], { 'key': 'k', 'depth': 3 });
  await ch.publish('k', 4);
  assert.equal(ch.overflowEvents.length, 2);
  assert.deepEqual(ch.overflowEvents[1], { 'key': 'k', 'depth': 4 });

  const items = await collectN(ch.subscribe('k'), 4);
  assert.deepEqual(items, [1, 2, 3, 4]);
});

it('a throwing onEnqueue hook rolls the item back and a later publish wakes the waiting subscriber', async () => {
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
  const subscriber = ch.subscribe('k');
  const next = subscriber.next();
  await assert.rejects(() => ch.publish('k', 1), HookInvocationError);
  await ch.publish('k', 2);

  assert.deepEqual(await next, { 'done': false, 'value': 2 });
  await subscriber.return(undefined);
});

it('a throwing onDequeue hook rejects subscribe() with HookInvocationError after the item is dequeued', async () => {
  class ThrowingDequeueChannel<T> extends Channel<T> {
    protected override onDequeue(): void {
      throw new Error('hook boom');
    }
  }

  const ch = ThrowingDequeueChannel.create<number>();
  await ch.publish('k', 1);

  await assert.rejects(() => collectN(ch.subscribe('k'), 1), HookInvocationError);
});

it('an async-overridden onEnqueue hook that rejects is routed safely through HookInvoker without an unhandled rejection', async () => {
  class AsyncRejectingEnqueueChannel<T> extends Channel<T> {
    #enqueueCount = 0;

    protected override async onEnqueue(): Promise<void> {
      this.#enqueueCount += 1;
      if (this.#enqueueCount !== 1) { return; }
      await new Promise((resolve) => { setImmediate(resolve); });
      throw new Error('async hook boom');
    }
  }

  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    const ch = new AsyncRejectingEnqueueChannel<number>();
    const subscriber = ch.subscribe('k');
    const next = subscriber.next();
    await assert.rejects(() => ch.publish('k', 1), HookInvocationError);
    await ch.publish('k', 2);

    await new Promise((resolve) => { setImmediate(resolve); });
    assert.equal(rejectionEvents.length, 0);
    assert.deepEqual(await next, { 'done': false, 'value': 2 });
    await subscriber.return(undefined);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

it('an async onOverflow rejection rolls back its item and preserves progress for the next publish', async () => {
  class RejectFirstOverflowChannel<T> extends Channel<T> {
    #overflowCount = 0;

    protected override async onOverflow(): Promise<void> {
      this.#overflowCount += 1;
      if (this.#overflowCount !== 1) { return; }
      await new Promise((resolve) => { setImmediate(resolve); });
      throw new Error('overflow hook boom');
    }
  }

  const ch = new RejectFirstOverflowChannel<number>({ 'highWaterMark': 1 });
  const subscriber = ch.subscribe('k');
  const next = subscriber.next();

  await assert.rejects(() => ch.publish('k', 1), HookInvocationError);
  await ch.publish('k', 2);

  assert.deepEqual(await next, { 'done': false, 'value': 2 });
  await subscriber.return(undefined);
});

it('FIFO order survives the CircularBuffer swap under high volume', async () => {
  const ch = Channel.create<number>();
  const total = 500;

  for (let i = 0; i < total; i += 1) { await ch.publish('fifo', i); }

  const items = await collectN(ch.subscribe('fifo'), total);
  assert.deepEqual(items, Array.from({ 'length': total }, (_v, i) => i));
});

// Per-key eviction
class InspectableChannel<T> extends Channel<T> {
  get size(): number {
    const result = this.channelCount;
    return result;
  }
}

it('per-key entries do not grow unboundedly for many distinct keys each used once', async () => {
  const ch = new InspectableChannel<number>();
  const total = 200;

  for (let i = 0; i < total; i += 1) { await ch.publish(`key-${i}`, i); }
  assert.equal(ch.size, total);

  await ch.close();

  for (let i = 0; i < total; i += 1) {
    const items = await collectN(ch.subscribe(`key-${i}`), 1);
    assert.deepEqual(items, [i]);
  }

  assert.equal(ch.size, 0);
});

it('a closed, fully-drained key is evicted even when the subscriber breaks out of iteration', async () => {
  const ch = new InspectableChannel<number>();

  await ch.publish('k', 1);
  await ch.close();

  const gen = ch.subscribe('k');
  const first = await gen.next();
  assert.deepEqual(first, { 'done': false, 'value': 1 });
  const second = await gen.next();
  assert.equal(second.done, true);

  assert.equal(ch.size, 0);
});

it('an open channel keeps its per-key entry after the subscriber stops iterating early', async () => {
  const ch = new InspectableChannel<number>();

  await ch.publish('k', 1);
  await ch.publish('k', 2);

  const gen = ch.subscribe('k');
  await gen.next();
  await gen.return(undefined);

  assert.equal(ch.size, 1);
});

// Concurrent subscriber guard
it('a second concurrent subscribe() for the same key throws instead of hanging', async () => {
  const ch = Channel.create<number>();

  const first = ch.subscribe('dup');
  first.next(); // starts the first subscriber; it parks on ch.notify since 'dup' has nothing buffered — left pending on purpose

  await assert.rejects(() => ch.subscribe('dup').next(), ChannelError);
});
