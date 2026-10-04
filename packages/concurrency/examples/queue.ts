/** Queue admission and FIFO delivery. Run: pnpm --dir packages/concurrency exec tsx examples/queue.ts */

import assert from 'node:assert/strict';

// #region usage
import { BusQueue } from '../src/queue/index.js';

const delivered: string[] = [];
const queue = BusQueue.create<string>({
  'handler': (item) => {
    delivered.push(item);
    const result = Promise.resolve();
    return result;
  },
  'highWaterMark': 2
});

await Promise.all([queue.enqueue('first'), queue.enqueue('second'), queue.enqueue('third')]);
await queue.drain();

console.log('Delivered FIFO:', delivered);
// #endregion usage

assert.deepEqual(delivered, ['first', 'second', 'third']);
assert.equal(queue.size, 0);

console.log('queue: all assertions passed');
