/** Fluent builder for DeadLetterQueueRetryGenerator. */

import type { DeadLetterQueue } from './DeadLetterQueue.js';
import type { DeadLetterQueueRetryGenerator } from './DeadLetterQueueRetryGenerator.js';

import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

// json-schema-uninexpressible: 'dlq' is a live DeadLetterQueue<T> class instance and T is a generic type parameter — not a serializable data shape
type RetryGeneratorOptions<T> = {
  readonly 'dlq': DeadLetterQueue<T>;
  readonly 'intervalMs': number;
};

export class DeadLetterQueueRetryGeneratorBuilder<T> {
  readonly #create: (options: RetryGeneratorOptions<T>) => DeadLetterQueueRetryGenerator<T>;
  #dlq?: DeadLetterQueue<T>;
  #intervalMs?: number;

  static create<T>(
    create: (options: RetryGeneratorOptions<T>) => DeadLetterQueueRetryGenerator<T>
  ): DeadLetterQueueRetryGeneratorBuilder<T> {
    return new DeadLetterQueueRetryGeneratorBuilder<T>(create);
  }

  private constructor(create: (options: RetryGeneratorOptions<T>) => DeadLetterQueueRetryGenerator<T>) {
    this.#create = create;
  }

  withDlq(value: DeadLetterQueue<T>): this {
    this.#dlq = value;
    return this;
  }

  withIntervalMs(value: number): this {
    this.#intervalMs = value;
    return this;
  }

  build(): DeadLetterQueueRetryGenerator<T> {
    if (this.#dlq === undefined) {
      throw new ResilienceConfigError('dlq is required');
    }
    if (this.#intervalMs === undefined) {
      throw new ResilienceConfigError('intervalMs is required');
    }
    const options: RetryGeneratorOptions<T> = { 'dlq': this.#dlq, 'intervalMs': this.#intervalMs };
    return this.#create(options);
  }
}
