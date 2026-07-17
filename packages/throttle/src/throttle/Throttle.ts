import { CircularBuffer } from '@studnicky/circular-buffer';
import { ConfigValidation } from '@studnicky/config';
import { HookInvocationError, HookInvoker } from '@studnicky/errors';
import { SampleBuffer } from '@studnicky/sample-buffer';

import type { AbortResultEntity } from '../entities/AbortResultEntity.js';
import type { AdaptiveConfigEntity } from '../entities/AdaptiveConfigEntity.js';
import type { ThrottleStatsEntity } from '../entities/ThrottleStatsEntity.js';
import type { ThrottleInterface } from '../interfaces/index.js';
import type { ThrottleStateType } from '../types/ThrottleStateType.js';

import {
  ADAPTIVE_CONFIG_KEYS,
  DEFAULT_ADAPTIVE_CONFIG,
  DEFAULT_BUFFER_CAPACITY,
  DEFAULT_THROTTLE_CONCURRENCY,
  DEFAULT_TIMEOUT,
  EMPTY_LENGTH,
  FIRST_ARRAY_INDEX,
  INITIAL_COUNTER,
  MIN_ADJUSTMENT_INTERVAL,
  MIN_SAMPLE_WINDOW,
  NO_DELAY_MS,
  PERCENTILE_P50,
  PERCENTILE_P95,
  PERCENTILE_P99
} from '../constants/index.js';
import { ThrottleConfigEntity } from '../entities/ThrottleConfigEntity.js';
import {
  ConfigurationError,
  ThrottleAbortedError,
  ThrottleDrainingError
} from '../errors/index.js';
import { Delay } from './Delay.js';
import { ThrottleBuilder } from './ThrottleBuilder.js';

type AdaptiveConfigType = AdaptiveConfigEntity.Type;
type ThrottleConfigType = ThrottleConfigEntity.Type;
type ValidatedThrottleConfigType = ThrottleConfigEntity.ValidatedThrottleConfigType;

type AdaptiveConfig = NonNullable<ValidatedThrottleConfigType['adaptive']>;

/**
 * Tracks an active operation for detach-and-abandon abort support
 */
// json-schema-uninexpressible: 'resolve' is a function type (the Promise executor's resolve callback),
// not representable in JSON Schema.
type ActiveOperationType = {
  /**
   * Whether the operation has completed (naturally or via abort)
   */
  'completed': boolean;

  /**
   * Resolves the execute() promise with undefined (aborted state)
   */
  'resolve': () => void;
};

/**
 * Generic async operation throttle with abort support
 *
 * Maintains a sliding window of N concurrent operations.
 * As soon as one operation completes, the next queued operation starts.
 *
 * Default concurrency limit is 10.
 *
 * Abort behavior (detach-and-abandon):
 * - Queued operations: resolve with undefined, never start
 * - Active operations: resolve with undefined immediately, underlying function continues but result is discarded
 * - New operations after abort: throw ThrottleAbortedError
 *
 * @example Basic throttling
 * ```typescript
 * const throttle = Throttle.create();
 *
 * const results = await Promise.all(
 *   urls.map(url => throttle.execute(async () => fetch(url)))
 * );
 * ```
 *
 * @example Abort all operations
 * ```typescript
 * const throttle = Throttle.create({ concurrencyLimit: 5 });
 *
 * const operations = urls.map(url =>
 *   throttle.execute(async () => fetch(url))
 * );
 *
 * // Abort immediately - all pending execute() promises resolve with undefined
 * const result = await throttle.abort();
 * console.log(`Cancelled: ${result.cancelled}`);
 * ```
 *
 * @example Graceful shutdown with timeout
 * ```typescript
 * const throttle = Throttle.create({ concurrencyLimit: 10 });
 *
 * const operations = urls.map(url =>
 *   throttle.execute(async () => fetch(url))
 * );
 *
 * // On shutdown, give 5 seconds to complete then force abort
 * process.on('SIGTERM', async () => {
 *   const result = await throttle.abort({ timeout: 5000 });
 *   console.log(`Completed: ${result.completed}, Cancelled: ${result.cancelled}`);
 *   process.exit(0);
 * });
 * ```
 */
export class Throttle implements ThrottleInterface {
  /**
   * Factory method to create a new Throttle instance
   *
   * @param config - Optional configuration options
   * @returns New Throttle instance
   *
   * @example
   * ```typescript
   * const throttle = Throttle.create({ concurrencyLimit: 5 });
   * ```
   */
  static create(config?: Partial<ThrottleConfigType>): Throttle {
    const result = new this(config);
    return result;
  }

  /**
   * Return a fluent builder for creating Throttle instances
   *
   * @returns ThrottleBuilder instance
   *
   * @example
   * ```typescript
   * const throttle = Throttle.builder()
   *   .withConcurrencyLimit(5)
   *   .build();
   * ```
   */
  static builder(): ThrottleBuilder {
    const factory = (options: Partial<ThrottleConfigType>): Throttle => {
      const instance = Throttle.create(options);
      return instance;
    };
    return ThrottleBuilder.create(factory);
  }

  /**
   * FSM state. Transitions via transition().
   */
  #state: ThrottleStateType = 'idle';

  private activeCount = INITIAL_COUNTER;
  private readonly activeOperations = new Set<ActiveOperationType>();
  private adjustmentCount = INITIAL_COUNTER;
  private completionPromise: null | Promise<void> = null;
  private config: ValidatedThrottleConfigType;
  protected readonly hooks: HookInvoker = new HookInvoker();
  private lastAdjustmentTime = INITIAL_COUNTER;
  private readonly latencyBuffer: SampleBuffer | undefined;
  private readonly observers: (() => void)[] = [];
  private readonly queue: CircularBuffer<{
    'reject': (error: Error) => void;
    'resolve': () => void;
  }>;

  private totalExecuted = INITIAL_COUNTER;

  /**
   * Create a new Throttle instance
   *
   * @param config - Throttle configuration
   * @param config.concurrencyLimit - Maximum concurrent operations (default: 10)
   *
   * @throws {ConfigurationError} When concurrencyLimit is not a positive integer
   *
   * @example Default throttle (limit of 10)
   * ```typescript
   * const throttle = Throttle.create();
   * ```
   *
   * @example Custom concurrency limit
   * ```typescript
   * const throttle = Throttle.create({ concurrencyLimit: 5 });
   * ```
   */
  protected constructor(config?: Partial<ThrottleConfigType>) {
    this.config = Throttle.validateConfig(config);
    this.queue = CircularBuffer.create({ 'capacity': DEFAULT_BUFFER_CAPACITY, 'overflow': 'grow' });

    const buffer: SampleBuffer | undefined = this.config.adaptive?.enabled === true
      ? SampleBuffer.create({ 'capacity': this.config.adaptive.sampleWindow })
      : undefined;

    this.latencyBuffer = buffer;
  }

  // ── FSM ─────────────────────────────────────────────────────────────────────

  /**
   * Transition the FSM to a new state.
   *
   * Calls guard(from, to); throws on an illegal edge. Updates #state.
   * Calls onEnter(to, from) after the state change.
   *
   * @throws {Error} When the transition is not permitted by guard().
   */
  protected transition(to: ThrottleStateType): void {
    const from = this.#state;

    if (!this.guard(from, to)) {
      throw new Error(`Illegal state transition: ${from} → ${to}`);
    }

    this.#state = to;

    // Synchronous by design: transition() is invoked from both synchronous callers
    // (acquireSlot(), releaseSlot() via notifyObservers()) and async callers
    // (abort(), drain()) — awaiting here would force the synchronous callers async.
    // This only catches a synchronous throw from onEnter; an async override's
    // rejection is unhandled — an accepted, documented trade-off for this call site.
    try {
      this.onEnter(to, from);
    } catch (cause) {
      throw new HookInvocationError('onEnter', cause);
    }
  }

  /**
   * Guard: returns true when the from → to edge is legal.
   *
   * Legal edges:
   * - idle     → active   (first slot acquired)
   * - active   → idle     (all slots released, queue empty)
   * - idle     → draining (drain() called while idle)
   * - active   → draining (drain() called while active)
   * - draining → idle     (drained: all ops complete)
   * - *        → aborted  (abort() called from any state except aborted itself)
   */
  protected guard(from: ThrottleStateType, to: ThrottleStateType): boolean {
    if (from === 'aborted') {return false;}          // aborted is terminal
    if (to === 'aborted') {return true;}             // any non-aborted → aborted
    if (from === 'idle' && to === 'active') {return true;}
    if (from === 'active' && to === 'idle') {return true;}
    if (from === 'idle' && to === 'draining') {return true;}
    if (from === 'active' && to === 'draining') {return true;}
    if (from === 'draining' && to === 'idle') {return true;}
    return false;
  }

  /**
   * Hook called when the FSM enters a new state.
   * Subclasses override to react to transitions.
   */
  protected onEnter(_to: ThrottleStateType, _from: ThrottleStateType): void {}

  /**
   * The current FSM state.
   */
  protected get state(): ThrottleStateType {
    const result = this.#state;
    return result;
  }

  // ── Operations ───────────────────────────────────────────────────────────────

  /**
   * Forcefully abort the throttle and cancel ALL operations
   *
   * Uses detach-and-abandon pattern:
   * - Queued operations: resolve with undefined, never start
   * - Active operations: resolve with undefined immediately, underlying function continues but result is discarded
   * - New operations after abort: throw ThrottleAbortedError
   *
   * @param options.timeout Milliseconds grace period before force abort (default: 0 = immediate)
   * @returns Promise resolving to abort statistics
   *
   * @example Immediate abort - cancel everything now
   * ```typescript
   * const result = await throttle.abort();
   * console.log(`Cancelled: ${result.cancelled}`);
   * ```
   *
   * @example Graceful abort - give operations time to complete
   * ```typescript
   * // Wait up to 5 seconds for operations to complete, then force abort
   * const result = await throttle.abort({ timeout: 5000 });
   * if (result.timedOut) {
   *   console.log(`Timeout reached, force cancelled ${result.cancelled} operations`);
   * }
   * ```
   */
  async abort(options?: { 'timeout'?: number }): Promise<AbortResultEntity.Type> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    if (this.#state === 'aborted') {
      return {
        'cancelled': INITIAL_COUNTER,
        'completed': INITIAL_COUNTER,
        'timedOut': false
      };
    }

    const startTotal = this.totalExecuted;

    // Transition to draining for the grace period (if not already draining)
    if (this.#state !== 'draining') {
      this.transition('draining');
    }

    const timedOut = await this.handleGracePeriod(timeout);

    this.transition('aborted');

    const cancelledCount = this.activeOperations.size + this.queue.length;

    // abort() is already async and all accounting for the abort decision is
    // already committed above (state transitioned, cancelledCount computed) —
    // awaiting here cannot race with a concurrent synchronous call. cancelActiveOperations(),
    // drainQueue(), and notifyObservers() unblock OTHER callers (queued/active
    // execute() promises, drain()/waitForCompletion() waiters) and must run
    // unconditionally, so a hook failure is captured and rethrown only after
    // that cleanup completes.
    let abortHookError: unknown;

    try {
      await Promise.resolve(this.hooks.invoke('onAbortStart', () => {
        const result = this.onAbortStart(cancelledCount);
        return result;
      }));
    } catch (error) {
      abortHookError = error;
    }

    this.cancelActiveOperations();
    this.drainQueue();
    this.notifyObservers();

    if (abortHookError !== undefined) {
      throw abortHookError;
    }

    return {
      'cancelled': cancelledCount,
      'completed': this.totalExecuted - startTotal,
      'timedOut': timedOut
    };
  }

  /**
   * Acquire a concurrency slot
   * Synchronously increments activeCount to prevent race conditions
   */
  private async acquireSlot(): Promise<void> {
    if (this.activeCount < this.config.concurrencyLimit) {
      if (this.activeCount === INITIAL_COUNTER && this.#state === 'idle') {
        this.transition('active');
      }
      this.activeCount++;

      // Accounting (transition + activeCount++) is already committed above, so
      // awaiting here is safe — a concurrent synchronous acquireSlot() call sees
      // the updated activeCount regardless of when this hook settles. If the hook
      // fails, the slot was never actually put to use, so it is rolled back via
      // releaseSlot() before the failure propagates to the caller.
      try {
        await Promise.resolve(this.hooks.invoke('onAcquire', () => {
          const result = this.onAcquire(this.activeCount, this.queue.length);
          return result;
        }));
      } catch (error) {
        this.releaseSlot();
        throw error;
      }

      return;
    }

    // Kept synchronous: onContended fires before this caller is pushed onto the
    // queue. Awaiting here would let a concurrently-contended caller's push()
    // interleave ahead of this one, reversing FIFO queue order — an invariant
    // the queue depth/order assertions in hooks.test.ts depend on. This only
    // catches a synchronous throw; an async override's rejection is unhandled,
    // an accepted, documented trade-off for this call site.
    try {
      this.onContended(this.activeCount, this.queue.length);
    } catch (cause) {
      throw new HookInvocationError('onContended', cause);
    }

    await new Promise<void>((resolve, reject) => {
      this.queue.push({
        'reject': reject,
        'resolve': resolve
      });

      // onAcquireWait fires from inside a Promise executor, which must stay
      // synchronous per the Promise constructor contract — it cannot be awaited
      // here. A synchronous throw from hooks.invoke propagates out of this
      // executor and is caught by the enclosing `new Promise(...)` itself
      // (standard executor semantics), safely rejecting this promise; wrapping
      // the call in `Promise.resolve` lets the same `.catch` also handle the
      // case where an async-override hook rejects later, since `hooks.invoke`
      // does not always return a Promise.
      Promise.resolve(this.hooks.invoke('onAcquireWait', () => {
        const result = this.onAcquireWait(this.queue.length);
        return result;
      }))
        .catch((error: unknown) => { reject(error); });
    });
  }

  /**
   * Calculate new concurrency limit based on latency
   */
  private calculateNewLimit(
    adaptive: AdaptiveConfig,
    p95: number
  ): number {
    if (p95 < adaptive.targetLatencyMs * adaptive.scaleUpThreshold
        && this.config.concurrencyLimit < adaptive.maxConcurrency) {
      return this.scaleConcurrency(adaptive, p95, 'up');
    }

    if (p95 > adaptive.targetLatencyMs * adaptive.scaleDownThreshold
        && this.config.concurrencyLimit > adaptive.minConcurrency) {
      return this.scaleConcurrency(adaptive, p95, 'down');
    }

    return this.config.concurrencyLimit;
  }

  /**
   * Cancel all active operations by resolving them with undefined
   */
  private cancelActiveOperations(): void {
    for (const operation of this.activeOperations) {
      if (!operation.completed) {
        operation.completed = true;
        operation.resolve();
      }
    }
    this.activeOperations.clear();
    this.activeCount = INITIAL_COUNTER;
  }

  /**
   * Enter draining mode to stop accepting new operations and wait for completion
   *
   * Sets the throttle to draining mode, preventing new operations from being queued
   * while waiting for active and already-queued operations to complete normally.
   * Use this for graceful shutdown where you want queued work to finish.
   *
   * @returns Promise that resolves when all operations complete
   *
   * @example Graceful shutdown
   * ```typescript
   * // Stop accepting new operations and wait for completion
   * await throttle.drain();
   * console.log('All operations completed gracefully');
   * await cleanupResources();
   * ```
   */
  async drain(): Promise<void> {
    if (this.#state === 'draining' || this.#state === 'aborted') {
      return await this.waitForCompletion();
    }

    this.transition('draining');

    // drain() is already async and the state transition above is already
    // committed — awaiting here cannot race with a concurrent synchronous call.
    await Promise.resolve(this.hooks.invoke('onDrainStart', () => {
      const result = this.onDrainStart(this.activeCount, this.queue.length);
      return result;
    }));

    return await this.waitForCompletion();
  }

  /**
   * Drain the queue by resolving all pending operations with undefined
   */
  private drainQueue(): void {
    while (this.queue.length > EMPTY_LENGTH) {
      const pendingTask = this.queue.shift();

      if (pendingTask !== undefined) {
        pendingTask.resolve();
      }
    }
  }

  /**
   * Execute an async operation with throttling
   *
   * @param fn - Async function to execute
   * @returns Promise that resolves to the function's return value, or undefined if aborted
   *
   * @example Basic throttling
   * ```typescript
   * const result = await throttle.execute(async () => {
   *   return fetch(url);
   * });
   * ```
   */
  async execute<T>(fn: () => Promise<T>): Promise<T | undefined> {
    this.validateExecuteState();

    return await new Promise<T | undefined>((resolveExecute, rejectExecute) => {
      this.acquireSlot().then(() => {
        if (this.#state === 'aborted') {
          resolveExecute(undefined);

          return;
        }

        const resolveOperation = (): void => { resolveExecute(undefined); };
        const operation: ActiveOperationType = {
          'completed': false,
          'resolve': resolveOperation
        };

        this.activeOperations.add(operation);

        const operationStartTime = Date.now();

        try {
          // handleOperationSuccess/handleOperationError may now throw a
          // HookInvocationError (a lifecycle hook they invoke can fail) — the
          // appended .catch(rejectExecute) is the safety net so that failure
          // rejects execute() instead of becoming an unhandled rejection.
          fn().then(
            (result) => { this.handleOperationSuccess(operation, result, operationStartTime, resolveExecute); },
            (error) => { this.handleOperationError(operation, error, rejectExecute); }
          ).catch(rejectExecute);
        } catch (error) {
          this.handleOperationError(operation, error, rejectExecute);
        }
      })
        .catch(rejectExecute);
    });
  }

  /**
   * Get current throttle statistics
   *
   * @returns Throttle statistics object
   * @returns stats.activeCount - Currently executing operations
   * @returns stats.queuedCount - Operations waiting in queue
   * @returns stats.totalExecuted - Total operations executed
   * @returns stats.concurrencyLimit - Maximum concurrent operations
   * @returns stats.isDraining - Whether the throttle is in draining mode
   * @returns stats.isAborted - Whether the throttle has been aborted
   *
   * @example Monitor throttle state
   * ```typescript
   * const stats = throttle.getStats();
   * console.log(`Active: ${stats.activeCount}/${stats.concurrencyLimit}`);
   * console.log(`Queued: ${stats.queuedCount}`);
   * ```
   */
  getStats(): ThrottleStatsEntity.Type {
    const stats: ThrottleStatsEntity.Type = {
      'activeCount': this.activeCount,
      'concurrencyLimit': this.config.concurrencyLimit,
      'isAborted': this.#state === 'aborted',
      'isDraining': this.#state === 'draining',
      'queuedCount': this.queue.length,
      'totalExecuted': this.totalExecuted
    };

    if (this.latencyBuffer !== undefined) {
      const p50 = this.latencyBuffer.percentile(PERCENTILE_P50);
      const p95 = this.latencyBuffer.percentile(PERCENTILE_P95);
      const p99 = this.latencyBuffer.percentile(PERCENTILE_P99);

      stats.latency = {
        ...(p50 !== undefined ? { 'p50': p50 } : {}),
        ...(p95 !== undefined ? { 'p95': p95 } : {}),
        ...(p99 !== undefined ? { 'p99': p99 } : {}),
        'sampleCount': this.latencyBuffer.length
      };
    }

    if (this.config.adaptive?.enabled === true) {
      stats.adaptive = {
        'adjustmentCount': this.adjustmentCount,
        'enabled': true,
        'lastAdjustmentTime': this.lastAdjustmentTime,
        'maxConcurrency': this.config.adaptive.maxConcurrency,
        'minConcurrency': this.config.adaptive.minConcurrency,
        'targetLatencyMs': this.config.adaptive.targetLatencyMs
      };
    }

    return stats;
  }

  /**
   * Handle grace period wait
   */
  private async handleGracePeriod(timeout: number): Promise<boolean> {
    if (timeout <= DEFAULT_TIMEOUT || this.isComplete()) {
      return false;
    }

    return await this.waitForGracePeriod(timeout);
  }

  /**
   * Handle operation error
   */
  private handleOperationError(
    operation: ActiveOperationType,
    error: unknown,
    rejectExecute: (error: unknown) => void
  ): void {
    if (operation.completed) {
      return;
    }

    operation.completed = true;
    this.activeOperations.delete(operation);

    // Kept synchronous: handleOperationError runs inside a .then() rejection
    // callback that execute() does not await, so awaiting here would not delay
    // anything meaningful and only adds complexity. The slot is always released
    // regardless of hook outcome.
    try {
      this.onReject(error);
    } catch (cause) {
      this.releaseSlot();
      throw new HookInvocationError('onReject', cause);
    }

    this.releaseSlot();
    rejectExecute(error);
  }

  /**
   * Handle successful operation completion
   */
  private handleOperationSuccess<T>(
    operation: ActiveOperationType,
    result: T,
    operationStartTime: number,
    resolveExecute: (value: T | undefined) => void
  ): void {
    if (operation.completed) {
      return;
    }

    operation.completed = true;
    this.activeOperations.delete(operation);
    this.totalExecuted++;

    if (this.latencyBuffer !== undefined) {
      const duration = Date.now() - operationStartTime;

      this.latencyBuffer.push(duration);

      try {
        this.maybeAdjustConcurrency();
      } catch (error) {
        // maybeAdjustConcurrency already throws a HookInvocationError (from
        // scaleConcurrency's onAdaptiveAdjust or processQueuedOperations'
        // onWindowSlide) — this operation's own slot still must be released.
        this.releaseSlot();
        throw error;
      }
    }

    this.releaseSlot();

    // Kept synchronous: handleOperationSuccess runs inside a .then() success
    // callback that execute() does not await, so awaiting here would not delay
    // anything meaningful. releaseSlot() has already committed accounting by
    // this point, so a failure here only affects this operation's own outcome.
    try {
      this.onRelease(this.activeCount, this.totalExecuted);
    } catch (cause) {
      throw new HookInvocationError('onRelease', cause);
    }

    resolveExecute(result);
  }

  /**
   * Check if the throttle has completed all operations
   *
   * @returns True if no operations are active or queued
   *
   * @example Check completion state
   * ```typescript
   * if (throttle.isComplete()) {
   *   console.log('Throttle has no pending work');
   * }
   * ```
   */
  isComplete(): boolean {
    return this.activeCount === INITIAL_COUNTER && this.queue.length === EMPTY_LENGTH;
  }

  /**
   * Adjust concurrency limit based on observed latencies
   *
   * Called after each successful operation. Scales up when latency is low,
   * scales down when latency approaches the target.
   */
  private maybeAdjustConcurrency(): void {
    const adaptive = this.config.adaptive;

    if (!this.shouldAdjustConcurrency(adaptive)) {
      return;
    }

    const p95 = this.latencyBuffer?.percentile(PERCENTILE_P95);

    if (p95 === undefined) {
      return;
    }

    const newLimit = this.calculateNewLimit(adaptive, p95);

    if (newLimit !== this.config.concurrencyLimit) {
      this.config.concurrencyLimit = newLimit;
      this.adjustmentCount++;
      this.processQueuedOperations();
    }

    this.lastAdjustmentTime = Date.now();
  }

  /**
   * Notify all observers that the throttle is now idle.
   *
   * Transitions active → idle or draining → idle when all work is complete.
   * No transition when aborted (terminal state).
   */
  private notifyObservers(): void {
    // Kept synchronous: notifyObservers() is invoked from releaseSlot(), which
    // must itself stay synchronous (see releaseSlot() below) — awaiting here
    // would cascade an async requirement up through releaseSlot(). This only
    // catches a synchronous throw; an async override's rejection is
    // unhandled, an accepted, documented trade-off for this call site.
    //
    // The transition to 'idle' and the full observer-notification loop below
    // unblock every other pending drain()/waitForCompletion() caller, so they
    // run unconditionally even when onDrainComplete throws, or when
    // transition('idle') itself throws (its onEnter hook can fail — #state is
    // already flipped to 'idle' by that point, but the throw would otherwise
    // skip the loop and reset below). The first captured hook failure is
    // rethrown only after that cleanup completes.
    let hookError: unknown;

    if (this.#state === 'draining') {
      try {
        this.onDrainComplete(this.totalExecuted);
      } catch (cause) {
        hookError = new HookInvocationError('onDrainComplete', cause);
      }

      try {
        this.transition('idle');
      } catch (transitionError) {
        hookError ??= transitionError;
      }
    } else if (this.#state === 'active') {
      try {
        this.transition('idle');
      } catch (transitionError) {
        hookError = transitionError;
      }
    }

    const length = this.observers.length;

    for (let i = FIRST_ARRAY_INDEX; i < length; i++) {
      const observer = this.observers[i];

      if (observer !== undefined) {
        observer();
      }
    }
    this.observers.length = EMPTY_LENGTH;
    this.completionPromise = null;

    if (hookError !== undefined) {
      throw hookError;
    }
  }

  /**
   * Fires when a slot is acquired immediately (activeCount < limit).
   */
  protected onAcquire(_activeCount: number, _queuedCount: number): void {}

  /**
   * Fires when a caller arrives at a fully-saturated window and is about to
   * be queued. Fires before onAcquireWait. Useful for detecting congestion.
   */
  protected onContended(_activeCount: number, _queuedCount: number): void {}

  /**
   * Fires immediately after a caller is pushed onto the queue because the
   * window is saturated. The argument is the queue length after enqueue.
   */
  protected onAcquireWait(_queuedCount: number): void {}

  /**
   * Fires each time a slot is granted to a previously-queued caller (i.e. the
   * sliding window advances and a waiter is dequeued). Fires before the
   * waiter's promise resolves. activeCount is the new in-flight count;
   * queuedCount is the remaining queue depth.
   */
  protected onWindowSlide(_activeCount: number, _queuedCount: number): void {}

  /**
   * Fires when abort is executed.
   */
  protected onAbortStart(_cancelledCount: number): void {}

  /**
   * Fires when adaptive concurrency adjusts the limit.
   */
  protected onAdaptiveAdjust(_previousLimit: number, _newLimit: number): void {}

  /**
   * Fires when drain is initiated.
   */
  protected onDrainStart(_activeCount: number, _queuedCount: number): void {}

  /**
   * Fires when a drain cycle completes — all queued and active operations
   * have finished and the throttle is about to transition draining → idle.
   * totalExecuted is the cumulative completed count at that moment.
   */
  protected onDrainComplete(_totalExecuted: number): void {}

  /**
   * Fires when an operation fails.
   */
  protected onReject(_reason: unknown): void {}

  /**
   * Fires when a slot is released.
   */
  protected onRelease(_activeCount: number, _totalExecuted: number): void {}

  /**
   * Process queued operations up to concurrency limit
   * @returns Number of operations dequeued
   */
  private processQueuedOperations(): number {
    let count = INITIAL_COUNTER;

    while (this.queue.length > EMPTY_LENGTH && this.activeCount < this.config.concurrencyLimit) {
      const pendingTask = this.queue.shift();

      if (pendingTask !== undefined) {
        this.activeCount++;

        // Kept synchronous: this runs inside a while loop mutating
        // activeCount/queue on every iteration — awaiting mid-loop would let a
        // concurrent acquire/release interleave and corrupt that accounting.
        // A hook failure here belongs to this specific queued caller, not to
        // whichever operation's completion triggered this dequeue cascade, so
        // it rejects that caller's own promise (rolling back the slot) and the
        // loop continues rather than propagating up to an unrelated caller.
        const hookError = Throttle.tryOnWindowSlide(this);

        if (hookError !== undefined) {
          this.activeCount--;
          pendingTask.reject(hookError);
          continue;
        }

        pendingTask.resolve();
        count++;
      }
    }

    return count;
  }

  /**
   * Release a concurrency slot and process queued operations
   */
  private releaseSlot(): void {
    this.activeCount--;

    if (this.queue.length > EMPTY_LENGTH) {
      this.activeCount++;
      const pendingTask = this.queue.shift();

      if (pendingTask !== undefined) {
        // Kept synchronous: same shift-then-resolve shape as
        // processQueuedOperations() — awaiting before pendingTask.resolve()
        // would let a concurrent acquire/release interleave and corrupt
        // activeCount/queue accounting. A failure here belongs to this
        // specific dequeued waiter, so it rejects that waiter's own promise
        // (rolling back the slot) rather than propagating to the operation
        // whose completion triggered this release.
        const hookError = Throttle.tryOnWindowSlide(this);

        if (hookError !== undefined) {
          this.activeCount--;
          pendingTask.reject(hookError);

          return;
        }

        pendingTask.resolve();

        // onRelease here describes the just-completed operation's own release
        // (accounting is already fully committed above), so a failure
        // propagates up to that operation's caller rather than to the waiter.
        try {
          this.onRelease(this.activeCount, this.totalExecuted);
        } catch (cause) {
          throw new HookInvocationError('onRelease', cause);
        }
      }
    } else if (this.activeCount === INITIAL_COUNTER) {
      // notifyObservers() unblocks every pending drain()/waitForCompletion()
      // caller, so it must run unconditionally even when onRelease throws —
      // the hook failure is captured and rethrown only after that cleanup
      // completes.
      let releaseHookError: HookInvocationError | undefined;

      try {
        this.onRelease(this.activeCount, this.totalExecuted);
      } catch (cause) {
        releaseHookError = new HookInvocationError('onRelease', cause);
      }

      this.notifyObservers();

      if (releaseHookError !== undefined) {
        throw releaseHookError;
      }
    }
  }

  /**
   * Invokes onWindowSlide for `instance`, catching a synchronous throw and
   * returning it as a HookInvocationError instead. Extracted to a static
   * method so its try/catch is never nested inside the while loops in
   * processQueuedOperations() and releaseSlot() (V8 deoptimizes try/catch
   * inside a loop body).
   */
  private static tryOnWindowSlide(instance: Throttle): HookInvocationError | undefined {
    try {
      instance.onWindowSlide(instance.activeCount, instance.queue.length);

      return undefined;
    } catch (cause) {
      return new HookInvocationError('onWindowSlide', cause);
    }
  }

  /**
   * Scale concurrency limit
   */
  private scaleConcurrency(
    adaptive: AdaptiveConfig,
    _p95: number,
    direction: 'down' | 'up'
  ): number {
    const previousLimit = this.config.concurrencyLimit;
    const newLimit = direction === 'up'
      ? Math.min(previousLimit + adaptive.stepSize, adaptive.maxConcurrency)
      : Math.max(previousLimit - adaptive.stepSize, adaptive.minConcurrency);

    // Kept synchronous: scaleConcurrency is called synchronously from
    // calculateNewLimit → maybeAdjustConcurrency → handleOperationSuccess,
    // itself invoked from a .then() callback execute() does not await. Forcing
    // this whole chain async would cascade with no corresponding safety
    // benefit, since nothing here depends on concurrent-call ordering.
    try {
      this.onAdaptiveAdjust(previousLimit, newLimit);
    } catch (cause) {
      throw new HookInvocationError('onAdaptiveAdjust', cause);
    }

    return newLimit;
  }

  /**
   * Check if concurrency adjustment should occur
   */
  private shouldAdjustConcurrency(adaptive: AdaptiveConfig | undefined): adaptive is AdaptiveConfig {
    if (adaptive?.enabled !== true) {
      return false;
    }

    if (this.latencyBuffer?.isFull !== true) {
      return false;
    }

    const now = Date.now();

    return now - this.lastAdjustmentTime >= adaptive.adjustmentInterval;
  }

  /**
   * Update throttle configuration
   *
   * @param config - Partial configuration to update
   *
   * @throws {ConfigurationError} When new config values fail validation
   *
   * @example Adjust concurrency limit
   * ```typescript
   * throttle.updateConfig({ concurrencyLimit: 20 });
   * ```
   */
  updateConfig(config: Partial<ThrottleConfigType>): void {
    const mergedConfig = {
      ...this.config,
      ...config
    };

    this.config = Throttle.validateConfig(mergedConfig);
    this.processQueuedOperations();
  }

  /**
   * Validate state before execute
   */
  private validateExecuteState(): void {
    if (this.#state === 'aborted') {
      throw new ThrottleAbortedError('Throttle has been aborted', INITIAL_COUNTER);
    }

    if (this.#state === 'draining') {
      throw new ThrottleDrainingError('Throttle has been set to draining mode');
    }
  }

  /**
   * Wait for all active and queued operations to complete (internal use only)
   *
   * Returns a promise that resolves when the throttle becomes idle
   * (no active operations and empty queue).
   *
   * @internal Used by drain() and abort() - not part of public API
   */
  private waitForCompletion(): Promise<void> {
    if (this.isComplete()) {
      return Promise.resolve();
    }

    this.completionPromise ??= new Promise<void>((resolve) => {
      this.observers.push(resolve);
    });

    return this.completionPromise;
  }

  /**
   * Wait for operations to complete, up to a maximum time
   * @param timeout Maximum time to wait in milliseconds
   * @returns true if timed out, false if completed within time
   */
  private async waitForGracePeriod(timeout: number): Promise<boolean> {
    if (this.isComplete()) {
      return false;
    }

    const controller = new AbortController();

    this.observers.push((): void => {
      controller.abort();
    });

    try {
      await Delay.for(timeout, controller.signal);

      // Timeout completed - operations did not finish in time
      return true;
    } catch {
      // AbortError - operations completed before timeout
      return false;
    }
  }

  private static readonly ADAPTIVE_DEFAULTS = {
    ...DEFAULT_ADAPTIVE_CONFIG,
    'targetLatencyMs': NO_DELAY_MS
  } as const;

  private static buildEnabledAdaptiveConfig(adaptiveObj: Record<string, unknown>): Required<AdaptiveConfigType> {
    const d = Throttle.ADAPTIVE_DEFAULTS;
    const minConcurrency = (adaptiveObj.minConcurrency as number | undefined) ?? d.minConcurrency;
    const maxConcurrency = (adaptiveObj.maxConcurrency as number | undefined) ?? d.maxConcurrency;
    const scaleUpThreshold = (adaptiveObj.scaleUpThreshold as number | undefined) ?? d.scaleUpThreshold;
    const scaleDownThreshold = (adaptiveObj.scaleDownThreshold as number | undefined) ?? d.scaleDownThreshold;

    // Cross-field business rules the static JSON Schema cannot express: it
    // validates each field in isolation, not the relationship between two of them.
    if (minConcurrency > maxConcurrency) {
      throw ConfigurationError.create('adaptive.minConcurrency must be less than or equal to adaptive.maxConcurrency');
    }
    if (scaleUpThreshold >= scaleDownThreshold) {
      throw ConfigurationError.create('adaptive.scaleUpThreshold must be less than adaptive.scaleDownThreshold');
    }

    // The schema's structural minimum for these two fields (1) is looser than
    // their actual business minimum, so that stricter floor is enforced here.
    if (adaptiveObj.sampleWindow !== undefined) {
      ConfigValidation.assertMin(adaptiveObj.sampleWindow, MIN_SAMPLE_WINDOW, 'adaptive.sampleWindow');
    }
    if (adaptiveObj.adjustmentInterval !== undefined) {
      ConfigValidation.assertMin(adaptiveObj.adjustmentInterval, MIN_ADJUSTMENT_INTERVAL, 'adaptive.adjustmentInterval');
    }

    return {
      'adjustmentInterval': (adaptiveObj.adjustmentInterval as number | undefined) ?? d.adjustmentInterval,
      'enabled': true,
      'maxConcurrency': maxConcurrency,
      'minConcurrency': minConcurrency,
      'sampleWindow': (adaptiveObj.sampleWindow as number | undefined) ?? d.sampleWindow,
      'scaleDownThreshold': scaleDownThreshold,
      'scaleUpThreshold': scaleUpThreshold,
      'stepSize': (adaptiveObj.stepSize as number | undefined) ?? d.stepSize,
      'targetLatencyMs': adaptiveObj.targetLatencyMs as number
    };
  }

  private static validateAdaptiveConfig(adaptive: unknown): Required<AdaptiveConfigType> | undefined {
    if (adaptive === undefined) {
      return undefined;
    }

    // adaptive's shape (object, boolean enabled, required: ['enabled'], and
    // per-field type/exclusiveMinimum) is already enforced by
    // ThrottleConfigEntity.validate() before this method is reached.
    const adaptiveObj = adaptive as Record<string, unknown>;
    const d = Throttle.ADAPTIVE_DEFAULTS;

    // The nested "adaptive" schema does not declare additionalProperties: false
    // (only the top-level schema does), so unknown keys inside adaptive are not
    // caught by ThrottleConfigEntity.validate() above.
    ConfigValidation.assertNoUnknownKeys(adaptiveObj, ADAPTIVE_CONFIG_KEYS);

    if (adaptiveObj.enabled === false) {
      return {
        'adjustmentInterval': d.adjustmentInterval,
        'enabled': false,
        'maxConcurrency': d.maxConcurrency,
        'minConcurrency': d.minConcurrency,
        'sampleWindow': d.sampleWindow,
        'scaleDownThreshold': d.scaleDownThreshold,
        'scaleUpThreshold': d.scaleUpThreshold,
        'stepSize': d.stepSize,
        'targetLatencyMs': d.targetLatencyMs
      };
    }

    // Cross-field business rule the static JSON Schema cannot express:
    // targetLatencyMs is required only when adaptive.enabled is true — the
    // schema keeps every adaptive field but "enabled" optional so it can also
    // express the disabled shape.
    if (adaptiveObj.targetLatencyMs === undefined) {
      throw ConfigurationError.create('adaptive.targetLatencyMs is required when adaptive is enabled');
    }

    return Throttle.buildEnabledAdaptiveConfig(adaptiveObj);
  }

  private static validateConfig(config?: Partial<ThrottleConfigType>): ValidatedThrottleConfigType {
    const cfg = config ?? {};

    ThrottleConfigEntity.validate(cfg);

    const configObj = cfg as Record<string, unknown>;
    const adaptive = Throttle.validateAdaptiveConfig(configObj.adaptive);
    const concurrencyLimit = cfg.concurrencyLimit ?? DEFAULT_THROTTLE_CONCURRENCY;

    // Cross-field business rule the static JSON Schema cannot express:
    // concurrencyLimit compared against adaptive.minConcurrency/maxConcurrency.
    if (adaptive?.enabled === true) {
      if (concurrencyLimit < adaptive.minConcurrency) {
        throw ConfigurationError.create(`concurrencyLimit (${concurrencyLimit}) must be at least adaptive.minConcurrency (${adaptive.minConcurrency})`);
      }
      if (concurrencyLimit > adaptive.maxConcurrency) {
        throw ConfigurationError.create(`concurrencyLimit (${concurrencyLimit}) must be at most adaptive.maxConcurrency (${adaptive.maxConcurrency})`);
      }
    }

    const result: ValidatedThrottleConfigType = { 'concurrencyLimit': concurrencyLimit };

    if (adaptive !== undefined) {
      result.adaptive = adaptive;
    }

    return result;
  }
}
