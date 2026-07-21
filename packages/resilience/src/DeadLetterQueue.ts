/** Bounded FIFO DLQ with async-generator drain; enqueue() throws on capacity/closed/aborted. */

import { HookInvoker } from '@studnicky/errors';

import type { DeadLetterQueueOptionsInterface } from './interfaces/DeadLetterQueueOptionsInterface.js';
import type { DlqEntryInterface } from './interfaces/DlqEntryInterface.js';

import { DlqAbortedError } from './DlqAbortedError.js';
import { DlqClosedError } from './DlqClosedError.js';
import { DlqFullError } from './DlqFullError.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

export class DeadLetterQueue<T> {
  static readonly #OwnedHookInvoker = class DeadLetterQueueHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  readonly #capacity: number;
  readonly #clock: () => number;
  readonly #entries: DlqEntryInterface<T>[] = [];
  #closed = false;
  #aborted = false;
  #notifyDrain: (() => void) | null = null;

  /** Invokes lifecycle hooks, retaining diagnostics in the invoker while swallowing failures. */
  protected readonly hooks: HookInvoker;

  static create<T>(options?: DeadLetterQueueOptionsInterface): DeadLetterQueue<T> {
    return new DeadLetterQueue<T>(options);
  }

  protected constructor(options?: DeadLetterQueueOptionsInterface) {
    this.hooks = new DeadLetterQueue.#OwnedHookInvoker();
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
      this.hooks.invoke('onOverflow', () => {
        const result = this.onOverflow();
        return result;
      });
      throw new DlqFullError();
    }
    this.#entries.push({ 'enqueuedAtMs': this.#clock(), 'error': error, 'id': crypto.randomUUID(), 'item': item, 'reason': reason });
    this.wakeDrainWaiters();
    this.hooks.invoke('onEnqueue', () => {
      const result = this.onEnqueue(item);
      return result;
    });
  }

  /** Single-consumer by default — a second concurrent drain() call replaces the previously registered waiter. Override `registerDrainWaiter`/`wakeDrainWaiters` for consumer-side fan-out. */
  async *drain(): AsyncGenerator<DlqEntryInterface<T>> {
    while (true) {
      const entry = this.#entries.shift();
      if (entry !== undefined) {
        this.hooks.invoke('onDequeue', () => {
          const result = this.onDequeue(entry.item);
          return result;
        });
        yield entry;
        continue;
      }
      if (this.#closed || this.#aborted) { return; }
      await new Promise<void>((resolve) => { this.registerDrainWaiter(resolve); });
    }
  }

  close(): void {
    this.#closed = true;
    this.wakeDrainWaiters();
    this.hooks.invoke('onClose', () => {
      const result = this.onClose();
      return result;
    });
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

  /**
   * Registers the notify callback for a waiting `drain()` consumer.
   * Default: single-slot overwrite — a second concurrent `drain()` call
   * replaces the previously registered waiter, matching the queue's
   * single-consumer design. Override alongside `wakeDrainWaiters` (e.g. to
   * maintain your own waiter collection) to build consumer-side fan-out.
   */
  protected registerDrainWaiter(notify: () => void): void {
    this.#notifyDrain = notify;
  }

  /**
   * Wakes the waiter registered via `registerDrainWaiter`, if any.
   * Override alongside `registerDrainWaiter` to wake multiple waiters for
   * custom fan-out.
   */
  protected wakeDrainWaiters(): void {
    if (this.#notifyDrain !== null) { const n = this.#notifyDrain; this.#notifyDrain = null; n(); }
  }

  #abort(): void {
    this.#aborted = true;
    this.wakeDrainWaiters();
    this.hooks.invoke('onAbort', () => {
      const result = this.onAbort();
      return result;
    });
  }
}
