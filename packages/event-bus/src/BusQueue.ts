/** Bounded async FIFO queue with backpressure; enqueue blocks at highWaterMark. */

import { CircularBuffer } from '@studnicky/circular-buffer';
import { HookInvoker } from '@studnicky/errors';

import type { BusQueueCreateOptionsType } from './BusQueueCreateOptionsType.js';

import { BusQueueBuilder } from './BusQueueBuilder.js';
import {
  BUS_QUEUE_DEFAULT_HIGH_WATER_MARK,
  BUS_QUEUE_DEFAULT_WAITER_CAPACITY
} from './constants/index.js';
import { BusQueueConfigError } from './errors/BusQueueConfigError.js';

/** Swallows hook failures rather than throwing — a queue processing loop must not halt because an observer hook threw. */
class SwallowingHookInvoker extends HookInvoker {
  protected override onHookError<T>(_hookName: string, _cause: unknown): T {
    const result = undefined as T;
    return result;
  }
}

export class BusQueue<T> {
  protected readonly hooks: HookInvoker = new SwallowingHookInvoker();
  readonly #handler: (item: T) => Promise<void>;
  readonly #hwm: number;
  readonly #onError: ((err: unknown) => void) | undefined;
  readonly #queue: CircularBuffer<T>;
  readonly #backpressureWaiters: CircularBuffer<{ 'resolve': () => void }>;
  readonly #drainWaiters: { 'resolve': () => void }[] = [];
  #draining = false;
  #aborted = false;

  static builder<T>(): BusQueueBuilder<T> {
    const result = BusQueueBuilder.create<T>((options) => {
      const instance = BusQueue.create<T>(options);
      return instance;
    });
    return result;
  }

  static create<T>(options: BusQueueCreateOptionsType<T>): BusQueue<T> {
    const result = new this<T>(options);
    return result;
  }

  protected constructor(options: BusQueueCreateOptionsType<T>) {
    if (typeof options.handler !== 'function') {
      throw new BusQueueConfigError('handler must be a function');
    }
    const hwmOption = options.highWaterMark;
    if (hwmOption !== undefined && (!Number.isInteger(hwmOption) || hwmOption <= 0)) {
      throw new BusQueueConfigError('highWaterMark must be a positive integer');
    }
    this.#handler = options.handler;
    this.#hwm = hwmOption ?? BUS_QUEUE_DEFAULT_HIGH_WATER_MARK;
    this.#onError = options.onError;
    this.#queue = CircularBuffer.builder<T>().withCapacity(this.#hwm).withOverflow('grow').build();
    this.#backpressureWaiters = CircularBuffer.builder<{ 'resolve': () => void }>()
      .withCapacity(BUS_QUEUE_DEFAULT_WAITER_CAPACITY)
      .withOverflow('grow')
      .build();
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
      await this.hooks.invoke('onDrop', () => { const result = this.onDrop(); return result; });
      return;
    }
    this.#queue.push(item);
    const depth = this.#queue.length;
    this.#scheduleLoop();
    // Register the backpressure waiter synchronously, before any hook `await` — awaiting
    // a hook always yields a real microtask (HookInvoker.invoke is always-async, even
    // for a synchronous hook body), which would let the drain loop race ahead and shift this
    // item before its waiter existed, leaking a waiter that never gets resolved.
    const overflowed = depth >= this.#hwm;
    const backpressure = overflowed
      ? new Promise<void>((resolve) => { this.#backpressureWaiters.push({ 'resolve': resolve }); })
      : undefined;
    await this.hooks.invoke('onEnqueue', () => { const result = this.onEnqueue(depth); return result; });
    if (overflowed) {
      await this.hooks.invoke('onOverflow', () => { const result = this.onOverflow(depth); return result; });
    }
    if (backpressure !== undefined) { await backpressure; }
  }

  async drain(): Promise<void> {
    // A drain loop in flight may have already shifted the last item off #queue
    // (so #queue.length reads 0) while that item's handler is still running —
    // only the absence of an active loop means nothing is left to wait for.
    if ((this.#queue.length === 0 && !this.#draining) || this.#aborted) { return; }
    await new Promise<void>((resolve) => {
      this.#drainWaiters.push({ 'resolve': resolve });
    });
  }

  #handleAbort(): void {
    this.#aborted = true;
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
      void this.#runDrainLoop().catch((error: unknown) => {
        if (this.#onError !== undefined) {
          try { this.#onError(error); } catch {}
        }
      });
    });
  }

  async #tryHandleItem(item: T): Promise<void> {
    try {
      await this.#handler(item);
    } catch (err: unknown) {
      if (this.#onError !== undefined) {
        try { this.#onError(err); } catch {}
      }
      await this.hooks.invoke('onHandlerError', () => { const result = this.onHandlerError(err); return result; });
    }
  }

  async #runDrainLoop(): Promise<void> {
    try {
      while (this.#queue.length > 0 && !this.#aborted) {
        const item = this.#queue.shift();
        if (item === undefined) { break; }
        const waiter = this.#backpressureWaiters.shift();
        if (waiter !== undefined) { waiter.resolve(); }
        await this.hooks.invoke('onDequeue', () => { const result = this.onDequeue(this.#queue.length); return result; });
        await this.#tryHandleItem(item);
      }
    } finally {
      this.#draining = false;
      if (this.#queue.length === 0 || this.#aborted) {
        for (const w of this.#drainWaiters) { w.resolve(); }
        this.#drainWaiters.length = 0;
      }
    }
  }

  /** Fires when an item is added to the queue (after push). */
  protected onEnqueue(_depth: number): void | Promise<void> {}

  /** Fires when an item is removed from the queue for processing (after shift). */
  protected onDequeue(_depth: number): void | Promise<void> {}

  /** Fires when enqueue is called but the queue is already aborted (item silently dropped). */
  protected onDrop(): void | Promise<void> {}

  /** Fires when queue depth reaches highWaterMark and caller will block (backpressure begins). */
  protected onOverflow(_depth: number): void | Promise<void> {}

  /** Fires after handler throws and onError callback (if any) has been called. */
  protected onHandlerError(_error: unknown): void | Promise<void> {}
}
