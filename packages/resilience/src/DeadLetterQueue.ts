/** Bounded FIFO DLQ with async-generator drain; enqueue() throws on capacity/closed/aborted. */
import { HookInvoker, RuntimeError } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

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

class DeadLetterQueueInstance {
  static belongsTo<TInstance extends object>(
    constructor: DeadLetterQueueSubclassInterface<TInstance>,
    value: object
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

export class DeadLetterQueue<T> {
  static readonly #OwnedHookInvoker = class DeadLetterQueueHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  readonly #capacity: number;
  readonly #clock: () => number;
  readonly #entries: DeadLetterQueueEntryInterface<T>[] = [];
  #closed = false;
  #aborted = false;
  #notifyDrain: (() => void) | null = null;
  #pendingDequeueItem: T | undefined;

  /** Built once and reused across `drain()` iterations to avoid rebuilding a closure on every loop pass. */
  readonly #onDequeueHook = (): void => {
    this.onDequeue(this.#pendingDequeueItem as T);
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
    if (!Predicates.isObjectLike(result) || !DeadLetterQueueInstance.belongsTo(resolveSubclassConstructor(), result)) {
      throw RuntimeError.create('DeadLetterQueue.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected constructor(options?: DeadLetterQueueOptionsInterface) {
    this.hooks = new DeadLetterQueue.#OwnedHookInvoker();
    const capacity = options?.capacity ?? Infinity;
    if (capacity !== undefined && (capacity <= 0 || Number.isNaN(capacity))) {
      throw new ResilienceConfigError('capacity must be > 0');
    }
    this.#capacity = capacity;
    this.#clock = options?.clock ?? Date.now;
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
        this.#pendingDequeueItem = entry.item;
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
