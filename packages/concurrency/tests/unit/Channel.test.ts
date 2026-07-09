import { it } from 'node:test';
import assert from 'node:assert/strict';
import { Channel } from '../../src/Channel.js';

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
  readonly sendEvents: { 'key': string; 'item': T }[] = [];
  readonly receiveEvents: { 'key': string; 'item': T }[] = [];
  readonly enqueueEvents: { 'key': string; 'item': T }[] = [];
  readonly dequeueEvents: { 'key': string; 'item': T }[] = [];
  readonly droppedEvents: { 'key': string; 'item': T }[] = [];
  closeCount = 0;

  protected override onSend(key: string, item: T): void {
    this.sendEvents.push({ 'key': key, 'item': item });
  }
  protected override onEnqueue(key: string, item: T): void {
    this.enqueueEvents.push({ 'key': key, 'item': item });
  }
  protected override onReceive(key: string, item: T): void {
    this.receiveEvents.push({ 'key': key, 'item': item });
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

it('onSend and onEnqueue fire for each publish when open', () => {
  const ch = new ObservedChannel<string>();
  ch.publish('k', 'a');
  ch.publish('k', 'b');
  assert.equal(ch.sendEvents.length, 2);
  assert.equal(ch.enqueueEvents.length, 2);
  assert.deepEqual(ch.sendEvents[0], { 'key': 'k', 'item': 'a' });
  assert.deepEqual(ch.enqueueEvents[1], { 'key': 'k', 'item': 'b' });
});

it('onReceive and onDequeue fire for each consumed item', async () => {
  const ch = new ObservedChannel<number>();
  ch.publish('ev', 1);
  ch.publish('ev', 2);
  await collectN(ch.subscribe('ev'), 2);
  assert.equal(ch.receiveEvents.length, 2);
  assert.equal(ch.dequeueEvents.length, 2);
  assert.deepEqual(ch.receiveEvents[0], { 'key': 'ev', 'item': 1 });
  assert.deepEqual(ch.dequeueEvents[1], { 'key': 'ev', 'item': 2 });
});

it('onPublishDropped fires when publishing to closed channel', () => {
  const ch = new ObservedChannel<string>();
  ch.close();
  ch.publish('x', 'dropped');
  assert.equal(ch.droppedEvents.length, 1);
  assert.deepEqual(ch.droppedEvents[0], { 'key': 'x', 'item': 'dropped' });
});

it('onClose fires once on close()', () => {
  const ch = new ObservedChannel<string>();
  assert.equal(ch.closeCount, 0);
  ch.close();
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
  const ch = OverflowChannel.create<number>({ 'highWaterMark': 3 }) as OverflowChannel<number>;

  ch.publish('k', 1);
  assert.equal(ch.overflowEvents.length, 0);
  ch.publish('k', 2);
  assert.equal(ch.overflowEvents.length, 0);
  ch.publish('k', 3);
  assert.equal(ch.overflowEvents.length, 1);
  assert.deepEqual(ch.overflowEvents[0], { 'key': 'k', 'depth': 3 });
  ch.publish('k', 4);
  assert.equal(ch.overflowEvents.length, 2);
  assert.deepEqual(ch.overflowEvents[1], { 'key': 'k', 'depth': 4 });

  const items = await collectN(ch.subscribe('k'), 4);
  assert.deepEqual(items, [1, 2, 3, 4]);
});
