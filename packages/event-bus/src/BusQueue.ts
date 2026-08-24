/** Bounded async FIFO queue with backpressure; enqueue blocks at highWaterMark. */

import { CircularBuffer } from '@studnicky/circular-buffer';
import { HookInvoker } from '@studnicky/errors';
import { Guard } from '@studnicky/types';

import type { BusQueueCreateOptionsInterface } from './BusQueueCreateOptionsInterface.js';
import type { BusQueueAbortedStateEntity } from './entities/BusQueueAbortedStateEntity.js';
import type { BusQueueAbortEventEntity } from './entities/BusQueueAbortEventEntity.js';
import type { BusQueueAbortingStateEntity } from './entities/BusQueueAbortingStateEntity.js';
import type { BusQueueDrainingStateEntity } from './entities/BusQueueDrainingStateEntity.js';
import type { BusQueueLoopFinishedEventEntity } from './entities/BusQueueLoopFinishedEventEntity.js';
import type { BusQueueOpenStateEntity } from './entities/BusQueueOpenStateEntity.js';
import type { BusQueueStartLoopEventEntity } from './entities/BusQueueStartLoopEventEntity.js';

import { BusQueueLifecycleMachine } from './BusQueueLifecycleMachine.js';
import {
  BUS_QUEUE_DEFAULT_HIGH_WATER_MARK,
  BUS_QUEUE_DEFAULT_WAITER_CAPACITY
} from './constants/index.js';
import { BusQueueConfigError } from './errors/BusQueueConfigError.js';

/** Swallows hook failures rather than throwing — a queue processing loop must not halt because an observer hook threw. */
class BusQueueHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string): void {}
}

class BusQueueEntry<T> {
  readonly item: T;
  readonly ready: Promise<void>;
  readonly #resolveReady: () => void;
  #cancelled = false;

  constructor(item: T) {
    const readiness = Promise.withResolvers<void>();
    this.item = item;
    this.ready = readiness.promise;
    this.#resolveReady = readiness.resolve;
  }

  get cancelled(): boolean {
    const result = this.#cancelled;
    return result;
  }

  cancel(): void {
    this.#cancelled = true;
    this.#resolveReady();
  }

  release(): void {
    this.#resolveReady();
  }
}

interface BusQueueSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class BusQueueInstance {
  static belongsTo<TInstance extends object>(
    constructor: BusQueueSubclassInterface<TInstance>,
    value: object
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

// T only appears in BusQueue's covariant/contravariant members (enqueue()'s item,
// the handler passed to create()), so a bound of `BusQueue<T>` would force
// `BusQueue<T>` (the method's own general T) to satisfy `BusQueue<never>`/
// `BusQueue<any>`, which either fails to typecheck or requires a banned `any`.
// `drain()` is a public member that doesn't mention T at all, so it constrains
// TInstance to "is actually BusQueue-shaped" without hitting that wall.
interface BusQueueShapeInterface {
  drain(): Promise<void>;
}

export class BusQueue<T> {
  protected readonly hooks: HookInvoker = new BusQueueHookInvoker();
  readonly #handler: (item: T) => Promise<void>;
  readonly #hwm: number;
  readonly #onError: ((error: unknown) => void) | undefined;
  readonly #queue: CircularBuffer<BusQueueEntry<T>>;
  readonly #backpressureWaiters: CircularBuffer<{ 'resolve': () => void }>;
  readonly #drainWaiters: { 'resolve': () => void }[] = [];
  readonly #machine = new BusQueueLifecycleMachine();
  #lifecycleState: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type
    = this.#machine.getInitialState();
  // Not representable in the lifecycle FSM's state: `#drainTask` holds a live
  // Promise (not the serializable-shaped data an FSM state variant models)
  // and memoizes the in-flight drain loop so concurrent `drain()` callers
  // await the same awaitable instead of each registering a waiter. `#activeEntry`
  // holds a live `BusQueueEntry` (with its own promise/closures) so `abort`'s
  // `releaseForAbort` effect has something concrete to cancel. Both are
  // bookkeeping the FSM's `variant` alone cannot carry — same reasoning as
  // `Paginator` keeping non-serializable data outside its owned machine.
  #drainTask: Promise<void> | undefined = undefined;
  #activeEntry: BusQueueEntry<T> | undefined = undefined;

  static create<
    T,
    TInstance extends BusQueueShapeInterface = BusQueue<T>
  >(
    this: BusQueueSubclassInterface<TInstance>,
    options: BusQueueCreateOptionsInterface<T>
  ): TInstance {
    // Lexical arrow closure over `this` (rather than `Reflect.construct(this, ...)`
    // passing `this` directly as a call argument) so the receiver is obtained
    // only through the rule-permitted `return this` form.
    const getConstructor = (): BusQueueSubclassInterface<TInstance> => { return this; };
    const constructor = getConstructor();
    const result: unknown = Reflect.construct(constructor, [options]);
    if (!Guard.isObjectLike(result) || !BusQueueInstance.belongsTo(constructor, result)) {
      throw new TypeError('BusQueue.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected constructor(options: BusQueueCreateOptionsInterface<T>) {
    if (typeof options.handler !== 'function') {
      throw new BusQueueConfigError('BusQueue.create(options): options.handler must be a function');
    }
    const hwmOption = options.highWaterMark;
    if (hwmOption !== undefined && (!Number.isInteger(hwmOption) || hwmOption <= 0)) {
      throw new BusQueueConfigError('highWaterMark must be a positive integer');
    }
    this.#handler = options.handler;
    this.#hwm = hwmOption ?? BUS_QUEUE_DEFAULT_HIGH_WATER_MARK;
    this.#onError = options.onError;
    this.#queue = CircularBuffer.create<BusQueueEntry<T>>({
      'capacity': this.#hwm,
      'overflow': 'grow'
    });
    this.#backpressureWaiters = CircularBuffer.create<{ 'resolve': () => void }>({
      'capacity': BUS_QUEUE_DEFAULT_WAITER_CAPACITY,
      'overflow': 'grow'
    });
    const signal = options.signal;
    if (signal !== undefined) {
      if (signal.aborted) {
        this.#handleAbort();
      } else {
        signal.addEventListener('abort', () => { this.#handleAbort(); }, { 'once': true });
      }
    }
  }

  get size(): number {
    const result = this.#queue.length;
    return result;
  }

  async enqueue(item: T): Promise<void> {
    if (this.#isAborted()) {
      await this.hooks.invokeAsync('onDrop', () => { const result = this.onDrop(); return result; });
      return;
    }
    const entry = new BusQueueEntry(item);
    this.#queue.push(entry);
    const depth = this.#queue.length;
    this.#scheduleLoop();
    // Register the backpressure waiter synchronously, before any hook `await` —
    // `HookInvoker.invokeAsync` always yields a real microtask, even for a
    // synchronous hook body, which would let the drain loop race ahead and shift
    // this item before its waiter existed, leaking a waiter that never resolves.
    const overflowed = depth >= this.#hwm;
    const backpressure = overflowed
      ? new Promise<void>((resolve) => { this.#backpressureWaiters.push({ 'resolve': resolve }); })
      : undefined;
    try {
      await this.hooks.invokeAsync('onEnqueue', async () => {
        try {
          await this.onEnqueue(depth);
        } catch (error: unknown) {
          entry.cancel();
          throw error;
        }
      });
      if (overflowed) {
        await this.hooks.invokeAsync('onOverflow', async () => {
          try {
            await this.onOverflow(depth);
          } catch (error: unknown) {
            entry.cancel();
            throw error;
          }
        });
      }
    } catch (error: unknown) {
      entry.cancel();
      throw error;
    } finally {
      entry.release();
    }
    if (backpressure !== undefined) { await backpressure; }
  }

  async drain(): Promise<void> {
    // A drain loop in flight may have already shifted the last item off #queue
    // (so #queue.length reads 0) while that item's handler is still running —
    // only the absence of an active loop means nothing is left to wait for.
    if ((this.#queue.length === 0 && !this.#isDraining()) || this.#isAborted()) { return; }
    const drainTask = this.#drainTask;
    if (drainTask !== undefined) {
      await drainTask;
      return;
    }
    await new Promise<void>((resolve) => {
      this.#drainWaiters.push({ 'resolve': resolve });
    });
  }

  /** `true` from the instant abort is requested (`aborting`) through the terminal `aborted` state — mirrors what the old `#aborted` boolean tracked. */
  #isAborted(): boolean {
    const variant = this.#lifecycleState.variant;
    const result = variant === 'aborting' || variant === 'aborted';
    return result;
  }

  /** `true` while a drain loop is running, including while it is winding down after an abort request — mirrors what the old `#draining` boolean tracked. */
  #isDraining(): boolean {
    const variant = this.#lifecycleState.variant;
    const result = variant === 'draining' || variant === 'aborting';
    return result;
  }

  /** Dispatches `event` through the lifecycle machine, commits the resulting state, and runs the effects it returns. */
  #dispatch(event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type): void {
    const step = this.#machine.transition(this.#lifecycleState, event);
    this.#lifecycleState = step.state;
    const effects = step.effects;
    const effectsLength = effects.length;
    for (let i = 0; i < effectsLength; i++) {
      const effect = effects.at(i);
      if (effect === undefined) { continue; }
      switch (effect.variant) {
        case 'releaseForAbort': this.#releaseForAbort(); break;
      }
    }
  }

  /** Cancels the active entry (if any) and releases every waiting backpressure/drain caller. */
  #releaseForAbort(): void {
    this.#activeEntry?.cancel();
    let waiter = this.#backpressureWaiters.shift();
    while (waiter !== undefined) {
      waiter.resolve();
      waiter = this.#backpressureWaiters.shift();
    }
    let drainWaiter = this.#drainWaiters.shift();
    while (drainWaiter !== undefined) {
      drainWaiter.resolve();
      drainWaiter = this.#drainWaiters.shift();
    }
  }

  #handleAbort(): void {
    // Defensive: `BusQueue` only ever wires one abort call site per instance
    // (the constructor's already-aborted check and the signal listener are
    // mutually exclusive), so this should never actually run twice — but
    // unlike the old bare `#aborted = true` assignment, a genuine second call
    // would hit the machine's terminal `aborted` state and throw rather than
    // silently re-running cancellation against already-cleared bookkeeping.
    // Guard rather than let that surface as an uncaught exception from an
    // AbortSignal listener.
    if (this.#lifecycleState.variant === 'aborted') { return; }
    this.#dispatch({ 'type': 'abort' });
  }

  #scheduleLoop(): void {
    if (this.#lifecycleState.variant !== 'open') { return; }
    this.#dispatch({ 'type': 'startLoop' });
    queueMicrotask(() => {
      this.#drainTask = this.#runDrainLoop();
    });
  }

  async #tryHandleItem(item: T): Promise<void> {
    try {
      await this.#handler(item);
    } catch (error: unknown) {
      const onError = this.#onError;
      if (onError !== undefined) {
        await this.hooks.invokeAsync('onError', () => {
          const result = onError(error);
          return result;
        });
      }
      await this.hooks.invokeAsync('onHandlerError', () => { const result = this.onHandlerError(error); return result; });
    }
  }

  async #processEntry(entry: BusQueueEntry<T>): Promise<void> {
    this.#activeEntry = entry;
    try {
      const waiter = this.#backpressureWaiters.shift();
      if (waiter !== undefined) { waiter.resolve(); }
      await entry.ready;
      if (!entry.cancelled && !this.#isAborted()) {
        await this.hooks.invokeAsync('onDequeue', () => {
          const result = this.onDequeue(this.#queue.length);
          return result;
        });
        await this.#tryHandleItem(entry.item);
      }
    } finally {
      this.#activeEntry = undefined;
    }
  }

  async #runDrainLoop(): Promise<void> {
    try {
      while (this.#queue.length > 0 && this.#lifecycleState.variant === 'draining') {
        const entry = this.#queue.shift();
        if (entry === undefined) { break; }
        await this.#processEntry(entry);
      }
    } catch (error: unknown) {
      const onError = this.#onError;
      if (onError !== undefined) {
        await this.hooks.invokeAsync('onError', () => {
          const result = onError(error);
          return result;
        });
      }
    } finally {
      this.#dispatch({ 'type': 'loopFinished' });
      this.#drainTask = undefined;
      if (this.#queue.length === 0 || this.#isAborted()) {
        let drainWaiter = this.#drainWaiters.shift();
        while (drainWaiter !== undefined) {
          drainWaiter.resolve();
          drainWaiter = this.#drainWaiters.shift();
        }
      }
    }
  }

  /** Admission hook after push; handler delivery waits for completion. */
  protected onEnqueue(_depth: number): void | Promise<void> {}

  /** Fires when an item is removed from the queue for processing (after shift). */
  protected onDequeue(_depth: number): void | Promise<void> {}

  /** Fires when enqueue is called but the queue is already aborted (item silently dropped). */
  protected onDrop(): void | Promise<void> {}

  /** Admission hook at highWaterMark; handler delivery waits for completion. */
  protected onOverflow(_depth: number): void | Promise<void> {}

  /** Fires after handler throws and onError callback (if any) has been called. */
  protected onHandlerError(_error: unknown): void | Promise<void> {}
}
