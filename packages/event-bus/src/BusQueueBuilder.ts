/** Fluent builder for creating BusQueue instances. */

import type { BusQueue } from './BusQueue.js';
import type { BusQueueCreateOptionsType } from './BusQueueCreateOptionsType.js';

import { BusQueueConfigError } from './errors/index.js';

export class BusQueueBuilder<T> {
  static create<T>(create: (options: BusQueueCreateOptionsType<T>) => BusQueue<T>): BusQueueBuilder<T> {
    const result = new BusQueueBuilder<T>(create);
    return result;
  }

  readonly #create: (options: BusQueueCreateOptionsType<T>) => BusQueue<T>;
  #handler: ((item: T) => Promise<void>) | undefined;
  #highWaterMark: number | undefined;
  #onError: ((err: unknown) => void) | undefined;
  #signal: AbortSignal | undefined;

  private constructor(create: (options: BusQueueCreateOptionsType<T>) => BusQueue<T>) {
    this.#create = create;
  }

  withHandler(handler: (item: T) => Promise<void>): this {
    this.#handler = handler;
    return this;
  }

  withHighWaterMark(value: number): this {
    this.#highWaterMark = value;
    return this;
  }

  withOnError(callback: (err: unknown) => void): this {
    this.#onError = callback;
    return this;
  }

  withSignal(signal: AbortSignal): this {
    this.#signal = signal;
    return this;
  }

  build(): BusQueue<T> {
    const handler = this.#handler;
    if (handler === undefined) {
      throw new BusQueueConfigError('BusQueueBuilder: handler is required — call withHandler() before build()');
    }
    const options: BusQueueCreateOptionsType<T> = {
      'handler': handler,
      ...(this.#highWaterMark !== undefined ? { 'highWaterMark': this.#highWaterMark } : {}),
      ...(this.#onError !== undefined ? { 'onError': this.#onError } : {}),
      ...(this.#signal !== undefined ? { 'signal': this.#signal } : {})
    };
    return this.#create(options);
  }
}
