import {
  DefaultHttpErrorClassifier,
  type ErrorClassificationEntity,
  HookInvoker
} from '@studnicky/errors';

import type { RequestStatsEntity } from '../entities/RequestStatsEntity.js';
import type { RetryCallStateEntity } from '../entities/RetryCallStateEntity.js';
import type { RetryConfigInterface, RetryContextInterface, RetryInterface } from '../interfaces/index.js';

import {
  DEFAULT_MAX_RETRIES,
  INCREMENT_BY_ONE,
  INITIAL_COUNTER,
  NO_DELAY_MS
} from '../constants/index.js';
import {
  MaxRetriesExceededError,
  NonRetryableError
} from '../errors/index.js';
import { validateRetryConfig } from './config/validateRetryConfig.js';
import { Delay } from './Delay.js';

interface RetryCallFsmInterface {
  readonly 'state': RetryCallStateEntity.Type;
  transition(to: RetryCallStateEntity.Type): void;
}

/**
 * Composes the shared invoker with Retry's swallow disposition. Synchronous
 * hooks stay synchronous; asynchronous failures and configured timeouts are
 * consumed without replacing the canonical `execute()` result.
 */
class RetryHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: unknown): void {
    // Retry lifecycle hooks are advisory and never replace execute()'s result.
  }
}

/**
 * Base class for async operations with retry logic.
 *
 * Protocol-agnostic retry behavior with extensible error classification. The bare
 * class performs NO observability of its own — it exposes protected lifecycle hooks
 * (`onAttempt`, `onSuccess`, `onRetryableError`, `onRetryScheduled`, `onGiveUp`) that
 * a consumer overrides to add logging/timing/metrics. Can be instantiated directly
 * with an errorClassifier in config, or extended with a custom classifyError().
 *
 * @example Direct instantiation with config classifier and backoff
 * ```typescript
 * import { DefaultHttpErrorClassifier } from '@studnicky/errors';
 * import { BackoffStrategy, Retry } from '@studnicky/retry';
 *
 * const retry = Retry.create({
 *   maxRetries: 3,
 *   errorClassifier: DefaultHttpErrorClassifier.create(),
 *   backoffStrategy: { strategy: BackoffStrategy.exponential, baseDelayMs: 100 }
 * });
 *
 * const result = await retry.execute(() => fetchData());
 * ```
 *
 * @example Adding observability and backoff via hooks
 * ```typescript
 * class ObservedRetry extends Retry {
 *   protected override onRetryScheduled(context: RetryContextInterface): void {
 *     context.delayMs = BackoffStrategy.exponential(context.attemptNumber, 100);
 *     this.logger.warn('retry.scheduled', { attemptNumber: context.attemptNumber, delayMs: context.delayMs });
 *   }
 *   protected override onGiveUp(error: Error, attemptNumber: number, reason: string): void {
 *     this.logger.error('retry.giveUp', { reason, attemptNumber, error: error.message });
 *   }
 * }
 * ```
 *
 * @example Extension of classification
 * ```typescript
 * class FusekiRetry extends Retry {
 *   protected classifyError(error: Error): ErrorClassificationEntity.Type {
 *     const msg = error.message.toLowerCase();
 *     if (msg.includes('transaction abort') || msg.includes('503')) {
 *       return { retryable: true, reason: 'Transient Fuseki error' };
 *     }
 *     return { retryable: false };
 *   }
 * }
 * ```
 *
 */
export class Retry implements RetryInterface {
  static readonly #OwnedCallFsm = class RetryCallFsm implements RetryCallFsmInterface {
    readonly #owner: Retry;
    #state: RetryCallStateEntity.Type = 'attempting';

    constructor(owner: Retry) {
      this.#owner = owner;
    }

    get state(): RetryCallStateEntity.Type {
      const result = this.#state;
      return result;
    }

    transition(to: RetryCallStateEntity.Type): void {
      const from = this.#state;

      if (!this.#owner.guardCall(from, to)) {
        throw new Error(`Illegal state transition: ${from} → ${to}`);
      }

      this.#state = to;
      this.#owner.hooks.invoke('enterCall', () => {
        const result = this.#owner.enterCall(to, from);
        return result;
      });
    }
  };

  /**
   * Create a new Retry instance with the specified configuration.
   *
   * @param config - Optional partial configuration for retry behavior
   * @returns New Retry instance
   */
  static create(config?: RetryConfigInterface): Retry {
    const result = new this(config);
    return result;
  }
  private readonly classifierFn: (error: Error, attemptNumber: number) => ErrorClassificationEntity.Type;
  private readonly defaultClassifier: DefaultHttpErrorClassifier;
  private readonly backoffStrategy: RetryConfigInterface['backoffStrategy'];

  protected readonly hooks: RetryHookInvoker;
  protected readonly maxRetries: number;
  protected readonly maxElapsedMs: number | undefined;

  protected stats: RequestStatsEntity.Type = {
    'failedRequests': INITIAL_COUNTER,
    'successfulRequests': INITIAL_COUNTER,
    'totalRequests': INITIAL_COUNTER,
    'totalRetries': INITIAL_COUNTER
  };

  protected constructor(config: RetryConfigInterface = {}) {
    const validated = validateRetryConfig.validate(config);

    this.hooks = new RetryHookInvoker(
      validated.hookTimeoutMs === undefined ? undefined : { 'timeoutMs': validated.hookTimeoutMs }
    );
    this.maxRetries = validated.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.maxElapsedMs = validated.maxElapsedMs;
    this.defaultClassifier = DefaultHttpErrorClassifier.create();
    this.backoffStrategy = validated.backoffStrategy;

    let classifierFn: (error: Error, attemptNumber: number) => ErrorClassificationEntity.Type;
    if (validated.errorClassifier === undefined) {
      // Arrow function required for subclass polymorphism - classifyError may be overridden
      classifierFn = (error, attemptNumber) => { const result = this.classifyError(error, attemptNumber); return result; };
    } else if (typeof validated.errorClassifier === 'function') {
      classifierFn = validated.errorClassifier;
    } else {
      const classifier = validated.errorClassifier;

      classifierFn = (error, attemptNumber) => { const result = classifier.classify(error, attemptNumber); return result; };
    }
    this.classifierFn = classifierFn;
  }

  /**
   * Classify an error to determine if it should be retried.
   *
   * Subclasses can override this method to provide custom error classification logic.
   * If errorClassifier is provided in config, it takes precedence over this method.
   *
   * @param error - The error that occurred
   * @param attemptNumber - Current attempt number (0-indexed)
   * @returns Classification result indicating whether to retry
   */
  protected classifyError(error: Error, attemptNumber: number): ErrorClassificationEntity.Type {
    const result = this.defaultClassifier.classify(error, attemptNumber);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override these to add logging/timing/metrics. (See @studnicky/logger, /timing.)
  // ---------------------------------------------------------------------------

  /** Fires at the start of each attempt (0-indexed). */
  protected onAttempt(_attemptNumber: number): void {}

  /** Fires after a successful attempt, with elapsed time since execute() began. */
  protected onSuccess(_attemptNumber: number, _elapsedMs: number): void {}

  /** Fires after an error is classified retryable, before the retry is scheduled. */
  protected onRetryableError(
    _attemptNumber: number,
    _error: Error,
    _classification: ErrorClassificationEntity.Type
  ): void {}

  /**
   * Behavioral lifecycle hook fired before each scheduled retry.
   *
   * If `backoffStrategy` was supplied in config, the default body computes
   * `context.delayMs = backoffStrategy.strategy(context.attemptNumber, backoffStrategy.baseDelayMs)`.
   * If no `backoffStrategy` was supplied, `context.delayMs` stays at 0 (immediate retry).
   * If `backoffStrategy` is provided in config, it takes precedence over this method —
   * a subclass overriding this method entirely replaces the default body, so the
   * config-based backoff never runs for that instance.
   *
   * Override to drive retry behavior directly:
   *  - set `context.delayMs` (use a shipped BackoffStrategy, e.g.
   *    `context.delayMs = BackoffStrategy.exponential(context.attemptNumber, 100)`)
   *  - set `context.abort = true` to stop retrying immediately
   *  - mutate `context.state` (may be async — e.g. `context.state.token = await refresh()`)
   */
  protected onRetryScheduled(context: RetryContextInterface): void | Promise<void> {
    if (this.backoffStrategy !== undefined) {
      context.delayMs = this.backoffStrategy.strategy(context.attemptNumber, this.backoffStrategy.baseDelayMs);
    }
  }

  /** Fires when retrying is abandoned. */
  protected onGiveUp(
    _error: Error,
    _attemptNumber: number,
    _reason: 'aborted' | 'exhausted' | 'nonRetryable'
  ): void {}

  // ---------------------------------------------------------------------------
  // Per-call FSM hooks — called by RetryCallFsm on every transition.
  // Override these in subclasses to observe or constrain call-level FSM edges.
  // ---------------------------------------------------------------------------

  /**
   * Guard: returns true when the from → to transition is legal for a single call.
   *
   * Legal edges:
   * - attempting → succeeded
   * - attempting → waiting
   * - attempting → failed
   * - waiting   → attempting
   * - waiting   → exhausted
   * - waiting   → aborted
   */
  protected guardCall(from: RetryCallStateEntity.Type, to: RetryCallStateEntity.Type): boolean {
    if (from === 'attempting' && to === 'succeeded') {return true;}
    if (from === 'attempting' && to === 'waiting') {return true;}
    if (from === 'attempting' && to === 'failed') {return true;}
    if (from === 'waiting' && to === 'attempting') {return true;}
    if (from === 'waiting' && to === 'exhausted') {return true;}
    if (from === 'waiting' && to === 'aborted') {return true;}

    return false;
  }

  /**
   * Hook called when the per-call FSM enters a new state.
   * No-op by default. Override to record or react to call-level transitions.
   */
  protected enterCall(_to: RetryCallStateEntity.Type, _from: RetryCallStateEntity.Type): void {}

  /**
   * Execute an async operation with retry logic.
   *
   * @param fn - Async operation to execute
   * @returns Promise resolving to operation result
   *
   * @throws {MaxRetriesExceededError} When operation fails after all retry attempts
   * @throws {NonRetryableError} When error is classified as non-retryable
   */
  private async tryAttempt<T>(fn: () => Promise<T>): Promise<{ 'result': T; 'success': true } | { 'error': Error; 'success': false }> {
    try {
      const result = await fn();
      return { 'result': result, 'success': true };
    } catch (error) {
      const caughtError = error instanceof Error ? error : new Error(String(error));
      return { 'error': caughtError, 'success': false };
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++;

    const callFsm = new Retry.#OwnedCallFsm(this);
    const startTime = Date.now();
    const errors: Error[] = [];
    const state: Record<string, unknown> = {};

    // Unbounded for(;;) is intentional: the only exits are `return` on success
    // or a throw from handleError()/performRetry() once the attempt-count or
    // elapsed-time budget is exhausted. That is the single exhaustion path —
    // there is no post-loop fallthrough to guard against.
    for (let attempt = INITIAL_COUNTER; ; attempt++) {
      await this.hooks.invokeAsync('onAttempt', () => {
        const result = this.onAttempt(attempt);
        return result;
      });

      const outcome = await this.tryAttempt(fn);

      if (outcome.success) {
        await this.handleSuccess(callFsm, attempt, startTime);
        return outcome.result;
      }

      errors.push(outcome.error);
      await this.handleError(callFsm, attempt, outcome.error, errors, startTime, state);
    }
  }

  /**
   * Get current request statistics.
   */
  getStats(): RequestStatsEntity.Type {
    const result = Object.freeze({ ...this.stats });
    return result;
  }

  /**
   * Handle error during execution.
   */
  private async handleError(
    callFsm: RetryCallFsmInterface,
    attempt: number,
    error: Error,
    errors: Error[],
    startTime: number,
    state: Record<string, unknown>
  ): Promise<void> {
    const classification = this.classifierFn(error, attempt);

    if (!classification.retryable) {
      await this.handleNonRetryableError(callFsm, attempt, error, classification);
    }

    await this.hooks.invokeAsync('onRetryableError', () => {
      const result = this.onRetryableError(attempt, error, classification);
      return result;
    });

    // performRetry transitions FSM: attempting → waiting, then checks budget,
    // then (if budget remains) sleeps and transitions waiting → attempting.
    await this.performRetry(callFsm, attempt, error, classification, errors, startTime, state);
  }

  /**
   * Handle lifecycle hook abort.
   */
  private async handleAbort(callFsm: RetryCallFsmInterface, attempt: number, error: Error): Promise<never> {
    this.stats.failedRequests++;

    callFsm.transition('aborted');
    await this.hooks.invokeAsync('onGiveUp', () => {
      const result = this.onGiveUp(error, attempt, 'aborted');
      return result;
    });

    throw new MaxRetriesExceededError(
      `Operation aborted by retry lifecycle hook after ${attempt + INCREMENT_BY_ONE} attempts: ${String(error)}`,
      this.maxRetries,
      attempt + INCREMENT_BY_ONE,
      [error]
    );
  }

  /**
   * Handle max retries exceeded.
   */
  private async handleMaxRetriesExceeded(
    callFsm: RetryCallFsmInterface,
    attempt: number,
    error: Error,
    errors: Error[]
  ): Promise<never> {
    this.stats.failedRequests++;

    callFsm.transition('exhausted');
    await this.hooks.invokeAsync('onGiveUp', () => {
      const result = this.onGiveUp(error, attempt, 'exhausted');
      return result;
    });

    throw new MaxRetriesExceededError(
      `Operation failed after ${attempt + INCREMENT_BY_ONE} attempts: ${String(error)}`,
      this.maxRetries,
      attempt + INCREMENT_BY_ONE,
      errors
    );
  }

  /**
   * Handle non-retryable error.
   */
  private async handleNonRetryableError(
    callFsm: RetryCallFsmInterface,
    attempt: number,
    error: Error,
    classification: ErrorClassificationEntity.Type
  ): Promise<never> {
    this.stats.failedRequests++;

    callFsm.transition('failed');
    await this.hooks.invokeAsync('onGiveUp', () => {
      const result = this.onGiveUp(error, attempt, 'nonRetryable');
      return result;
    });

    throw new NonRetryableError(
      `Operation failed with non-retryable error: ${String(error)}`,
      error,
      classification.reason ?? 'Unknown reason',
      attempt + INCREMENT_BY_ONE
    );
  }

  /**
   * Handle successful execution.
   */
  private async handleSuccess(callFsm: RetryCallFsmInterface, attempt: number, startTime: number): Promise<void> {
    this.stats.successfulRequests++;

    callFsm.transition('succeeded');
    await this.hooks.invokeAsync('onSuccess', () => {
      const result = this.onSuccess(attempt, Date.now() - startTime);
      return result;
    });
  }

  /**
   * Perform retry with delay.
   *
   * Transitions the FSM: attempting → waiting first, then checks budget
   * (waiting → exhausted) and lifecycle hook abort (waiting → aborted) before
   * sleeping and transitioning waiting → attempting for the next loop iteration.
   */
  private async performRetry(
    callFsm: RetryCallFsmInterface,
    attempt: number,
    error: Error,
    classification: ErrorClassificationEntity.Type,
    errors: Error[],
    startTime: number,
    state: Record<string, unknown>
  ): Promise<void> {
    // Enter waiting state before any budget or abort checks so that terminal
    // transitions (exhausted, aborted) always come from 'waiting'.
    callFsm.transition('waiting');

    if (attempt === this.maxRetries) {
      await this.handleMaxRetriesExceeded(callFsm, attempt, error, errors);
    }

    // Time ceiling: same exhaustion path as attempt-count exhaustion — whichever
    // budget (attempts or elapsed time) is hit first wins.
    if (this.maxElapsedMs !== undefined && Date.now() - startTime >= this.maxElapsedMs) {
      await this.handleMaxRetriesExceeded(callFsm, attempt, error, errors);
    }

    // Only count a retry when the budget allows another attempt.
    this.stats.totalRetries++;

    const context: RetryContextInterface = {
      'abort': false,
      'attemptNumber': attempt,
      'classification': classification,
      'delayMs': NO_DELAY_MS,
      'elapsedMs': Date.now() - startTime,
      'error': error,
      'maxRetries': this.maxRetries,
      'state': state,
      'stats': Object.freeze({ ...this.stats })
    };

    await this.hooks.invokeAsync('onRetryScheduled', () => {
      const result = this.onRetryScheduled(context);
      return result;
    });

    if (context.abort === true) {
      await this.handleAbort(callFsm, attempt, error);
    }

    await Delay.for(context.delayMs);

    callFsm.transition('attempting');
  }

  /**
   * Reset statistics counters.
   */
  resetStats(): void {
    this.stats = {
      'failedRequests': INITIAL_COUNTER,
      'successfulRequests': INITIAL_COUNTER,
      'totalRequests': INITIAL_COUNTER,
      'totalRetries': INITIAL_COUNTER
    };
  }

}
