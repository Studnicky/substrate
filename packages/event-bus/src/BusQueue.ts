/** Bounded async FIFO queue with backpressure; enqueue blocks at highWaterMark. */

import type { BusQueueOptionsType } from './BusQueueOptionsType.js';

const busQueueDefaultHighWaterMark = 256;

export class BusQueue<T> {
  readonly #handler: (item: T) => Promise<void>;
  readonly #hwm: number;
  readonly #onError: ((err: unknown) => void) | undefined;
  readonly #queue: T[] = [];
  readonly #backpressureWaiters: { 'resolve': () => void }[] = [];
  readonly #drainWaiters: { 'resolve': () => void }[] = [];
  #draining = false;
  #aborted = false;

  constructor(handler: (item: T) => Promise<void>, options?: BusQueueOptionsType) {
    this.#handler = handler;
    this.#hwm = options?.highWaterMark ?? busQueueDefaultHighWaterMark;
    this.#onError = options?.onError;
    const signal = options?.signal;
    if (signal !== undefined) {
      if (signal.aborted) {
        this.#aborted = true;
      } else {
        signal.addEventListener('abort', () => { this.#handleAbort(); }, { 'once': true });
      }
    }
  }

  get size(): number {
    return this.#queue.length;
  }

  async enqueue(item: T): Promise<void> {
    if (this.#aborted) { return; }
    this.#queue.push(item);
    this.#scheduleLoop();
    if (this.#queue.length < this.#hwm) { return; }
    return await new Promise<void>((resolve) => {
      this.#backpressureWaiters.push({ 'resolve': resolve });
    });
  }

  async drain(): Promise<void> {
    if (this.#queue.length === 0 || this.#aborted) { return; }
    return await new Promise<void>((resolve) => {
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
    queueMicrotask(() => { void this.#runDrainLoop(); });
  }

  async #tryHandleItem(item: T): Promise<void> {
    try {
      await this.#handler(item);
    } catch (err: unknown) {
      if (this.#onError !== undefined) { this.#onError(err); }
    }
  }

  async #runDrainLoop(): Promise<void> {
    this.#draining = true;
    while (this.#queue.length > 0 && !this.#aborted) {
      const item = this.#queue.shift();
      if (item === undefined) { break; }
      const waiter = this.#backpressureWaiters.shift();
      if (waiter !== undefined) { waiter.resolve(); }
      await this.#tryHandleItem(item);
    }
    this.#draining = false;
    if (this.#queue.length === 0 || this.#aborted) {
      for (const w of this.#drainWaiters) { w.resolve(); }
      this.#drainWaiters.length = 0;
    }
  }
}
