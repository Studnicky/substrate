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
      const ch = new Channel<number>();

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
      const ch = new Channel<string>();
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
      const ch = new Channel<number>();
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
      const ch = new Channel<string>();

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
      const ch = new Channel<number>();
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
