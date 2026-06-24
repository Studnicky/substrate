/** Wraps a DeadLetterQueue and re-yields entries at a configurable interval. */

import type { DeadLetterQueue } from './DeadLetterQueue.js';
import type { DlqEntryType } from './DlqEntryType.js';

import { DeadLetterQueueRetryGeneratorBuilder } from './DeadLetterQueueRetryGeneratorBuilder.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

type RetryGeneratorOptions<T> = {
  readonly 'dlq': DeadLetterQueue<T>;
  readonly 'intervalMs': number;
};

export class DeadLetterQueueRetryGenerator<T> {
  readonly #dlq: DeadLetterQueue<T>;
  readonly #intervalMs: number;

  static builder<T>(): DeadLetterQueueRetryGeneratorBuilder<T> {
    const factory = (options: RetryGeneratorOptions<T>): DeadLetterQueueRetryGenerator<T> => {
      const result = DeadLetterQueueRetryGenerator.create<T>(options);
      return result;
    };
    const result = DeadLetterQueueRetryGeneratorBuilder.create<T>(factory);
    return result;
  }

  static create<T>(options: RetryGeneratorOptions<T>): DeadLetterQueueRetryGenerator<T> {
    return new DeadLetterQueueRetryGenerator<T>(options);
  }

  protected constructor(options: RetryGeneratorOptions<T>) {
    if (options.dlq === null || options.dlq === undefined) {
      throw new ResilienceConfigError('dlq is required');
    }
    this.#dlq = options.dlq;
    this.#intervalMs = options.intervalMs;
  }

  async *generate(): AsyncGenerator<DlqEntryType<T>> {
    const drainIterator = this.#dlq.drain();
    for await (const entry of drainIterator) {
      yield entry;
      await new Promise<void>((resolve) => { setTimeout(resolve, this.#intervalMs); });
    }
  }
}
