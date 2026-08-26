import { CircularBuffer } from '@studnicky/circular-buffer';
import { ConfigurationError } from '@studnicky/config';
import { HookInvoker } from '@studnicky/errors';
import { SchemaValidator } from '@studnicky/json';
import { SampleBuffer } from '@studnicky/sample-buffer';
import { Predicates } from '@studnicky/types';

import type { AbortResultEntity } from '../entities/AbortResultEntity.js';
import type { ActiveOperationStateEntity } from '../entities/ActiveOperationStateEntity.js';
import type { AdaptiveConfigEntity } from '../entities/AdaptiveConfigEntity.js';
import type { OperationLifecycleStateEntity } from '../entities/OperationLifecycleStateEntity.js';
import type { ThrottleAbortOptionsEntity } from '../entities/ThrottleAbortOptionsEntity.js';
import type { ThrottleStateEntity } from '../entities/ThrottleStateEntity.js';
import type { ThrottleStatsEntity } from '../entities/ThrottleStatsEntity.js';
import type { ValidatedAdaptiveConfigEntity } from '../entities/ValidatedAdaptiveConfigEntity.js';
import type { ValidatedThrottleConfigEntity } from '../entities/ValidatedThrottleConfigEntity.js';
import type { ThrottleInterface } from '../interfaces/index.js';
import type { OperationLifecycleEffect } from './OperationLifecycleEffect.js';
import type { OperationLifecycleEvent } from './OperationLifecycleEvent.js';

import {
  DEFAULT_ADAPTIVE_CONFIG,
  DEFAULT_BUFFER_CAPACITY,
  DEFAULT_THROTTLE_CONCURRENCY,
  DEFAULT_TIMEOUT,
  EMPTY_LENGTH,
  FIRST_ARRAY_INDEX,
  INITIAL_COUNTER,
  NO_DELAY_MS,
  PERCENTILE_P50,
  PERCENTILE_P95,
  PERCENTILE_P99
} from '../constants/index.js';
import { ThrottleConfigEntity } from '../entities/ThrottleConfigEntity.js';
import {
  ThrottleAbortedError,
  ThrottleDrainingError
} from '../errors/index.js';
import { Delay } from './Delay.js';
import { OperationLifecycleMachine } from './OperationLifecycleMachine.js';

interface ThrottleSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class ThrottleInstance {
  static belongsTo<TInstance extends object>(
    constructor: ThrottleSubclassInterface<TInstance>,
    value: object
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

/**
 * Tracks an active operation for detach-and-abandon abort support
 */
interface ActiveOperationInterface {
  /**
   * Whether the operation has completed (naturally or via abort)
   */
  'completed': ActiveOperationStateEntity.Type['completed'];

  /**
   * Resolves the execute() promise with undefined (aborted state)
   */
  'resolve': () => void;
}

/** Queued continuation retained until a concurrency slot becomes available. */
interface ThrottleQueueEntryInterface {
  readonly 'reject': (error: unknown) => void;
  readonly 'resolve': () => void;
}

interface LifecycleEffectHandlerInterface {
  (
    effect: OperationLifecycleEffect.FireOnAbortStartEffectInterface
    | OperationLifecycleEffect.FireOnAcquireEffectInterface
    | OperationLifecycleEffect.FireOnAcquireWaitEffectInterface
    | OperationLifecycleEffect.FireOnAdaptiveAdjustEffectInterface
    | OperationLifecycleEffect.FireOnContendedEffectInterface
    | OperationLifecycleEffect.FireOnDrainCompleteEffectInterface
    | OperationLifecycleEffect.FireOnDrainStartEffectInterface
    | OperationLifecycleEffect.FireOnReleaseEffectInterface
    | OperationLifecycleEffect.FireOnRejectEffectInterface
    | OperationLifecycleEffect.FireOnWindowSlideEffectInterface
  ): void;
}

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
  private readonly lifecycleEffectHandlers = new Map<
    Parameters<LifecycleEffectHandlerInterface>[0]['variant'],
    LifecycleEffectHandlerInterface
  >([
    ['FireOnAdaptiveAdjust', (effect) => {
      if (effect.variant !== 'FireOnAdaptiveAdjust') { throw new TypeError(`Expected FireOnAdaptiveAdjust effect, received ${effect.variant}`); }
      this.hooks.invoke('onAdaptiveAdjust', () => { const result = this.onAdaptiveAdjust(effect.previousLimit, effect.newLimit); return result; });
    }],
    ['FireOnContended', (effect) => {
      if (effect.variant !== 'FireOnContended') { throw new TypeError(`Expected FireOnContended effect, received ${effect.variant}`); }
      this.hooks.invoke('onContended', () => { const result = this.onContended(effect.activeCount, effect.queuedCount); return result; });
    }],
    ['FireOnDrainComplete', (effect) => {
      if (effect.variant !== 'FireOnDrainComplete') { throw new TypeError(`Expected FireOnDrainComplete effect, received ${effect.variant}`); }
      this.hooks.invoke('onDrainComplete', () => { const result = this.onDrainComplete(effect.totalExecuted); return result; });
    }],
    ['FireOnReject', (effect) => {
      if (effect.variant !== 'FireOnReject') { throw new TypeError(`Expected FireOnReject effect, received ${effect.variant}`); }
      this.hooks.invoke('onReject', () => { const result = this.onReject(effect.reason); return result; });
    }],
    ['FireOnRelease', (effect) => {
      if (effect.variant !== 'FireOnRelease') { throw new TypeError(`Expected FireOnRelease effect, received ${effect.variant}`); }
      this.hooks.invoke('onRelease', () => { const result = this.onRelease(effect.activeCount, effect.totalExecuted); return result; });
    }],
    ['FireOnWindowSlide', (effect) => {
      if (effect.variant !== 'FireOnWindowSlide') { throw new TypeError(`Expected FireOnWindowSlide effect, received ${effect.variant}`); }
      this.hooks.invoke('onWindowSlide', () => { const result = this.onWindowSlide(effect.activeCount, effect.queuedCount); return result; });
    }]
  ]);

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
  static create<TInstance extends Throttle = Throttle>(
    this: ThrottleSubclassInterface<TInstance>,
    config?: Partial<ThrottleConfigEntity.Type>
  ): TInstance {
    const resolveSubclassConstructor = (): ThrottleSubclassInterface<TInstance> => {
      return this;
    };

    const result: unknown = Reflect.construct(resolveSubclassConstructor(), [config]);
    if (!Predicates.isObjectLike(result) || !ThrottleInstance.belongsTo(resolveSubclassConstructor(), result)) {
      throw new TypeError('Throttle.create() did not construct the requested subclass.');
    }
    return result;
  }

  /**
   * FSM state. Transitions via transition().
   */
  #state: ThrottleStateEntity.Type = 'idle';

  private activeCount = INITIAL_COUNTER;
  private readonly activeOperations = new Set<ActiveOperationInterface>();
  private adjustmentCount = INITIAL_COUNTER;
  private completionPromise: null | Promise<void> = null;
  private config: ValidatedThrottleConfigEntity.Type;
  protected readonly hooks: HookInvoker = new HookInvoker();
  private lastAdjustmentTime = INITIAL_COUNTER;
  private readonly latencyBuffer: SampleBuffer | undefined;

  /**
   * Per-operation lifecycle reducer (see `OperationLifecycleMachine`). Single point of
   * truth for which lifecycle hook fires for a given per-operation event — replaces the
   * old scattered, inconsistent `hooks.invoke(...)` call sites. Distinct from `#state`
   * above, which is the coarse idle/active/draining/aborted mode FSM.
   */
  private readonly lifecycle = new OperationLifecycleMachine();
  private lifecycleState: OperationLifecycleStateEntity.Type = this.lifecycle.getInitialState();

  private readonly observers: (() => void)[] = [];
  private readonly queue: CircularBuffer<ThrottleQueueEntryInterface>;

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
  protected constructor(config?: Partial<ThrottleConfigEntity.Type>) {
    this.config = Throttle.validateConfig(config);
    this.queue = CircularBuffer.create<ThrottleQueueEntryInterface>({
      'capacity': DEFAULT_BUFFER_CAPACITY,
      'overflow': 'grow'
    });

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
  protected transition(to: ThrottleStateEntity.Type): void {
    const from = this.#state;

    if (!this.guard(from, to)) {
      throw new Error(`Illegal state transition: ${from} → ${to}`);
    }

    this.#state = to;

    this.hooks.invoke('onEnter', () => {
      const result = this.onEnter(to, from);
      return result;
    });
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
  protected guard(from: ThrottleStateEntity.Type, to: ThrottleStateEntity.Type): boolean {
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
  protected onEnter(_to: ThrottleStateEntity.Type, _from: ThrottleStateEntity.Type): void {}

  /**
   * The current FSM state.
   */
  protected get state(): ThrottleStateEntity.Type {
    const result = this.#state;
    return result;
  }

  // ── Per-operation lifecycle ────────────────────────────────────────────────

  /**
   * Drives `OperationLifecycleMachine.reduce()` for `event` and fires its single
   * resulting effect via a synchronous `hooks.invoke(...)` call. `reduce()` returns
   * exactly one effect per event by construction — see `OperationLifecycleMachine` for
   * why that eliminates the double-fire/missing-fire class of bug at the source.
   */
  private fireLifecycleEffect(
    event: OperationLifecycleEvent.AbortStartedEventInterface
    | OperationLifecycleEvent.AcquiredEventInterface
    | OperationLifecycleEvent.ConcurrencyAdjustedEventInterface
    | OperationLifecycleEvent.ContendedEventInterface
    | OperationLifecycleEvent.DrainCompletedEventInterface
    | OperationLifecycleEvent.DrainStartedEventInterface
    | OperationLifecycleEvent.OperationRejectedEventInterface
    | OperationLifecycleEvent.QueuedEventInterface
    | OperationLifecycleEvent.SlotReleasedEventInterface
    | OperationLifecycleEvent.WindowSlidEventInterface
  ): void {
    const effect = this.stepLifecycle(event);
    const handler = this.lifecycleEffectHandlers.get(effect.variant);
    if (handler === undefined) {
      throw new TypeError(`fireLifecycleEffect received an async-only effect: ${effect.variant}`);
    }
    handler(effect);
  }

  /**
   * Drives `OperationLifecycleMachine.reduce()` for `event` and fires its single
   * resulting effect via `hooks.invokeAsync(...)`, exposing completion to the caller.
   */
  private async fireLifecycleEffectAsync(
    event: OperationLifecycleEvent.AbortStartedEventInterface
    | OperationLifecycleEvent.AcquiredEventInterface
    | OperationLifecycleEvent.ConcurrencyAdjustedEventInterface
    | OperationLifecycleEvent.ContendedEventInterface
    | OperationLifecycleEvent.DrainCompletedEventInterface
    | OperationLifecycleEvent.DrainStartedEventInterface
    | OperationLifecycleEvent.OperationRejectedEventInterface
    | OperationLifecycleEvent.QueuedEventInterface
    | OperationLifecycleEvent.SlotReleasedEventInterface
    | OperationLifecycleEvent.WindowSlidEventInterface
  ): Promise<void> {
    const effect = this.stepLifecycle(event);

    switch (effect.variant) {
      case 'FireOnAbortStart':
        await this.hooks.invokeAsync('onAbortStart', () => {
          const result = this.onAbortStart(effect.cancelledCount);
          return result;
        });
        return;
      case 'FireOnAcquire':
        await this.hooks.invokeAsync('onAcquire', () => {
          const result = this.onAcquire(effect.activeCount, effect.queuedCount);
          return result;
        });
        return;
      case 'FireOnAcquireWait':
        await this.hooks.invokeAsync('onAcquireWait', () => {
          const result = this.onAcquireWait(effect.queuedCount);
          return result;
        });
        return;
      case 'FireOnDrainStart':
        await this.hooks.invokeAsync('onDrainStart', () => {
          const result = this.onDrainStart(effect.activeCount, effect.queuedCount);
          return result;
        });
        return;
      default:
        throw new TypeError(`fireLifecycleEffectAsync received a sync-only effect: ${effect.variant}`);
    }
  }

  /** Transitions the lifecycle reducer and returns its single effect for `event`. */
  private stepLifecycle(
    event: OperationLifecycleEvent.AbortStartedEventInterface
    | OperationLifecycleEvent.AcquiredEventInterface
    | OperationLifecycleEvent.ConcurrencyAdjustedEventInterface
    | OperationLifecycleEvent.ContendedEventInterface
    | OperationLifecycleEvent.DrainCompletedEventInterface
    | OperationLifecycleEvent.DrainStartedEventInterface
    | OperationLifecycleEvent.OperationRejectedEventInterface
    | OperationLifecycleEvent.QueuedEventInterface
    | OperationLifecycleEvent.SlotReleasedEventInterface
    | OperationLifecycleEvent.WindowSlidEventInterface
  ):
    OperationLifecycleEffect.FireOnAbortStartEffectInterface
    | OperationLifecycleEffect.FireOnAcquireEffectInterface
    | OperationLifecycleEffect.FireOnAcquireWaitEffectInterface
    | OperationLifecycleEffect.FireOnAdaptiveAdjustEffectInterface
    | OperationLifecycleEffect.FireOnContendedEffectInterface
    | OperationLifecycleEffect.FireOnDrainCompleteEffectInterface
    | OperationLifecycleEffect.FireOnDrainStartEffectInterface
    | OperationLifecycleEffect.FireOnReleaseEffectInterface
    | OperationLifecycleEffect.FireOnRejectEffectInterface
    | OperationLifecycleEffect.FireOnWindowSlideEffectInterface {
    const step = this.lifecycle.transition(this.lifecycleState, event);

    this.lifecycleState = step.state;

    const [effect] = step.effects;

    if (effect === undefined) {
      throw new TypeError(`OperationLifecycleMachine produced no effect for event: ${event.type}`);
    }

    const result = effect;
    return result;
  }

  // ── Clock ───────────────────────────────────────────────────────────────────

  /**
   * Extension seam: subclasses may override to replace the wall-clock source
   * used for operation latency measurement and adaptive-adjustment timing
   * (`lastAdjustmentTime` and the `shouldAdjustConcurrency` gate). Returns the
   * real epoch-ms by default.
   */
  protected now(): number {
    const currentDate = new Date();
    const result = currentDate.getTime();
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
  async abort(options?: ThrottleAbortOptionsEntity.Type): Promise<AbortResultEntity.Type> {
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
      await this.fireLifecycleEffectAsync({ 'cancelledCount': cancelledCount, 'type': 'AbortStarted' });
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
        await this.fireLifecycleEffectAsync({ 'activeCount': this.activeCount, 'queuedCount': this.queue.length, 'type': 'Acquired' });
      } catch (error) {
        this.releaseSlot();
        throw error;
      }

      return;
    }

    // Synchronous entry preserves the ordering guarantee that onContended fires
    // before this caller is pushed onto the queue.
    this.fireLifecycleEffect({ 'activeCount': this.activeCount, 'queuedCount': this.queue.length, 'type': 'Contended' });

    await new Promise<void>((resolve, reject) => {
      const pendingTask = {
        'reject': reject,
        'resolve': resolve
      };
      this.queue.push(pendingTask);

      // onAcquireWait fires from inside a Promise executor, which must stay
      // synchronous per the Promise constructor contract — it cannot be awaited
      // here. invokeAsync exposes both synchronous and asynchronous hook
      // failures through its completion promise, so the same catch handles
      // either failure mode.
      this.fireLifecycleEffectAsync({ 'queuedCount': this.queue.length, 'type': 'Queued' })
        .catch((error) => {
          const queuedCount = this.queue.length;

          for (let i = INITIAL_COUNTER; i < queuedCount; i++) {
            const queuedTask = this.queue.shift();

            if (queuedTask !== undefined && queuedTask !== pendingTask) {
              this.queue.push(queuedTask);
            }
          }

          reject(error);
        });
    });
  }

  /**
   * Calculate new concurrency limit based on latency
   */
  private calculateNewLimit(
    adaptive: ValidatedAdaptiveConfigEntity.Type,
    p95: number
  ): number {
    if (p95 < adaptive.targetLatencyMs * adaptive.scaleUpThreshold
        && this.config.concurrencyLimit < adaptive.maximumConcurrency) {
      const result = this.scaleConcurrency(adaptive, p95, 'up');
      return result;
    }

    if (p95 > adaptive.targetLatencyMs * adaptive.scaleDownThreshold
        && this.config.concurrencyLimit > adaptive.minimumConcurrency) {
      const result = this.scaleConcurrency(adaptive, p95, 'down');
      return result;
    }

    const result = this.config.concurrencyLimit;
    return result;
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
    await this.fireLifecycleEffectAsync({ 'activeCount': this.activeCount, 'queuedCount': this.queue.length, 'type': 'DrainStarted' });

    return await this.waitForCompletion();
  }

  /**
   * Drain the queue by resolving all pending operations with undefined
   */
  private drainQueue(): void {
    let pendingTask = this.queue.shift();

    while (pendingTask !== undefined) {
      pendingTask.resolve();
      pendingTask = this.queue.shift();
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
  async execute<T>(callback: () => Promise<T>): Promise<T | undefined> {
    this.validateExecuteState();

    const result = await new Promise<T | undefined>((resolveExecute, rejectExecute) => {
      this.acquireSlot().then(() => {
        if (this.#state === 'aborted') {
          resolveExecute(undefined);

          return;
        }

        const resolveOperation = (): void => { resolveExecute(undefined); };
        const operation: ActiveOperationInterface = {
          'completed': false,
          'resolve': resolveOperation
        };

        this.activeOperations.add(operation);

        const operationStartTime = this.now();

        try {
          // handleOperationSuccess/handleOperationError may now throw a
          // HookInvocationError (a lifecycle hook they invoke can fail) — the
          // appended .catch(rejectExecute) is the safety net so that failure
          // rejects execute() instead of becoming an unhandled rejection.
          callback().then(
            (successResult) => { this.handleOperationSuccess(operation, successResult, operationStartTime, resolveExecute); },
            (error) => { this.handleOperationError(operation, error instanceof Error ? error : new Error(String(error)), rejectExecute); }
          ).catch(rejectExecute);
        } catch (error) {
          this.handleOperationError(operation, error instanceof Error ? error : new Error(String(error)), rejectExecute);
        }
      })
        .catch(rejectExecute);
    });
    return result;
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
        'maximumConcurrency': this.config.adaptive.maximumConcurrency,
        'minimumConcurrency': this.config.adaptive.minimumConcurrency,
        'targetLatencyMs': this.config.adaptive.targetLatencyMs
      };
    }

    const result = stats;
    return result;
  }

  /**
   * Handle grace period wait
   */
  private async handleGracePeriod(timeout: number): Promise<boolean> {
    if (timeout <= DEFAULT_TIMEOUT || this.isComplete()) {
      return false;
    }

    const result = await this.waitForGracePeriod(timeout);
    return result;
  }

  /**
   * Handle operation error
   */
  private handleOperationError(
    operation: ActiveOperationInterface,
    error: Error,
    rejectExecute: (error: Error) => void
  ): void {
    if (operation.completed) {
      return;
    }

    operation.completed = true;
    this.activeOperations.delete(operation);

    const normalizedError = error instanceof Error ? error : new Error(String(error));

    try {
      this.fireLifecycleEffect({ 'reason': normalizedError, 'type': 'OperationRejected' });
    } finally {
      this.releaseSlot();
    }

    rejectExecute(normalizedError);
  }

  /**
   * Handle successful operation completion
   */
  private handleOperationSuccess<T>(
    operation: ActiveOperationInterface,
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
      const duration = this.now() - operationStartTime;

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

    // releaseSlot() is the sole place that fires onRelease — it does so exactly once,
    // for every outcome (queue handoff, becomes idle, still busy), by routing through
    // OperationLifecycleMachine's 'SlotReleased' event. No separate explicit firing here.
    this.releaseSlot();

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
    const result = this.activeCount === INITIAL_COUNTER && this.queue.length === EMPTY_LENGTH;
    return result;
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

    this.lastAdjustmentTime = this.now();
  }

  /**
   * Notify all observers that the throttle is now idle.
   *
   * Transitions active → idle or draining → idle when all work is complete.
   * No transition when aborted (terminal state).
   */
  private notifyObservers(): void {
    try {
      if (this.#state === 'draining') {
        try {
          this.fireLifecycleEffect({ 'totalExecuted': this.totalExecuted, 'type': 'DrainCompleted' });
        } finally {
          this.transition('idle');
        }
      } else if (this.#state === 'active') {
        this.transition('idle');
      }
    } finally {
      const length = this.observers.length;

      try {
        for (let i = FIRST_ARRAY_INDEX; i < length; i++) {
          const observer = this.observers.at(i);

          if (observer !== undefined) {
            observer();
          }
        }
      } finally {
        this.observers.length = EMPTY_LENGTH;
        this.completionPromise = null;
      }
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
  protected onReject(_reason: Error): void {}

  /**
   * Fires when a slot is released.
   */
  protected onRelease(_activeCount: number, _totalExecuted: number): void {}

  /** Grants the next queued caller a slot and reports the grant outcome. */
  private grantNextQueuedOperation(): 'failed' | 'granted' | undefined {
    const pendingTask = this.queue.shift();

    if (pendingTask === undefined) {
      return undefined;
    }

    this.activeCount++;

    try {
      this.fireLifecycleEffect({ 'activeCount': this.activeCount, 'queuedCount': this.queue.length, 'type': 'WindowSlid' });
    } catch (error) {
      this.activeCount--;
      pendingTask.reject(error);

      return 'failed';
    }

    pendingTask.resolve();

    return 'granted';
  }

  /**
   * Process queued operations up to concurrency limit
   * @returns Number of operations dequeued
   */
  private processQueuedOperations(): number {
    let count = INITIAL_COUNTER;

    while (this.queue.length > EMPTY_LENGTH && this.activeCount < this.config.concurrencyLimit) {
      const outcome = this.grantNextQueuedOperation();

      if (outcome === 'granted') {
        count++;
      } else if (outcome === undefined) {
        return count;
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
      const outcome = this.grantNextQueuedOperation();

      if (outcome === 'granted') {
        // onRelease here describes the just-completed operation's own release
        // (accounting is already fully committed above), so a failure
        // propagates up to that operation's caller rather than to the waiter.
        this.fireLifecycleEffect({
          'activeCount': this.activeCount,
          'outcome': 'handoff-granted',
          'totalExecuted': this.totalExecuted,
          'type': 'SlotReleased'
        });
      }

      // outcome === 'failed' (onWindowSlide threw): the waiter was already rejected by
      // grantNextQueuedOperation and its own failure has already been surfaced there —
      // this release did not successfully hand off, so no onRelease fires for it.
      return;
    }

    if (this.activeCount === INITIAL_COUNTER) {
      try {
        this.fireLifecycleEffect({
          'activeCount': this.activeCount,
          'outcome': 'became-idle',
          'totalExecuted': this.totalExecuted,
          'type': 'SlotReleased'
        });
      } finally {
        this.notifyObservers();
      }

      return;
    }

    // Still busy (activeCount > 0) with an empty queue — this is the outcome the old
    // procedural code failed to cover from inside releaseSlot() itself, relying instead
    // on an inconsistent explicit call at the handleOperationSuccess() call site only.
    // Every release outcome now fires onRelease exactly once, from this one method.
    this.fireLifecycleEffect({
      'activeCount': this.activeCount,
      'outcome': 'still-busy',
      'totalExecuted': this.totalExecuted,
      'type': 'SlotReleased'
    });
  }

  /**
   * Scale concurrency limit
   */
  private scaleConcurrency(
    adaptive: ValidatedAdaptiveConfigEntity.Type,
    _p95: number,
    direction: 'down' | 'up'
  ): number {
    const previousLimit = this.config.concurrencyLimit;
    const newLimit = direction === 'up'
      ? Math.min(previousLimit + adaptive.stepSize, adaptive.maximumConcurrency)
      : Math.max(previousLimit - adaptive.stepSize, adaptive.minimumConcurrency);

    this.fireLifecycleEffect({ 'newLimit': newLimit, 'previousLimit': previousLimit, 'type': 'ConcurrencyAdjusted' });

    return newLimit;
  }

  /**
   * Check if concurrency adjustment should occur
   */
  private shouldAdjustConcurrency(
    adaptive: ValidatedAdaptiveConfigEntity.Type | undefined
  ): adaptive is ValidatedAdaptiveConfigEntity.Type {
    if (adaptive?.enabled !== true) {
      return false;
    }

    if (this.latencyBuffer?.isFull !== true) {
      return false;
    }

    const now = this.now();

    const result = now - this.lastAdjustmentTime >= adaptive.adjustmentInterval;
    return result;
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
      const result = Promise.resolve();
      return result;
    }

    this.completionPromise ??= new Promise<void>((resolve) => {
      this.observers.push(resolve);
    });

    const result = this.completionPromise;
    return result;
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

  private static buildEnabledAdaptiveConfig(
    adaptive: AdaptiveConfigEntity.Type,
    targetLatencyMs: number
  ): ValidatedAdaptiveConfigEntity.Type {
    const defaults = Throttle.ADAPTIVE_DEFAULTS;
    const minimumConcurrency = adaptive.minimumConcurrency ?? defaults.minimumConcurrency;
    const maximumConcurrency = adaptive.maximumConcurrency ?? defaults.maximumConcurrency;
    const scaleUpThreshold = adaptive.scaleUpThreshold ?? defaults.scaleUpThreshold;
    const scaleDownThreshold = adaptive.scaleDownThreshold ?? defaults.scaleDownThreshold;

    // Cross-field business rules the static JSON Schema cannot express: it
    // validates each field in isolation, not the relationship between two of them.
    if (minimumConcurrency > maximumConcurrency) {
      throw ConfigurationError.create('adaptive.minimumConcurrency must be less than or equal to adaptive.maximumConcurrency');
    }
    if (scaleUpThreshold >= scaleDownThreshold) {
      throw ConfigurationError.create('adaptive.scaleUpThreshold must be less than adaptive.scaleDownThreshold');
    }

    const result: ValidatedAdaptiveConfigEntity.Type = {
      'adjustmentInterval': adaptive.adjustmentInterval ?? defaults.adjustmentInterval,
      'enabled': true,
      'maximumConcurrency': maximumConcurrency,
      'minimumConcurrency': minimumConcurrency,
      'sampleWindow': adaptive.sampleWindow ?? defaults.sampleWindow,
      'scaleDownThreshold': scaleDownThreshold,
      'scaleUpThreshold': scaleUpThreshold,
      'stepSize': adaptive.stepSize ?? defaults.stepSize,
      'targetLatencyMs': targetLatencyMs
    };
    return result;
  }

  private static validateAdaptiveConfig(
    adaptive: AdaptiveConfigEntity.Type | undefined
  ): ValidatedAdaptiveConfigEntity.Type | undefined {
    if (adaptive === undefined) {
      return undefined;
    }

    // adaptive's shape (object, boolean enabled, required: ['enabled'], and
    // per-field type/exclusiveMinimum) is already enforced by
    // ThrottleConfigEntity.validate() before this method is reached.
    const defaults = Throttle.ADAPTIVE_DEFAULTS;

    if (adaptive.enabled === false) {
      const result: ValidatedAdaptiveConfigEntity.Type = {
        'adjustmentInterval': defaults.adjustmentInterval,
        'enabled': false,
        'maximumConcurrency': defaults.maximumConcurrency,
        'minimumConcurrency': defaults.minimumConcurrency,
        'sampleWindow': defaults.sampleWindow,
        'scaleDownThreshold': defaults.scaleDownThreshold,
        'scaleUpThreshold': defaults.scaleUpThreshold,
        'stepSize': defaults.stepSize,
        'targetLatencyMs': defaults.targetLatencyMs
      };
      return result;
    }

    // Cross-field business rule the static JSON Schema cannot express:
    // targetLatencyMs is required only when adaptive.enabled is true — the
    // schema keeps every adaptive field but "enabled" optional so it can also
    // express the disabled shape.
    if (adaptive.targetLatencyMs === undefined) {
      throw ConfigurationError.create('adaptive.targetLatencyMs is required when adaptive is enabled');
    }

    const result = Throttle.buildEnabledAdaptiveConfig(adaptive, adaptive.targetLatencyMs);
    return result;
  }

  private static validateConfig(
    config?: Partial<ThrottleConfigEntity.Type>
  ): ValidatedThrottleConfigEntity.Type {
    const configuration = config ?? {};

    if (!ThrottleConfigEntity.validate(configuration)) {
      throw ConfigurationError.create(SchemaValidator.formatErrors(ThrottleConfigEntity.validate.errors));
    }

    const parsedConfiguration = ThrottleConfigEntity.intake(configuration);
    const adaptive = Throttle.validateAdaptiveConfig(parsedConfiguration.adaptive);
    const concurrencyLimit = parsedConfiguration.concurrencyLimit ?? DEFAULT_THROTTLE_CONCURRENCY;

    // Cross-field business rule the static JSON Schema cannot express:
    // concurrencyLimit compared against adaptive.minimumConcurrency/maximumConcurrency.
    if (adaptive?.enabled === true) {
      if (concurrencyLimit < adaptive.minimumConcurrency) {
        throw ConfigurationError.create(`concurrencyLimit (${concurrencyLimit}) must be at least adaptive.minimumConcurrency (${adaptive.minimumConcurrency})`);
      }
      if (concurrencyLimit > adaptive.maximumConcurrency) {
        throw ConfigurationError.create(`concurrencyLimit (${concurrencyLimit}) must be at most adaptive.maximumConcurrency (${adaptive.maximumConcurrency})`);
      }
    }

    const result: ValidatedThrottleConfigEntity.Type = { 'concurrencyLimit': concurrencyLimit };

    if (adaptive !== undefined) {
      result.adaptive = adaptive;
    }

    return result;
  }
}
