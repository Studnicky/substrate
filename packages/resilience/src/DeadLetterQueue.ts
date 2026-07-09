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
    let aborted = false;
    if (signal !== undefined) {
      if (signal.aborted) { aborted = true; }
      else { signal.addEventListener('abort', () => { this.#abort(); }, { 'once': true }); }
    }
    this.#aborted = aborted;
  }

  get size(): number { const result = this.#entries.length;
    return result; }
  get closed(): boolean { const result = this.#closed;
    return result; }

  /** Throws DlqFullError | DlqClosedError | DlqAbortedError on failure. */
  enqueue(item: T, reason: string, error?: Error): void {
    if (this.#aborted) { throw new DlqAbortedError(); }
    if (this.#closed) { throw new DlqClosedError(); }
    if (this.#entries.length >= this.#capacity) {
      this.onOverflow();
      throw new DlqFullError();
    }
    this.#entries.push({ 'enqueuedAtMs': this.#clock(), 'error': error, 'id': crypto.randomUUID(), 'item': item, 'reason': reason });
    if (this.#notifyDrain !== null) { const n = this.#notifyDrain; this.#notifyDrain = null; n(); }
    this.onEnqueue(item);
  }

  async *drain(): AsyncGenerator<DlqEntryType<T>> {
    while (true) {
      const entry = this.#entries.shift();
      if (entry !== undefined) {
        this.onDequeue(entry.item);
        yield entry;
        continue;
      }
      if (this.#closed || this.#aborted) { return; }
      await new Promise<void>((resolve) => { this.#notifyDrain = resolve; });
    }
  }

  close(): void {
    this.#closed = true;
    if (this.#notifyDrain !== null) { const n = this.#notifyDrain; this.#notifyDrain = null; n(); }
    this.onClose();
  }

  abort(): void { this.#abort(); }

  /**
   * Fires after an item is added to the queue.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onEnqueue(_item: T): void {}

  /**
   * Fires after an item is shifted from the queue during drain.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onDequeue(_item: T): void {}

  /**
   * Fires when `enqueue()` is called on a full queue, before throwing DlqFullError.
   * Must not throw or block.
   */
  protected onOverflow(): void {}

  /**
   * Fires at the end of `close()`.
   * Must not throw or block.
   */
  protected onClose(): void {}

  /**
   * Fires at the end of `#abort()`.
   * Must not throw or block.
   */
  protected onAbort(): void {}

  #abort(): void {
    this.#aborted = true;
    if (this.#notifyDrain !== null) { const n = this.#notifyDrain; this.#notifyDrain = null; n(); }
    this.onAbort();
  }
}
