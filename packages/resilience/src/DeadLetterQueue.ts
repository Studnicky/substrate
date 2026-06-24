/** Bounded FIFO DLQ with async-generator drain; enqueue() throws on capacity/closed/aborted. */

import type { DlqEntryType } from './DlqEntryType.js';
import type { DeadLetterQueueOptionsInterface } from './interfaces/DeadLetterQueueOptionsInterface.js';

import { DeadLetterQueueBuilder } from './DeadLetterQueueBuilder.js';
import { DlqAbortedError } from './DlqAbortedError.js';
import { DlqClosedError } from './DlqClosedError.js';
import { DlqFullError } from './DlqFullError.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

export class DeadLetterQueue<T> {
  readonly #capacity: number;
  readonly #clock: () => number;
  readonly #entries: DlqEntryType<T>[] = [];
  #closed = false;
  #aborted = false;
  #notifyDrain: (() => void) | null = null;

  static builder<T>(): DeadLetterQueueBuilder<T> {
    const factory = (options: DeadLetterQueueOptionsInterface): DeadLetterQueue<T> => {
      const result = DeadLetterQueue.create<T>(options);
      return result;
    };
    const result = DeadLetterQueueBuilder.create<T>(factory);
    return result;
  }

  static create<T>(options?: DeadLetterQueueOptionsInterface): DeadLetterQueue<T> {
    return new DeadLetterQueue<T>(options);
  }

  protected constructor(options?: DeadLetterQueueOptionsInterface) {
    const capacity = options?.capacity ?? Infinity;
    if (capacity !== undefined && (capacity <= 0 || Number.isNaN(capacity))) {
      throw new ResilienceConfigError('capacity must be > 0');
    }
    this.#capacity = capacity;
    this.#clock = options?.clock ?? (() => { const result = Date.now(); return result; });
    const signal = options?.signal;
    if (signal !== undefined) {
      if (signal.aborted) { this.#aborted = true; }
      else { signal.addEventListener('abort', () => { this.#abort(); }, { 'once': true }); }
    }
  }

  get size(): number { const result = this.#entries.length;
    return result; }
  get closed(): boolean { const result = this.#closed;
    return result; }

  /** Throws DlqFullError | DlqClosedError | DlqAbortedError on failure. */
  enqueue(item: T, reason: string, error?: Error): void {
    if (this.#aborted) { throw new DlqAbortedError(); }
    if (this.#closed) { throw new DlqClosedError(); }
    if (this.#entries.length >= this.#capacity) { throw new DlqFullError(); }
    this.#entries.push({ 'enqueuedAtMs': this.#clock(), 'error': error, 'id': crypto.randomUUID(), 'item': item, 'reason': reason });
    if (this.#notifyDrain !== null) { const n = this.#notifyDrain; this.#notifyDrain = null; n(); }
  }

  async *drain(): AsyncGenerator<DlqEntryType<T>> {
    while (true) {
      const entry = this.#entries.shift();
      if (entry !== undefined) { yield entry; continue; }
      if (this.#closed || this.#aborted) { return; }
      await new Promise<void>((resolve) => { this.#notifyDrain = resolve; });
    }
  }

  close(): void {
    this.#closed = true;
    if (this.#notifyDrain !== null) { const n = this.#notifyDrain; this.#notifyDrain = null; n(); }
  }

  abort(): void { this.#abort(); }

  #abort(): void {
    this.#aborted = true;
    if (this.#notifyDrain !== null) { const n = this.#notifyDrain; this.#notifyDrain = null; n(); }
  }
}
