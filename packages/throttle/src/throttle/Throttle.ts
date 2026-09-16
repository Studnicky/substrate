import { Semaphore } from '@studnicky/concurrency/node';
import { ConfigurationError } from '@studnicky/config/node';
import { SchemaIntakeError } from '@studnicky/entity/node';
import { HookInvoker, RuntimeError } from '@studnicky/errors/node';
import { SampleBuffer } from '@studnicky/sample-buffer/node';
import { Predicates } from '@studnicky/types/node';

import type { AbortResultEntity } from '../entities/AbortResultEntity.js';
import type { AbortStartedEventEntity } from '../entities/AbortStartedEventEntity.js';
import type { AcquiredEventEntity } from '../entities/AcquiredEventEntity.js';
import type { ActiveOperationStateEntity } from '../entities/ActiveOperationStateEntity.js';
import type { AdaptiveConfigEntity } from '../entities/AdaptiveConfigEntity.js';
import type { ConcurrencyAdjustedEventEntity } from '../entities/ConcurrencyAdjustedEventEntity.js';
import type { ContendedEventEntity } from '../entities/ContendedEventEntity.js';
import type { DrainCompletedEventEntity } from '../entities/DrainCompletedEventEntity.js';
import type { DrainStartedEventEntity } from '../entities/DrainStartedEventEntity.js';
import type { FireOnAbortStartEffectEntity } from '../entities/FireOnAbortStartEffectEntity.js';
import type { FireOnAcquireEffectEntity } from '../entities/FireOnAcquireEffectEntity.js';
import type { FireOnAcquireWaitEffectEntity } from '../entities/FireOnAcquireWaitEffectEntity.js';
import type { FireOnAdaptiveAdjustEffectEntity } from '../entities/FireOnAdaptiveAdjustEffectEntity.js';
import type { FireOnContendedEffectEntity } from '../entities/FireOnContendedEffectEntity.js';
import type { FireOnDrainCompleteEffectEntity } from '../entities/FireOnDrainCompleteEffectEntity.js';
import type { FireOnDrainStartEffectEntity } from '../entities/FireOnDrainStartEffectEntity.js';
import type { FireOnReleaseEffectEntity } from '../entities/FireOnReleaseEffectEntity.js';
import type { FireOnWindowSlideEffectEntity } from '../entities/FireOnWindowSlideEffectEntity.js';
import type { OperationLifecycleStateEntity } from '../entities/OperationLifecycleStateEntity.js';
import type { QueuedEventEntity } from '../entities/QueuedEventEntity.js';
import type { SlotReleasedEventEntity } from '../entities/SlotReleasedEventEntity.js';
import type { ThrottleAbortOptionsEntity } from '../entities/ThrottleAbortOptionsEntity.js';
import type { ThrottleStateEntity } from '../entities/ThrottleStateEntity.js';
import type { ThrottleStatsEntity } from '../entities/ThrottleStatsEntity.js';
import type { ValidatedAdaptiveConfigEntity } from '../entities/ValidatedAdaptiveConfigEntity.js';
import type { ValidatedThrottleConfigEntity } from '../entities/ValidatedThrottleConfigEntity.js';
import type { WindowSlidEventEntity } from '../entities/WindowSlidEventEntity.js';
import type { FireOnRejectEffectInterface } from '../interfaces/FireOnRejectEffectInterface.js';
import type { ThrottleInterface } from '../interfaces/index.js';
import type { OperationRejectedEventInterface } from '../interfaces/OperationRejectedEventInterface.js';

import {
  DEFAULT_ADAPTIVE_CONFIG,
  DEFAULT_THROTTLE_CONCURRENCY,
  DEFAULT_TIMEOUT,
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

/**
 * Tracks an active operation for detach-and-abandon abort support
 */
interface ActiveOperationInterface {
  /**
   * Whether the operation has completed (naturally or via abort)
   */
  'completed': ActiveOperationStateEntity.Type['completed'];

  /**
   * Releases an acquired permit exactly once.
   */
  'release': (() => Promise<void>) | undefined;

  /**
   * Resolves the execute() promise with undefined when the operation is aborted.
   */
  'resolve': () => void;
}

interface LifecycleEffectHandlerInterface {
  (
    effect: FireOnAbortStartEffectEntity.Type
    | FireOnAcquireEffectEntity.Type
    | FireOnAcquireWaitEffectEntity.Type
    | FireOnAdaptiveAdjustEffectEntity.Type
    | FireOnContendedEffectEntity.Type
    | FireOnDrainCompleteEffectEntity.Type
    | FireOnDrainStartEffectEntity.Type
    | FireOnReleaseEffectEntity.Type
    | FireOnRejectEffectInterface
    | FireOnWindowSlideEffectEntity.Type
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
      if (effect.variant !== 'FireOnAdaptiveAdjust') { throw RuntimeError.create(`Expected FireOnAdaptiveAdjust effect, received ${effect.variant}`); }
      this.hooks.invoke('onAdaptiveAdjust', () => { const result = this.onAdaptiveAdjust(effect.previousLimit, effect.newLimit); return result; });
    }],
    ['FireOnContended', (effect) => {
      if (effect.variant !== 'FireOnContended') { throw RuntimeError.create(`Expected FireOnContended effect, received ${effect.variant}`); }
      this.hooks.invoke('onContended', () => { const result = this.onContended(effect.activeCount, effect.queuedCount); return result; });
    }],
    ['FireOnDrainComplete', (effect) => {
      if (effect.variant !== 'FireOnDrainComplete') { throw RuntimeError.create(`Expected FireOnDrainComplete effect, received ${effect.variant}`); }
      this.hooks.invoke('onDrainComplete', () => { const result = this.onDrainComplete(effect.totalExecuted); return result; });
    }],
    ['FireOnReject', (effect) => {
      if (effect.variant !== 'FireOnReject') { throw RuntimeError.create(`Expected FireOnReject effect, received ${effect.variant}`); }
      this.hooks.invoke('onReject', () => { const result = this.onReject(effect.reason); return result; });
    }],
    ['FireOnRelease', (effect) => {
      if (effect.variant !== 'FireOnRelease') { throw RuntimeError.create(`Expected FireOnRelease effect, received ${effect.variant}`); }
      this.hooks.invoke('onRelease', () => { const result = this.onRelease(effect.activeCount, effect.totalExecuted); return result; });
    }],
    ['FireOnWindowSlide', (effect) => {
      if (effect.variant !== 'FireOnWindowSlide') { throw RuntimeError.create(`Expected FireOnWindowSlide effect, received ${effect.variant}`); }
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
    if (!Predicates.isObjectLike(result) || !Predicates.isInstanceOf<TInstance>(result, resolveSubclassConstructor())) {
      throw RuntimeError.create('Throttle.create() did not construct the requested subclass.');
    }
    return result;
  }

  /**
   * FSM state. Transitions via transition().
   */
  #state: ThrottleStateEntity.Type = 'idle';

  private readonly abortController = new AbortController();
  private readonly activeOperations = new Set<ActiveOperationInterface>();
  private adjustmentCount = INITIAL_COUNTER;
  private config: ValidatedThrottleConfigEntity.Type;
  private drainWaiter: PromiseWithResolvers<void> | undefined;
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

  private readonly semaphore: Semaphore;

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
    this.semaphore = Semaphore.create({ 'permits': this.config.concurrencyLimit });

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
      throw RuntimeError.create(`Illegal state transition: ${from} → ${to}`);
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
    event: AbortStartedEventEntity.Type
    | AcquiredEventEntity.Type
    | ConcurrencyAdjustedEventEntity.Type
    | ContendedEventEntity.Type
    | DrainCompletedEventEntity.Type
    | DrainStartedEventEntity.Type
    | OperationRejectedEventInterface
    | QueuedEventEntity.Type
    | SlotReleasedEventEntity.Type
    | WindowSlidEventEntity.Type
  ): void {
    const effect = this.stepLifecycle(event);
    const handler = this.lifecycleEffectHandlers.get(effect.variant);
    if (handler === undefined) {
      throw RuntimeError.create(`fireLifecycleEffect received an async-only effect: ${effect.variant}`);
    }
    handler(effect);
  }

  /**
   * Drives `OperationLifecycleMachine.reduce()` for `event` and fires its single
   * resulting effect via `hooks.invokeAsync(...)`, exposing completion to the caller.
   */
  private async fireLifecycleEffectAsync(
    event: AbortStartedEventEntity.Type
    | AcquiredEventEntity.Type
    | ConcurrencyAdjustedEventEntity.Type
    | ContendedEventEntity.Type
    | DrainCompletedEventEntity.Type
    | DrainStartedEventEntity.Type
    | OperationRejectedEventInterface
    | QueuedEventEntity.Type
    | SlotReleasedEventEntity.Type
    | WindowSlidEventEntity.Type
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
        throw RuntimeError.create(`fireLifecycleEffectAsync received a sync-only effect: ${effect.variant}`);
    }
  }

  /** Transitions the lifecycle reducer and returns its single effect for `event`. */
  private stepLifecycle(
    event: AbortStartedEventEntity.Type
    | AcquiredEventEntity.Type
    | ConcurrencyAdjustedEventEntity.Type
    | ContendedEventEntity.Type
    | DrainCompletedEventEntity.Type
    | DrainStartedEventEntity.Type
    | OperationRejectedEventInterface
    | QueuedEventEntity.Type
    | SlotReleasedEventEntity.Type
    | WindowSlidEventEntity.Type
  ):
    FireOnAbortStartEffectEntity.Type
    | FireOnAcquireEffectEntity.Type
    | FireOnAcquireWaitEffectEntity.Type
    | FireOnAdaptiveAdjustEffectEntity.Type
    | FireOnContendedEffectEntity.Type
    | FireOnDrainCompleteEffectEntity.Type
    | FireOnDrainStartEffectEntity.Type
    | FireOnReleaseEffectEntity.Type
    | FireOnRejectEffectInterface
    | FireOnWindowSlideEffectEntity.Type {
    const step = this.lifecycle.transition(this.lifecycleState, event);

    this.lifecycleState = step.state;

    const [effect] = step.effects;

    if (effect === undefined) {
      throw RuntimeError.create(`OperationLifecycleMachine produced no effect for event: ${event.type}`);
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

    if (this.#state !== 'draining') {
      this.transition('draining');
    }

    const timedOut = await this.handleGracePeriod(timeout);

    this.transition('aborted');

    const cancelledCount = this.activeOperations.size;

    this.abortController.abort();
    await this.cancelActiveOperations();
    this.drainWaiter?.resolve();
    this.drainWaiter = undefined;

    let abortHookError: unknown;

    try {
      await this.fireLifecycleEffectAsync({ 'cancelledCount': cancelledCount, 'type': 'AbortStarted' });
    } catch (error) {
      abortHookError = error;
    }

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
   * Acquires a shared permit and maps its state to the throttle lifecycle.
   */
  private async acquireSlot(operation: ActiveOperationInterface): Promise<void> {
    const waited = this.semaphore.available <= INITIAL_COUNTER || this.semaphore.queuedCount > INITIAL_COUNTER;
    let acquisition: Promise<(() => Promise<void>) | undefined>;
    let acquisitionError: unknown;

    if (waited) {
      this.fireLifecycleEffect({
        'activeCount': this.semaphore.activeCount,
        'queuedCount': this.semaphore.queuedCount,
        'type': 'Contended'
      });

      const admission = new AbortController();
      acquisition = this.semaphore.acquire({ 'signal': AbortSignal.any([this.abortController.signal, admission.signal]) }).catch((error: unknown) => {
        acquisitionError = error;
        return undefined;
      });
      try {
        await this.fireLifecycleEffectAsync({
          'queuedCount': this.semaphore.queuedCount,
          'type': 'Queued'
        });
      } catch (error) {
        admission.abort();
        await acquisition;
        throw error;
      }
    } else {
      if (this.#state === 'idle') {
        this.transition('active');
      }
      acquisition = this.semaphore.acquire({ 'signal': this.abortController.signal });
    }

    try {
      const release = await acquisition;
      if (release === undefined) {
        throw acquisitionError ?? RuntimeError.create('Semaphore acquisition failed without an error.');
      }
      this.bindPermit(operation, release);
      if (waited) {
        this.fireLifecycleEffect({
          'activeCount': this.semaphore.activeCount,
          'queuedCount': this.semaphore.queuedCount,
          'type': 'WindowSlid'
        });
      } else {
        await this.fireLifecycleEffectAsync({
          'activeCount': this.semaphore.activeCount,
          'queuedCount': this.semaphore.queuedCount,
          'type': 'Acquired'
        });
      }
    } catch (error) {
      if (operation.release !== undefined) {
        await operation.release();
      } else {
        this.completeIfIdle();
      }
      throw error;
    }
  }

  /**
   * Gives one tracked operation sole, idempotent ownership of its acquired permit.
   */
  private bindPermit(operation: ActiveOperationInterface, release: () => Promise<void>): void {
    let released = false;
    operation.release = async (): Promise<void> => {
      if (released) {
        return;
      }
      released = true;
      await this.releaseSlot(release);
    };
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
   * Resolves tracked consumers and releases permits before abort observability runs.
   */
  private async cancelActiveOperations(): Promise<void> {
    const releases: Promise<void>[] = [];
    for (const operation of this.activeOperations) {
      if (operation.completed) {
        continue;
      }
      operation.completed = true;
      operation.resolve();
      if (operation.release !== undefined) {
        releases.push(operation.release());
      }
    }
    this.activeOperations.clear();
    await Promise.allSettled(releases);
  }

  /**
   * Enter draining mode and wait for the shared permit gate to become idle.
   */
  async drain(): Promise<void> {
    if (this.#state === 'aborted') {
      return;
    }

    if (this.#state !== 'draining') {
      this.transition('draining');
      await this.fireLifecycleEffectAsync({
        'activeCount': this.semaphore.activeCount,
        'queuedCount': this.semaphore.queuedCount,
        'type': 'DrainStarted'
      });
    }

    if (this.semaphore.activeCount === INITIAL_COUNTER && this.semaphore.queuedCount === INITIAL_COUNTER) {
      return;
    }

    this.drainWaiter ??= Promise.withResolvers<void>();
    await Promise.race([this.semaphore.waitForIdle(), this.drainWaiter.promise]);
    this.drainWaiter = undefined;
    this.completeIfIdle();
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

    return await new Promise<T | undefined>((resolve, reject) => {
      const operation: ActiveOperationInterface = {
        'completed': false,
        'release': undefined,
        'resolve': (): void => { resolve(undefined); }
      };
      this.activeOperations.add(operation);
      this.startOperation(operation, callback, resolve, reject).catch(reject);
    });
  }

  /**
   * Keeps an execute() request cancellation-owned through admission and operation execution.
   */
  private async startOperation<T>(
    operation: ActiveOperationInterface,
    callback: () => Promise<T>,
    resolve: (value: T | undefined) => void,
    reject: (reason?: unknown) => void
  ): Promise<void> {
    try {
      await this.acquireSlot(operation);
    } catch (error) {
      if (!operation.completed) {
        operation.completed = true;
        this.activeOperations.delete(operation);
        reject(error);
      }
      return;
    }

    if (operation.completed) {
      return;
    }

    await this.runOperation(operation, callback, resolve, reject);
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
      'activeCount': this.semaphore.activeCount,
      'concurrencyLimit': this.config.concurrencyLimit,
      'isAborted': this.#state === 'aborted',
      'isDraining': this.#state === 'draining',
      'queuedCount': this.semaphore.queuedCount,
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
   * Runs one consumer operation while the shared semaphore owns its permit.
   */
  private async runOperation<T>(
    operation: ActiveOperationInterface,
    callback: () => Promise<T>,
    resolve: (value: T | undefined) => void,
    reject: (reason?: unknown) => void
  ): Promise<void> {
    const releasePermit = operation.release;
    if (releasePermit === undefined) {
      throw RuntimeError.create('An acquired throttle operation must own a permit release.');
    }
    const operationStartTime = this.now();

    try {
      const result = await callback();
      if (operation.completed) {
        await releasePermit();
        return;
      }

      this.totalExecuted += 1;
      if (this.latencyBuffer !== undefined) {
        this.latencyBuffer.push(this.now() - operationStartTime);
        await this.maybeAdjustConcurrency();
      }

      operation.completed = true;
      this.activeOperations.delete(operation);
      try {
        await releasePermit();
      } catch (releaseError) {
        reject(releaseError);
        return;
      }
      resolve(result);
    } catch (error) {
      if (operation.completed) {
        await releasePermit();
        return;
      }

      operation.completed = true;
      this.activeOperations.delete(operation);
      const normalizedError = Predicates.isError(error) ? error : RuntimeError.create(String(error));
      let outcome: unknown = normalizedError;

      try {
        this.fireLifecycleEffect({ 'reason': normalizedError, 'type': 'OperationRejected' });
      } catch (hookError) {
        outcome = hookError;
      }

      try {
        await releasePermit();
      } catch (releaseError) {
        outcome = releaseError;
      }

      reject(outcome);
    }
  }

  /**
   * Releases a shared permit and publishes the throttle-level lifecycle event.
   */
  private async releaseSlot(release: () => Promise<void>): Promise<void> {
    const queuedBeforeRelease = this.semaphore.queuedCount;
    await release();

    const activeCount = this.semaphore.activeCount;
    let outcome: 'became-idle' | 'handoff-granted' | 'still-busy';
    if (queuedBeforeRelease > this.semaphore.queuedCount && activeCount > INITIAL_COUNTER) {
      outcome = 'handoff-granted';
    } else if (activeCount === INITIAL_COUNTER) {
      outcome = 'became-idle';
    } else {
      outcome = 'still-busy';
    }

    try {
      this.fireLifecycleEffect({
        'activeCount': activeCount,
        'outcome': outcome,
        'totalExecuted': this.totalExecuted,
        'type': 'SlotReleased'
      });
    } finally {
      this.completeIfIdle();
    }
  }

  /**
   * Check if the throttle has completed all operations.
   */
  isComplete(): boolean {
    const isIdle = this.semaphore.activeCount === INITIAL_COUNTER && this.semaphore.queuedCount === INITIAL_COUNTER;
    const result = this.#state === 'aborted' || isIdle;
    return result;
  }

  /**
   * Adjust concurrency through the shared permit gate.
   */
  private async maybeAdjustConcurrency(): Promise<void> {
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
      this.adjustmentCount += 1;
      await this.semaphore.setPermits(newLimit);
    }

    this.lastAdjustmentTime = this.now();
  }

  /**
   * Completes the logical drain state once the permit gate has no work.
   */
  private completeIfIdle(): void {
    if (!this.isComplete() || this.#state === 'aborted') {
      return;
    }

    if (this.#state === 'draining') {
      try {
        this.fireLifecycleEffect({ 'totalExecuted': this.totalExecuted, 'type': 'DrainCompleted' });
      } finally {
        this.transition('idle');
      }
      return;
    }

    if (this.#state === 'active') {
      this.transition('idle');
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
   * Wait for operations to complete, up to a maximum time
   * @param timeout Maximum time to wait in milliseconds
   * @returns true if timed out, false if completed within time
   */
  private async waitForGracePeriod(timeout: number): Promise<boolean> {
    if (this.isComplete()) {
      return false;
    }

    const controller = new AbortController();
    const complete = this.semaphore.waitForIdle().then(() => { controller.abort(); });

    try {
      await Delay.for(timeout, controller.signal);

      // Timeout completed - operations did not finish in time
      return true;
    } catch {
      await complete;
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
    let configuration: Partial<ThrottleConfigEntity.Type> = {};
    if (config !== undefined) {
      configuration = config;
    }
    let parsedConfiguration: ThrottleConfigEntity.Type;
    try {
      parsedConfiguration = ThrottleConfigEntity.intake(configuration);
    } catch (error) {
      if (error instanceof SchemaIntakeError) {
        throw ConfigurationError.create(error.message);
      }
      throw error;
    }
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
