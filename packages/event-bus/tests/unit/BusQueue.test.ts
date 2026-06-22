/**
 * BusQueue Unit Tests
 *
 * Tests the bounded async FIFO queue:
 * - sequential handler invocation
 * - size tracking
 * - drain() resolves when queue empties
 * - onError called on handler throw without stopping delivery
 * - AbortSignal cancels the queue
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BusQueue } from '../../src/BusQueue.js';

void describe('BusQueue', () => {
  void it('calls handler for each enqueued item in order', async () => {
    const received: number[] = [];
    const queue = new BusQueue<number>(async (item) => { received.push(item); });

    await queue.enqueue(1);
    await queue.enqueue(2);
    await queue.enqueue(3);
    await queue.drain();

    deepStrictEqual(received, [1, 2, 3]);
  });

  void it('size reflects queue depth before drain', async () => {
    const observedSizes: number[] = [];

    // Capture size inside the handler — at that moment the remaining items
    // are still sitting in the queue (shift happens before handler call).
    const queue = new BusQueue<number>(async (_item) => {
      observedSizes.push(queue.size);
    });

    // Enqueue synchronously before any await so all three land in the queue
    // before the microtask drain loop begins.
    void queue.enqueue(1);
    void queue.enqueue(2);
    void queue.enqueue(3);

    await queue.drain();

    // After processing item 1 → queue had [2,3] → size was 2
    // After processing item 2 → queue had [3]   → size was 1
    // After processing item 3 → queue had []    → size was 0
    deepStrictEqual(observedSizes, [2, 1, 0], 'Size should decrease as items are processed');
  });

  void it('drain() resolves when queue empties', async () => {
    const processed: string[] = [];
    const queue = new BusQueue<string>(async (item) => { processed.push(item); });

    void queue.enqueue('a');
    void queue.enqueue('b');

    await queue.drain();

    deepStrictEqual(processed, ['a', 'b']);
    strictEqual(queue.size, 0);
  });

  void it('onError is called when handler throws, delivery continues', async () => {
    const errors: unknown[] = [];
    const received: number[] = [];

    const queue = new BusQueue<number>(
      async (item) => {
        if (item === 2) { throw new Error('boom'); }
        received.push(item);
      },
      { onError: (err) => { errors.push(err); } },
    );

    await queue.enqueue(1);
    await queue.enqueue(2);
    await queue.enqueue(3);
    await queue.drain();

    deepStrictEqual(received, [1, 3], 'Items 1 and 3 should be processed');
    strictEqual(errors.length, 1, 'One error should be reported');
    strictEqual((errors[0] as Error).message, 'boom');
  });

  void it('AbortSignal cancels queue: enqueue becomes no-op after abort', async () => {
    const received: number[] = [];
    const controller = new AbortController();

    const queue = new BusQueue<number>(
      async (item) => { received.push(item); },
      { signal: controller.signal },
    );

    await queue.enqueue(1);
    await queue.drain();

    controller.abort();

    await queue.enqueue(2);
    await queue.enqueue(3);
    // No drain needed — aborted queue should not process
    await Promise.resolve();

    deepStrictEqual(received, [1], 'Only item before abort should be received');
  });
});
