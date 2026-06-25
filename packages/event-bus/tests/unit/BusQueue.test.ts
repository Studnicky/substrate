/**
 * BusQueue Unit Tests
 *
 * Tests the bounded async FIFO queue:
 * - sequential handler invocation
 * - size tracking
 * - drain() resolves when queue empties
 * - onError called on handler throw without stopping delivery
 * - AbortSignal cancels the queue
 * - highWaterMark validation
 * - handler validation
 */

import { deepStrictEqual, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { BusQueue } from '../../src/BusQueue.js';
import type { BusQueueCreateOptionsType } from '../../src/BusQueueCreateOptionsType.js';

void it('calls handler for each enqueued item in order', async () => {
  const received: number[] = [];
  const queue = BusQueue.create<number>({ 'handler': async (item) => { received.push(item); } });

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
  const queue = BusQueue.create<number>({
    'handler': async (_item) => {
      observedSizes.push(queue.size);
    },
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
  const queue = BusQueue.create<string>({ 'handler': async (item) => { processed.push(item); } });

  void queue.enqueue('a');
  void queue.enqueue('b');

  await queue.drain();

  deepStrictEqual(processed, ['a', 'b']);
  strictEqual(queue.size, 0);
});

void it('onError is called when handler throws, delivery continues', async () => {
  const errors: unknown[] = [];
  const received: number[] = [];

  const queue = BusQueue.create<number>({
    'handler': async (item) => {
      if (item === 2) { throw new Error('boom'); }
      received.push(item);
    },
    'onError': (err) => { errors.push(err); },
  });

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

  const queue = BusQueue.create<number>({
    'handler': async (item) => { received.push(item); },
    'signal': controller.signal,
  });

  await queue.enqueue(1);
  await queue.drain();

  controller.abort();

  await queue.enqueue(2);
  await queue.enqueue(3);
  // No drain needed — aborted queue should not process
  await Promise.resolve();

  deepStrictEqual(received, [1], 'Only item before abort should be received');
});

const highWaterMarkScenarios: Array<{ description: string; value: number }> = [
  { description: 'highWaterMark: 0 throws BusQueueConfigError', value: 0 },
  { description: 'highWaterMark: -1 throws BusQueueConfigError', value: -1 },
  { description: 'highWaterMark: 1.5 (non-integer) throws BusQueueConfigError', value: 1.5 },
];

for (const { description, value } of highWaterMarkScenarios) {
  it(description, () => {
    throws(
      () => BusQueue.create<number>({ 'handler': async () => {}, 'highWaterMark': value }),
      { message: 'highWaterMark must be a positive integer' },
    );
  });
}

// ── Observability hook tests ────────────────────────────────────────────────

void it('onEnqueue callback fires with correct depth when item is added', async () => {
  const depths: number[] = [];
  const queue = BusQueue.create<number>({
    'handler': async (_item) => {},
    'onEnqueue': (depth) => { depths.push(depth); },
  });

  void queue.enqueue(1);
  void queue.enqueue(2);
  void queue.enqueue(3);
  await queue.drain();

  deepStrictEqual(depths, [1, 2, 3]);
});

void it('onDequeue callback fires with correct depth when item is processed', async () => {
  const depths: number[] = [];
  const queue = BusQueue.create<number>({
    'handler': async (_item) => {},
    'onDequeue': (depth) => { depths.push(depth); },
  });

  void queue.enqueue(1);
  void queue.enqueue(2);
  void queue.enqueue(3);
  await queue.drain();

  // After shift: [2,3]=2, [3]=1, []=0
  deepStrictEqual(depths, [2, 1, 0]);
});

void it('onDrop callback fires when enqueue is called on aborted queue', async () => {
  let dropCount = 0;
  const controller = new AbortController();
  controller.abort();

  const queue = BusQueue.create<number>({
    'handler': async (_item) => {},
    'signal': controller.signal,
    'onDrop': () => { dropCount += 1; },
  });

  await queue.enqueue(1);
  await queue.enqueue(2);

  strictEqual(dropCount, 2);
});

void it('onOverflow and onSlowConsumer callbacks fire when queue reaches highWaterMark', async () => {
  const overflowDepths: number[] = [];
  const slowConsumerArgs: Array<{ 'depth': number; 'hwm': number }> = [];

  let resolveBlock!: () => void;
  const blockFirst = new Promise<void>((resolve) => { resolveBlock = resolve; });
  let first = true;

  const queue = BusQueue.create<number>({
    'handler': async (_item) => {
      if (first) {
        first = false;
        await blockFirst;
      }
    },
    'highWaterMark': 2,
    'onOverflow': (depth) => { overflowDepths.push(depth); },
    'onSlowConsumer': (depth, hwm) => { slowConsumerArgs.push({ 'depth': depth, 'hwm': hwm }); },
  });

  // Enqueue 2 items without await so they both land before drain loop runs
  void queue.enqueue(1);
  void queue.enqueue(2);

  // This third enqueue reaches hwm=2 and should trigger overflow/slowConsumer
  const enqueuePromise = queue.enqueue(3);

  // Allow microtasks to start the drain loop (which unblocks backpressure)
  await Promise.resolve();
  await Promise.resolve();

  // Unblock the first handler so backpressure resolves
  resolveBlock();
  await enqueuePromise;
  await queue.drain();

  strictEqual(overflowDepths.length >= 1, true, 'onOverflow should fire at least once');
  strictEqual(slowConsumerArgs.length >= 1, true, 'onSlowConsumer should fire at least once');
  strictEqual(slowConsumerArgs[0]!.hwm, 2, 'hwm should be passed to onSlowConsumer');
});

void it('onHandlerError callback fires when handler throws', async () => {
  const errors: unknown[] = [];

  const queue = BusQueue.create<number>({
    'handler': async (_item) => { throw new Error('handler error'); },
    'onHandlerError': (err) => { errors.push(err); },
  });

  await queue.enqueue(1);
  await queue.drain();

  strictEqual(errors.length, 1);
  strictEqual((errors[0] as Error).message, 'handler error');
});

void it('protected onEnqueue hook fires via subclass override', async () => {
  const depths: number[] = [];

  class ObservedQueue extends BusQueue<number> {
    static override create(options: BusQueueCreateOptionsType<number>): ObservedQueue {
      return new ObservedQueue(options);
    }
    protected override onEnqueue(depth: number): void { depths.push(depth); }
  }

  const queue = ObservedQueue.create({ 'handler': async (_item) => {} });
  void queue.enqueue(10);
  void queue.enqueue(20);
  await queue.drain();

  deepStrictEqual(depths, [1, 2]);
});
