/** Bounded FIFO DLQ with async-generator drain; enqueue() throws on capacity/closed/aborted. */

import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import type { DlqEntryType } from './DlqEntryType.js';
import type { DeadLetterQueueOptionsInterface } from './interfaces/DeadLetterQueueOptionsInterface.js';

import { DeadLetterQueueBuilder } from './DeadLetterQueueBuilder.js';
import { DlqAbortedError } from './DlqAbortedError.js';
import { DlqClosedError } from './DlqClosedError.js';
import { DlqFullError } from './DlqFullError.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

/**
 * Delegates `DeadLetterQueue`'s hook-invocation failures back to the owning
 * queue's own `hookErrors` array. Hoisted to module scope so V8 compiles this
 * class once rather than per `DeadLetterQueue` instantiation.
 */
class DeadLetterQueueHookDelegate extends HookInvoker {
  constructor(private readonly recordFailure: (error: HookInvocationError) => void) {
    super();
  }

  /**
   * A broken hook must not disrupt the queue's enqueue/drain/close/abort
   * behavior: record the failure and hand back the sentinel `invoke`
   * expects instead of letting `HookInvoker`'s default (throwing) behavior
   * propagate.
   */
  protected override onHookError<TResult>(hookName: string, cause: unknown): TResult {
    this.recordFailure(new HookInvocationError(hookName, cause));
    return undefined as TResult;
  }
}

export class DeadLetterQueue<T> {
  readonly #capacity: number;
  readonly #clock: () => number;
  readonly #entries: DlqEntryType<T>[] = [];
  #closed = false;
  #aborted = false;
  #notifyDrain: (() => void) | null = null;

  /**
   * Errors raised by lifecycle hook overrides, recorded by `onHookError`
   * instead of propagating out of the queue's enqueue/drain/close/abort paths.
   */
  protected readonly hookErrors: HookInvocationError[] = [];

  /** Invokes lifecycle hooks, recording failures into `hookErrors` instead of throwing. */
  protected readonly hooks: HookInvoker;

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
    this.hooks = new DeadLetterQueueHookDelegate((error) => { this.hookErrors.push(error); });
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
  async *drain(): AsyncGenerator<DlqEntryType<T>> {
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
