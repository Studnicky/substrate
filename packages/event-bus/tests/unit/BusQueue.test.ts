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
 * - protected lifecycle hooks fire via subclass overrides
 */

import { deepStrictEqual, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { HookInvoker } from '@studnicky/errors';

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

// ── Observability hook tests (subclass overrides of protected lifecycle hooks) ──

void it('onEnqueue hook fires with correct depth when item is added', async () => {
  const depths: number[] = [];

  class ObservedQueue extends BusQueue<number> {
    protected override onEnqueue(depth: number): void { depths.push(depth); }
  }

  const queue = ObservedQueue.create({ 'handler': async (_item) => {} });
  void queue.enqueue(1);
  void queue.enqueue(2);
  void queue.enqueue(3);
  await queue.drain();

  deepStrictEqual(depths, [1, 2, 3]);
});

void it('onDequeue hook fires with correct depth when item is processed', async () => {
  const depths: number[] = [];

  class ObservedQueue extends BusQueue<number> {
    protected override onDequeue(depth: number): void { depths.push(depth); }
  }

  const queue = ObservedQueue.create({ 'handler': async (_item) => {} });
  void queue.enqueue(1);
  void queue.enqueue(2);
  void queue.enqueue(3);
  await queue.drain();

  // After shift: [2,3]=2, [3]=1, []=0
  deepStrictEqual(depths, [2, 1, 0]);
});

void it('onDrop hook fires when enqueue is called on aborted queue', async () => {
  let dropCount = 0;
  const controller = new AbortController();
  controller.abort();

  class ObservedQueue extends BusQueue<number> {
    protected override onDrop(): void { dropCount += 1; }
  }

  const queue = ObservedQueue.create({
    'handler': async (_item) => {},
    'signal': controller.signal,
  });

  await queue.enqueue(1);
  await queue.enqueue(2);

  strictEqual(dropCount, 2);
});

void it('onOverflow hook fires when queue reaches highWaterMark', async () => {
  const overflowDepths: number[] = [];

  let resolveBlock!: () => void;
  const blockFirst = new Promise<void>((resolve) => { resolveBlock = resolve; });
  let first = true;

  class ObservedQueue extends BusQueue<number> {
    protected override onOverflow(depth: number): void { overflowDepths.push(depth); }
  }

  const queue = ObservedQueue.create({
    'handler': async (_item) => {
      if (first) {
        first = false;
        await blockFirst;
      }
    },
    'highWaterMark': 2,
  });

  // Enqueue 2 items without await so they both land before drain loop runs
  void queue.enqueue(1);
  void queue.enqueue(2);

  // This third enqueue reaches hwm=2 and should trigger overflow/slowConsumer
  const enqueuePromise = queue.enqueue(3);

  // Allow microtasks to start the drain loop (which unblocks backpressure)
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  // Unblock the first handler so backpressure resolves
  resolveBlock();
  await enqueuePromise;
  await queue.drain();

  strictEqual(overflowDepths.length >= 1, true, 'onOverflow should fire at least once');
});

void it('onHandlerError hook fires when handler throws', async () => {
  const errors: unknown[] = [];

  class ObservedQueue extends BusQueue<number> {
    protected override onHandlerError(err: unknown): void { errors.push(err); }
  }

  const queue = ObservedQueue.create({
    'handler': async (_item) => { throw new Error('handler error'); },
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

void it('a throwing dequeue hook does not interrupt current or later queue work', async () => {
  const errors: unknown[] = [];
  const processed: number[] = [];

  class ThrowingOnDequeueQueue extends BusQueue<number> {
    static override create(options: BusQueueCreateOptionsType<number>): ThrowingOnDequeueQueue {
      return new ThrowingOnDequeueQueue(options);
    }

    #thrown = false;

    protected override onDequeue(_depth: number): void {
      if (this.#thrown) { return; }
      this.#thrown = true;
      throw new Error('dequeue hook boom');
    }
  }

  const queue = ThrowingOnDequeueQueue.create<number>({
    'handler': async (item) => { processed.push(item); },
    'onError': (error) => { errors.push(error); },
  });

  void queue.enqueue(1);
  await Promise.resolve();

  await queue.enqueue(2);
  await queue.drain();

  deepStrictEqual(processed, [1, 2]);
  strictEqual(queue.size, 0);
  strictEqual(errors.length, 0);
});

void it('a throwing enqueue hook does not replace enqueue() or later delivery', async () => {
  const processed: number[] = [];

  class ThrowingEnqueueQueue extends BusQueue<number> {
    protected override onEnqueue(): void {
      throw new Error('hook boom');
    }
  }

  const queue = ThrowingEnqueueQueue.create({
    'handler': async (item) => { processed.push(item); },
  });

  await queue.enqueue(1);
  await queue.drain();

  deepStrictEqual(processed, [1]);
});

void it('a throwing hook is routed through onHookError with the hook name and original cause', async () => {
  const seen: Array<{ 'hookName': string; 'cause': unknown }> = [];

  class RecordingHookInvoker extends HookInvoker {
    protected override onHookError<T>(hookName: string, cause: unknown): T {
      seen.push({ 'hookName': hookName, 'cause': cause });
      return undefined as T;
    }
  }

  class RecordingHookErrorQueue extends BusQueue<number> {
    protected override readonly hooks: HookInvoker = new RecordingHookInvoker();
    protected override onEnqueue(): void {
      throw new Error('enqueue hook boom');
    }
  }

  const processed: number[] = [];
  const queue = RecordingHookErrorQueue.create({
    'handler': async (item) => { processed.push(item); },
  });

  await queue.enqueue(1);
  await queue.drain();

  strictEqual(seen.length, 1);
  strictEqual(seen[0]!.hookName, 'onEnqueue');
  strictEqual((seen[0]!.cause as Error).message, 'enqueue hook boom');
  deepStrictEqual(processed, [1], 'delivery still proceeds despite the throwing hook');
});

void it('two synchronous enqueue() calls in the same tick do not spawn concurrent drain loops', async () => {
  let activeHandlers = 0;
  let maxConcurrentHandlers = 0;
  const processed: number[] = [];

  let resolveFirst!: () => void;
  const firstBlocked = new Promise<void>((resolve) => { resolveFirst = resolve; });

  const queue = BusQueue.create<number>({
    'handler': async (item) => {
      activeHandlers += 1;
      maxConcurrentHandlers = Math.max(maxConcurrentHandlers, activeHandlers);
      if (item === 1) { await firstBlocked; }
      processed.push(item);
      activeHandlers -= 1;
    },
  });

  // Two enqueue() calls with no intervening await — both must observe the
  // same synchronous tick. A latched #draining flag ensures the second call
  // does not schedule its own concurrent drain loop.
  const first = queue.enqueue(1);
  const second = queue.enqueue(2);

  resolveFirst();
  await first;
  await second;
  await queue.drain();

  strictEqual(maxConcurrentHandlers, 1, 'Only one handler should run at a time');
  deepStrictEqual(processed, [1, 2], 'Items should be processed in FIFO order');
});

void it('FIFO order is preserved end-to-end after the CircularBuffer swap, across many enqueues', async () => {
  const received: number[] = [];
  const total = 500;

  const queue = BusQueue.create<number>({ 'handler': async (item) => { received.push(item); } });

  for (let i = 0; i < total; i += 1) {
    void queue.enqueue(i);
  }
  await queue.drain();

  const expected = Array.from({ 'length': total }, (_v, i) => i);
  deepStrictEqual(received, expected, 'handler invocation order must match enqueue order');
});
