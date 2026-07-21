/** Bounded async FIFO queue with backpressure; enqueue blocks at highWaterMark. */

import { CircularBuffer } from '@studnicky/circular-buffer';
import { HookInvoker } from '@studnicky/errors';

import type { BusQueueCreateOptionsInterface } from './BusQueueCreateOptionsInterface.js';

import {
  BUS_QUEUE_DEFAULT_HIGH_WATER_MARK,
  BUS_QUEUE_DEFAULT_WAITER_CAPACITY
} from './constants/index.js';
import { BusQueueConfigError } from './errors/BusQueueConfigError.js';

/** Swallows hook failures rather than throwing — a queue processing loop must not halt because an observer hook threw. */
class BusQueueHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: unknown): void {}
}

class BusQueueEntry<T> {
  readonly item: T;
  readonly ready: Promise<void>;
  readonly #resolveReady: () => void;
  #cancelled = false;

  constructor(item: T) {
    const readiness = Promise.withResolvers<void>();
    this.item = item;
    this.ready = readiness.promise;
    this.#resolveReady = readiness.resolve;
  }

  get cancelled(): boolean {
    const result = this.#cancelled;
    return result;
  }

  cancel(): void {
    this.#cancelled = true;
    this.#resolveReady();
  }

  release(): void {
    this.#resolveReady();
  }
}

export class BusQueue<T> {
  protected readonly hooks: HookInvoker = new BusQueueHookInvoker();
  readonly #handler: (item: T) => Promise<void>;
  readonly #hwm: number;
  readonly #onError: ((err: unknown) => void) | undefined;
  readonly #queue: CircularBuffer<BusQueueEntry<T>>;
  readonly #backpressureWaiters: CircularBuffer<{ 'resolve': () => void }>;
  readonly #drainWaiters: { 'resolve': () => void }[] = [];
  #draining = false;
  #aborted = false;
  #drainTask: Promise<void> | undefined = undefined;
  #activeEntry: BusQueueEntry<T> | undefined = undefined;

  static create<T>(options: BusQueueCreateOptionsInterface<T>): BusQueue<T> {
    const result = new this<T>(options);
    return result;
  }

  protected constructor(options: BusQueueCreateOptionsInterface<T>) {
    if (typeof options.handler !== 'function') {
      throw new BusQueueConfigError('BusQueue.create(options): options.handler must be a function');
    }
    const hwmOption = options.highWaterMark;
    if (hwmOption !== undefined && (!Number.isInteger(hwmOption) || hwmOption <= 0)) {
      throw new BusQueueConfigError('highWaterMark must be a positive integer');
    }
    this.#handler = options.handler;
    this.#hwm = hwmOption ?? BUS_QUEUE_DEFAULT_HIGH_WATER_MARK;
    this.#onError = options.onError;
    this.#queue = CircularBuffer.create<BusQueueEntry<T>>({
      'capacity': this.#hwm,
      'overflow': 'grow'
    });
    this.#backpressureWaiters = CircularBuffer.create<{ 'resolve': () => void }>({
      'capacity': BUS_QUEUE_DEFAULT_WAITER_CAPACITY,
      'overflow': 'grow'
    });
    const signal = options.signal;
    let aborted = false;
    if (signal !== undefined) {
      if (signal.aborted) {
        aborted = true;
      } else {
        signal.addEventListener('abort', () => { this.#handleAbort(); }, { 'once': true });
      }
    }
    this.#aborted = aborted;
  }

  get size(): number {
    const result = this.#queue.length;
    return result;
  }

  async enqueue(item: T): Promise<void> {
    if (this.#aborted) {
      await this.hooks.invokeAsync('onDrop', () => { const result = this.onDrop(); return result; });
      return;
    }
    const entry = new BusQueueEntry(item);
    this.#queue.push(entry);
    const depth = this.#queue.length;
    this.#scheduleLoop();
    // Register the backpressure waiter synchronously, before any hook `await` —
    // `HookInvoker.invokeAsync` always yields a real microtask, even for a
    // synchronous hook body, which would let the drain loop race ahead and shift
    // this item before its waiter existed, leaking a waiter that never resolves.
    const overflowed = depth >= this.#hwm;
    const backpressure = overflowed
      ? new Promise<void>((resolve) => { this.#backpressureWaiters.push({ 'resolve': resolve }); })
      : undefined;
    try {
      await this.hooks.invokeAsync('onEnqueue', async () => {
        try {
          await this.onEnqueue(depth);
        } catch (error: unknown) {
          entry.cancel();
          throw error;
        }
      });
      if (overflowed) {
        await this.hooks.invokeAsync('onOverflow', async () => {
          try {
            await this.onOverflow(depth);
          } catch (error: unknown) {
            entry.cancel();
            throw error;
          }
        });
      }
    } catch (error: unknown) {
      entry.cancel();
      throw error;
    } finally {
      entry.release();
    }
    if (backpressure !== undefined) { await backpressure; }
  }

  async drain(): Promise<void> {
    // A drain loop in flight may have already shifted the last item off #queue
    // (so #queue.length reads 0) while that item's handler is still running —
    // only the absence of an active loop means nothing is left to wait for.
    if ((this.#queue.length === 0 && !this.#draining) || this.#aborted) { return; }
    const drainTask = this.#drainTask;
    if (drainTask !== undefined) {
      await drainTask;
      return;
    }
    await new Promise<void>((resolve) => {
      this.#drainWaiters.push({ 'resolve': resolve });
    });
  }

  #handleAbort(): void {
    this.#aborted = true;
    this.#activeEntry?.cancel();
    let waiter = this.#backpressureWaiters.shift();
    while (waiter !== undefined) {
      waiter.resolve();
      waiter = this.#backpressureWaiters.shift();
    }
    for (const w of this.#drainWaiters) { w.resolve(); }
    this.#drainWaiters.length = 0;
  }

  #scheduleLoop(): void {
    if (this.#draining) { return; }
    this.#draining = true;
    queueMicrotask(() => {
      this.#drainTask = this.#runDrainLoop();
    });
  }

  async #tryHandleItem(item: T): Promise<void> {
    try {
      await this.#handler(item);
    } catch (err: unknown) {
      const onError = this.#onError;
      if (onError !== undefined) {
        await this.hooks.invokeAsync('onError', () => {
          const result = onError(err);
          return result;
        });
      }
      await this.hooks.invokeAsync('onHandlerError', () => { const result = this.onHandlerError(err); return result; });
    }
  }

  async #processEntry(entry: BusQueueEntry<T>): Promise<void> {
    this.#activeEntry = entry;
    try {
      const waiter = this.#backpressureWaiters.shift();
      if (waiter !== undefined) { waiter.resolve(); }
      await entry.ready;
      if (!entry.cancelled && !this.#aborted) {
        await this.hooks.invokeAsync('onDequeue', () => {
          const result = this.onDequeue(this.#queue.length);
          return result;
        });
        await this.#tryHandleItem(entry.item);
      }
    } finally {
      this.#activeEntry = undefined;
    }
  }

  async #runDrainLoop(): Promise<void> {
    try {
      while (this.#queue.length > 0 && !this.#aborted) {
        const entry = this.#queue.shift();
        if (entry === undefined) { break; }
        await this.#processEntry(entry);
      }
    } catch (error: unknown) {
      const onError = this.#onError;
      if (onError !== undefined) {
        await this.hooks.invokeAsync('onError', () => {
          const result = onError(error);
          return result;
        });
      }
    } finally {
      this.#draining = false;
      this.#drainTask = undefined;
      if (this.#queue.length === 0 || this.#aborted) {
        for (const w of this.#drainWaiters) { w.resolve(); }
        this.#drainWaiters.length = 0;
      }
    }
  }

  /** Admission hook after push; handler delivery waits for completion. */
  protected onEnqueue(_depth: number): void | Promise<void> {}

  /** Fires when an item is removed from the queue for processing (after shift). */
  protected onDequeue(_depth: number): void | Promise<void> {}

  /** Fires when enqueue is called but the queue is already aborted (item silently dropped). */
  protected onDrop(): void | Promise<void> {}

  /** Admission hook at highWaterMark; handler delivery waits for completion. */
  protected onOverflow(_depth: number): void | Promise<void> {}

  /** Fires after handler throws and onError callback (if any) has been called. */
  protected onHandlerError(_error: unknown): void | Promise<void> {}
}
