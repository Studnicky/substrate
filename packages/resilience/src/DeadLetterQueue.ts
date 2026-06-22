/** Bounded FIFO DLQ with async-generator drain; enqueue() throws on capacity/closed/aborted. */

import type { DeadLetterQueueOptionsType } from './DeadLetterQueueOptionsType.js';
import type { DlqEntryType } from './DlqEntryType.js';

import { DlqAbortedError } from './DlqAbortedError.js';
import { DlqClosedError } from './DlqClosedError.js';
import { DlqFullError } from './DlqFullError.js';

export class DeadLetterQueue<T> {
  readonly #capacity: number;
  readonly #clock: () => number;
  readonly #entries: DlqEntryType<T>[] = [];
  #closed = false;
  #aborted = false;
  #notifyDrain: (() => void) | null = null;

  constructor(options?: DeadLetterQueueOptionsType) {
    this.#capacity = options?.capacity ?? Infinity;
    this.#clock = options?.clock ?? (() => Date.now());
    const signal = options?.signal;
    if (signal !== undefined) {
      if (signal.aborted) { this.#aborted = true; }
      else { signal.addEventListener('abort', () => { this.#abort(); }, { 'once': true }); }
    }
  }

  get size(): number { return this.#entries.length; }
  get closed(): boolean { return this.#closed; }

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
