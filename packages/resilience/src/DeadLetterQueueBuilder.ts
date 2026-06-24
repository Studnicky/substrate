/** Fluent builder for DeadLetterQueue. */

import type { DeadLetterQueue } from './DeadLetterQueue.js';
import type { DeadLetterQueueOptionsInterface } from './interfaces/DeadLetterQueueOptionsInterface.js';

export class DeadLetterQueueBuilder<T> {
  readonly #create: (options: DeadLetterQueueOptionsInterface) => DeadLetterQueue<T>;
  #capacity?: number;
  #clock?: () => number;
  #signal?: AbortSignal;

  static create<T>(create: (options: DeadLetterQueueOptionsInterface) => DeadLetterQueue<T>): DeadLetterQueueBuilder<T> {
    return new DeadLetterQueueBuilder<T>(create);
  }

  private constructor(create: (options: DeadLetterQueueOptionsInterface) => DeadLetterQueue<T>) {
    this.#create = create;
  }

  withCapacity(value: number): this {
    this.#capacity = value;
    return this;
  }

  withClock(value: () => number): this {
    this.#clock = value;
    return this;
  }

  withSignal(value: AbortSignal): this {
    this.#signal = value;
    return this;
  }

  build(): DeadLetterQueue<T> {
    const options: DeadLetterQueueOptionsInterface = {
      ...(this.#capacity !== undefined ? { 'capacity': this.#capacity } : {}),
      ...(this.#clock !== undefined ? { 'clock': this.#clock } : {}),
      ...(this.#signal !== undefined ? { 'signal': this.#signal } : {})
    };
    return this.#create(options);
  }
}
