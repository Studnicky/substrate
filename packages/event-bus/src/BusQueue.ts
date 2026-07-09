/** Bounded async FIFO queue with backpressure; enqueue blocks at highWaterMark. */

import type { BusQueueCreateOptionsType } from './BusQueueCreateOptionsType.js';

import { BusQueueBuilder } from './BusQueueBuilder.js';
import { BusQueueConfigError } from './errors/BusQueueConfigError.js';

const busQueueDefaultHighWaterMark = 256;

export class BusQueue<T> {
  readonly #handler: (item: T) => Promise<void>;
  readonly #hwm: number;
  readonly #onError: ((err: unknown) => void) | undefined;
  readonly #onEnqueueCb: ((depth: number) => void) | undefined;
  readonly #onDequeueCb: ((depth: number) => void) | undefined;
  readonly #onDropCb: (() => void) | undefined;
  readonly #onOverflowCb: ((depth: number) => void) | undefined;
  readonly #onSlowConsumerCb: ((depth: number, highWaterMark: number) => void) | undefined;
  readonly #onHandlerErrorCb: ((error: unknown) => void) | undefined;
  readonly #queue: T[] = [];
  readonly #backpressureWaiters: { 'resolve': () => void }[] = [];
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
    this.#hwm = hwmOption ?? busQueueDefaultHighWaterMark;
    this.#onError = options.onError;
    this.#onEnqueueCb = options.onEnqueue;
    this.#onDequeueCb = options.onDequeue;
    this.#onDropCb = options.onDrop;
    this.#onOverflowCb = options.onOverflow;
    this.#onSlowConsumerCb = options.onSlowConsumer;
    this.#onHandlerErrorCb = options.onHandlerError;
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
      this.#invokeHook(() => { this.onDrop(); });
      if (this.#onDropCb !== undefined) { this.#invokeHook(() => { this.#onDropCb?.(); }); }
      return;
    }
    this.#queue.push(item);
    this.#invokeHook(() => { this.onEnqueue(this.#queue.length); });
    if (this.#onEnqueueCb !== undefined) { this.#invokeHook(() => { this.#onEnqueueCb?.(this.#queue.length); }); }
    this.#scheduleLoop();
    if (this.#queue.length < this.#hwm) { return; }
    this.#invokeHook(() => { this.onOverflow(this.#queue.length); });
    if (this.#onOverflowCb !== undefined) { this.#invokeHook(() => { this.#onOverflowCb?.(this.#queue.length); }); }
    this.#invokeHook(() => { this.onSlowConsumer(this.#queue.length, this.#hwm); });
    if (this.#onSlowConsumerCb !== undefined) { this.#invokeHook(() => { this.#onSlowConsumerCb?.(this.#queue.length, this.#hwm); }); }
    await new Promise<void>((resolve) => {
      this.#backpressureWaiters.push({ 'resolve': resolve });
    });
  }

  async drain(): Promise<void> {
    if (this.#queue.length === 0 || this.#aborted) { return; }
    await new Promise<void>((resolve) => {
      this.#drainWaiters.push({ 'resolve': resolve });
    });
  }

  #handleAbort(): void {
    this.#aborted = true;
    for (const w of this.#backpressureWaiters) { w.resolve(); }
    this.#backpressureWaiters.length = 0;
    for (const w of this.#drainWaiters) { w.resolve(); }
    this.#drainWaiters.length = 0;
  }

  #scheduleLoop(): void {
    if (this.#draining) { return; }
    queueMicrotask(() => {
      void this.#runDrainLoop().catch((error: unknown) => {
        if (this.#onError !== undefined) { this.#invokeHook(() => { this.#onError?.(error); }); }
      });
    });
  }

  async #tryHandleItem(item: T): Promise<void> {
    try {
      await this.#handler(item);
    } catch (err: unknown) {
      if (this.#onError !== undefined) { this.#invokeHook(() => { this.#onError?.(err); }); }
      this.#invokeHook(() => { this.onHandlerError(err); });
      if (this.#onHandlerErrorCb !== undefined) { this.#invokeHook(() => { this.#onHandlerErrorCb?.(err); }); }
    }
  }

  async #runDrainLoop(): Promise<void> {
    this.#draining = true;
    try {
      while (this.#queue.length > 0 && !this.#aborted) {
        const item = this.#queue.shift();
        if (item === undefined) { break; }
        const waiter = this.#backpressureWaiters.shift();
        if (waiter !== undefined) { waiter.resolve(); }
        this.#invokeHook(() => { this.onDequeue(this.#queue.length); });
        if (this.#onDequeueCb !== undefined) { this.#invokeHook(() => { this.#onDequeueCb?.(this.#queue.length); }); }
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

  #invokeHook(hook: () => void): void {
    try {
      hook();
    } catch {}
  }

  /** Fires when an item is added to the queue (after push). */
  protected onEnqueue(_depth: number): void {}

  /** Fires when an item is removed from the queue for processing (after shift). */
  protected onDequeue(_depth: number): void {}

  /** Fires when enqueue is called but the queue is already aborted (item silently dropped). */
  protected onDrop(): void {}

  /** Fires when queue depth reaches highWaterMark and caller will block (backpressure begins). */
  protected onOverflow(_depth: number): void {}

  /** Fires when queue depth reaches highWaterMark — same moment as onOverflow; args include depth and hwm. */
  protected onSlowConsumer(_depth: number, _highWaterMark: number): void {}

  /** Fires after handler throws and onError callback (if any) has been called. */
  protected onHandlerError(_error: unknown): void {}
}
