/** Wraps a DeadLetterQueue and re-yields entries at a configurable interval. */

import type { DeadLetterQueue } from './DeadLetterQueue.js';
import type { DeadLetterQueueRetryGeneratorOptionsType } from './DeadLetterQueueRetryGeneratorOptionsType.js';
import type { DlqEntryType } from './DlqEntryType.js';

export class DeadLetterQueueRetryGenerator<T> {
  readonly #dlq: DeadLetterQueue<T>;
  readonly #intervalMs: number;

  constructor(dlq: DeadLetterQueue<T>, options: DeadLetterQueueRetryGeneratorOptionsType) {
    this.#dlq = dlq;
    this.#intervalMs = options.intervalMs;
  }

  async *generate(): AsyncGenerator<DlqEntryType<T>> {
    for await (const entry of this.#dlq.drain()) {
      yield entry;
      await new Promise<void>((resolve) => { setTimeout(resolve, this.#intervalMs); });
    }
  }
}
