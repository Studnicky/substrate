/** Wraps a DeadLetterQueue and re-yields entries at a configurable interval. */

import type { DeadLetterQueue } from './DeadLetterQueue.js';
import type { DlqEntryType } from './DlqEntryType.js';

import { DeadLetterQueueRetryGeneratorBuilder } from './DeadLetterQueueRetryGeneratorBuilder.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

// json-schema-uninexpressible: 'dlq' is a live DeadLetterQueue<T> class instance and T is a generic type parameter — not a serializable data shape
type RetryGeneratorOptions<T> = {
  readonly 'dlq': DeadLetterQueue<T>;
  readonly 'intervalMs': number;
};

export class DeadLetterQueueRetryGenerator<T> {
  readonly #dlq: DeadLetterQueue<T>;
  readonly #intervalMs: number;

  #invokeHook(invoke: () => void): void {
    try {
      invoke();
    } catch {}
  }

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
      this.#invokeHook(() => {
        this.onYield(entry);
      });
      yield entry;
      this.#invokeHook(() => {
        this.onWait(this.#intervalMs);
      });
      await new Promise<void>((resolve) => { setTimeout(resolve, this.#intervalMs); });
    }
    this.#invokeHook(() => {
      this.onDone();
    });
  }

  /**
   * Fires immediately before each entry is yielded from `generate()`.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onYield(_entry: DlqEntryType<T>): void {}

  /**
   * Fires before each inter-entry delay in `generate()`.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onWait(_intervalMs: number): void {}

  /**
   * Fires when the generator finishes (DLQ closed or aborted, drain exhausted).
   * Must not throw or block.
   */
  protected onDone(): void {}
}
