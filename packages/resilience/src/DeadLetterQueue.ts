/** Bounded FIFO DLQ with async-generator drain; enqueue() throws on capacity/closed/aborted. */

import { CircularBuffer, HookInvoker, Predicates, RuntimeError } from '#runtime';

import type { DeadLetterQueueEntryInterface } from './interfaces/DeadLetterQueueEntryInterface.js';
import type { DeadLetterQueueOptionsInterface } from './interfaces/DeadLetterQueueOptionsInterface.js';

import { DeadLetterQueueAbortedError } from './DeadLetterQueueAbortedError.js';
import { DeadLetterQueueClosedError } from './DeadLetterQueueClosedError.js';
import { DeadLetterQueueFullError } from './DeadLetterQueueFullError.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

/**
 * The portion of a queue's surface that never mentions its item type, so the
 * factory can bind a subclass without the item type's variance blocking it.
 */
interface DeadLetterQueueShapeInterface {
  abort(): void;
  close(): void;
}

interface DeadLetterQueueSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

export class DeadLetterQueue<T> {
  static readonly #OwnedHookInvoker = class DeadLetterQueueHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  readonly #capacity: number;
  readonly #clock: () => number;
  readonly #entries: CircularBuffer<DeadLetterQueueEntryInterface<T>>;
  #closed = false;
  #aborted = false;
  #notifyDrain: (() => void) | null = null;
  /** Boxed so a legitimately-`undefined` `T` value is distinguishable from "no pending item". */
  #pendingDequeueItem: { readonly 'item': T } | undefined;

  /** Built once and reused across `drain()` iterations to avoid rebuilding a closure on every loop pass. */
  readonly #onDequeueHook = (): void => {
    if (this.#pendingDequeueItem !== undefined) {
      this.onDequeue(this.#pendingDequeueItem.item);
      return;
    }
    throw RuntimeError.create('DeadLetterQueue: dequeue hook fired without a pending item');
  };

  /** Built once and reused across `drain()` iterations; threads `resolve` through to `registerDrainWaiter`. */
  readonly #registerDrainWaiterExecutor = (resolve: () => void): void => {
    this.registerDrainWaiter(resolve);
  };

  /** Invokes lifecycle hooks, retaining diagnostics in the invoker while swallowing failures. */
  protected readonly hooks: HookInvoker;

  static create<T, TInstance extends DeadLetterQueueShapeInterface = DeadLetterQueue<T>>(
    this: DeadLetterQueueSubclassInterface<TInstance>,
    options?: DeadLetterQueueOptionsInterface
  ): TInstance {
    const resolveSubclassConstructor = (): DeadLetterQueueSubclassInterface<TInstance> => {
      return this;
    };

    const result: unknown = Reflect.construct(resolveSubclassConstructor(), [options]);
    if (!Predicates.isObjectLike(result) || !Predicates.isInstanceOf(result, resolveSubclassConstructor())) {
      throw RuntimeError.create('DeadLetterQueue.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected constructor(options?: DeadLetterQueueOptionsInterface) {
    this.hooks = new DeadLetterQueue.#OwnedHookInvoker();
    this.#entries = CircularBuffer.create<DeadLetterQueueEntryInterface<T>>({ 'overflow': 'grow' });
    this.#capacity = DeadLetterQueue.#resolveCapacity(options?.capacity);
    this.#clock = options?.clock ?? Date.now;
    this.#aborted = this.#wireAbortSignal(options?.signal);
  }

  static #resolveCapacity(rawCapacity: number | undefined): number {
    const capacity = rawCapacity ?? Infinity;
    if (capacity !== undefined && (capacity <= 0 || Number.isNaN(capacity))) {
      throw new ResilienceConfigError('capacity must be > 0');
    }
    return capacity;
  }

  #wireAbortSignal(signal: AbortSignal | undefined): boolean {
    if (signal === undefined) { return false; }
    if (signal.aborted) { return true; }
    signal.addEventListener('abort', () => { this.#abort(); }, { 'once': true });
    return false;
  }

  get size(): number { const result = this.#entries.length;
    return result; }
  get closed(): boolean { const result = this.#closed;
    return result; }

  /** Throws DeadLetterQueueFullError | DeadLetterQueueClosedError | DeadLetterQueueAbortedError on failure. */
  enqueue(item: T, reason: string, error?: Error): void {
    if (this.#aborted) { throw new DeadLetterQueueAbortedError(); }
    if (this.#closed) { throw new DeadLetterQueueClosedError(); }
    if (this.#entries.length >= this.#capacity) {
      this.hooks.invoke('onOverflow', () => {
        const result = this.onOverflow();
        return result;
      });
      throw new DeadLetterQueueFullError();
    }
    this.#entries.push({ 'enqueuedAtMs': this.#clock(), 'error': error, 'id': crypto.randomUUID(), 'item': item, 'reason': reason });
    this.wakeDrainWaiters();
    this.hooks.invoke('onEnqueue', () => {
      const result = this.onEnqueue(item);
      return result;
    });
  }

  /** Single-consumer by default — a second concurrent drain() call replaces the previously registered waiter. Override `registerDrainWaiter`/`wakeDrainWaiters` for consumer-side fan-out. */
  async *drain(): AsyncGenerator<DeadLetterQueueEntryInterface<T>> {
    while (true) {
      const entry = this.#entries.shift();
      if (entry !== undefined) {
        this.#pendingDequeueItem = { 'item': entry.item };
        this.hooks.invoke('onDequeue', this.#onDequeueHook);
        yield entry;
        continue;
      }
      if (this.#closed || this.#aborted) { return; }
      await new Promise<void>(this.#registerDrainWaiterExecutor);
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
   * Fires when `enqueue()` is called on a full queue, before throwing DeadLetterQueueFullError.
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
