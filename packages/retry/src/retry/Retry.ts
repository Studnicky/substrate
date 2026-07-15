import { ConfigValidation } from '@studnicky/config';
import { DefaultHttpErrorClassifier } from '@studnicky/errors';

import type { ErrorClassificationType, RetryConfigInterface, RetryInterface } from '../interfaces/index.js';
import type { RequestStatsType, RetryCallStateType, RetryContextType } from '../types/index.js';

import {
  DEFAULT_MAX_RETRIES,
  EMPTY_LENGTH,
  INCREMENT_BY_ONE,
  INITIAL_COUNTER,
  LAST_ARRAY_INDEX,
  NO_DELAY_MS,
  RETRY_CONFIG_KEYS
} from '../constants/index.js';
import {
  ConfigurationError,
  MaxRetriesExceededError,
  NonRetryableError
} from '../errors/index.js';
import {
  backoffStrategy,
  errorClassifier,
  maxElapsedMs,
  maxRetries
} from './config/schemas/index.js';
import { Delay } from './Delay.js';
import { RetryBuilder } from './RetryBuilder.js';

/**
 * Per-call FSM — one instance per `Retry.execute()` invocation.
 * Not exported; internal to the module.
 *
 * Accepts guard and enter callbacks so it can delegate to the owning Retry
 * instance's protected methods without requiring inheritance.
 */
class RetryCallFsm {
  readonly #guard: (from: RetryCallStateType, to: RetryCallStateType) => boolean;
  readonly #enter: (to: RetryCallStateType, from: RetryCallStateType) => void;
  #state: RetryCallStateType = 'attempting';

  constructor(
    guard: (from: RetryCallStateType, to: RetryCallStateType) => boolean,
    enter: (to: RetryCallStateType, from: RetryCallStateType) => void
  ) {
    this.#guard = guard;
    this.#enter = enter;
  }

  get state(): RetryCallStateType {
    const result = this.#state;
    return result;
  }

  transition(to: RetryCallStateType): void {
    const from = this.#state;

    if (!this.#guard(from, to)) {
      throw new Error(`Illegal state transition: ${from} → ${to}`);
    }

    this.#state = to;
    try {
      this.#enter(to, from);
    } catch {}
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
 * import { Retry, DefaultHttpErrorClassifier, BackoffStrategy } from '@studnicky/retry';
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
 *   protected override onRetryScheduled(context: RetryContextType): void {
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
 *   protected classifyError(error: Error): ErrorClassificationType {
 *     const msg = error.message.toLowerCase();
 *     if (msg.includes('transaction abort') || msg.includes('503')) {
 *       return { retryable: true, reason: 'Transient Fuseki error' };
 *     }
 *     return { retryable: false };
 *   }
 * }
 * ```
 *
 * @example Builder pattern
 * ```typescript
 * const retry = Retry.builder()
 *   .maxRetries(5)
 *   .errorClassifier(new DefaultHttpErrorClassifier())
 *   .build();
 * ```
 */
export class Retry implements RetryInterface {
  /**
   * Create a new RetryBuilder for fluent configuration.
   *
   * @returns New builder instance for configuring retry behavior
   */
  static builder(): RetryBuilder<Retry> {
    const factory = (options: Partial<RetryConfigInterface>): Retry => {
      const result = Retry.create(options);
      return result;
    };
    const result = RetryBuilder.create(factory);
    return result;
  }
  /**
   * Create a new Retry instance with the specified configuration.
   *
   * @param config - Optional partial configuration for retry behavior
   * @returns New Retry instance
   */
  static create(config?: Partial<RetryConfigInterface>): Retry {
    const result = new this(config);
    return result;
  }
  private readonly classifierFn: (error: Error, attemptNumber: number) => ErrorClassificationType;
  private readonly defaultClassifier: DefaultHttpErrorClassifier;
  private readonly backoffStrategy: RetryConfigInterface['backoffStrategy'];

  protected readonly maxRetries: number;
  protected readonly maxElapsedMs: number | undefined;

  protected stats: RequestStatsType = {
    'failedRequests': INITIAL_COUNTER,
    'successfulRequests': INITIAL_COUNTER,
    'totalRequests': INITIAL_COUNTER,
    'totalRetries': INITIAL_COUNTER
  };

  #invokeHook(invoke: () => void): void {
    try {
      invoke();
    } catch {}
  }

  protected constructor(config: Partial<RetryConfigInterface> = {}) {
    const validated = Retry.#validateConfig(config);

    this.maxRetries = validated.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.maxElapsedMs = validated.maxElapsedMs;
    this.defaultClassifier = DefaultHttpErrorClassifier.create();
    this.backoffStrategy = validated.backoffStrategy;

    let classifierFn: (error: Error, attemptNumber: number) => ErrorClassificationType;
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
  protected classifyError(error: Error, attemptNumber: number): ErrorClassificationType {
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
    _classification: ErrorClassificationType
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
  protected onRetryScheduled(context: RetryContextType): void | Promise<void> {
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
  protected guardCall(from: RetryCallStateType, to: RetryCallStateType): boolean {
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
  protected enterCall(_to: RetryCallStateType, _from: RetryCallStateType): void {}

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

    const callFsm = new RetryCallFsm(
      (from, to) => { const result = this.guardCall(from, to); return result; },
      (to, from) => { this.enterCall(to, from); }
    );
    const startTime = Date.now();
    const errors: Error[] = [];
    const state: Record<string, unknown> = {};

    for (let attempt = INITIAL_COUNTER; attempt <= this.maxRetries; attempt++) {
      this.#invokeHook(() => {
        this.onAttempt(attempt);
      });

      const outcome = await this.tryAttempt(fn);

      if (outcome.success) {
        this.handleSuccess(callFsm, attempt, startTime);
        return outcome.result;
      }

      errors.push(outcome.error);
      await this.handleError(callFsm, attempt, outcome.error, errors, startTime, state);
    }

    return this.handleFinalFailure(callFsm, errors);
  }

  /**
   * Get current request statistics.
   */
  getStats(): RequestStatsType {
    const result = Object.freeze({ ...this.stats });
    return result;
  }

  /**
   * Handle error during execution.
   */
  private async handleError(
    callFsm: RetryCallFsm,
    attempt: number,
    error: Error,
    errors: Error[],
    startTime: number,
    state: Record<string, unknown>
  ): Promise<void> {
    const classification = this.classifierFn(error, attempt);

    if (!classification.retryable) {
      this.handleNonRetryableError(callFsm, attempt, error, classification);
    }

    this.#invokeHook(() => {
      this.onRetryableError(attempt, error, classification);
    });

    // performRetry transitions FSM: attempting → waiting, then checks budget,
    // then (if budget remains) sleeps and transitions waiting → attempting.
    await this.performRetry(callFsm, attempt, error, classification, errors, startTime, state);
  }

  /**
   * Handle final failure after loop (unreachable in practice — exhaustion is
   * caught inside handleError before the loop can exit normally).
   */
  private handleFinalFailure(_callFsm: RetryCallFsm, errors: Error[]): never {
    this.stats.failedRequests++;

    const finalError = errors.at(LAST_ARRAY_INDEX) ?? new Error('Unknown error occurred during retry');

    this.#invokeHook(() => {
      this.onGiveUp(finalError, this.maxRetries, 'exhausted');
    });

    throw new MaxRetriesExceededError(
      `Operation failed after ${this.maxRetries + INCREMENT_BY_ONE} attempts: ${String(finalError)}`,
      this.maxRetries,
      this.maxRetries + INCREMENT_BY_ONE,
      errors.length > EMPTY_LENGTH ? errors : [finalError]
    );
  }

  /**
   * Handle lifecycle hook abort.
   */
  private handleAbort(callFsm: RetryCallFsm, attempt: number, error: Error): never {
    this.stats.failedRequests++;

    callFsm.transition('aborted');
    this.#invokeHook(() => {
      this.onGiveUp(error, attempt, 'aborted');
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
  private handleMaxRetriesExceeded(
    callFsm: RetryCallFsm,
    attempt: number,
    error: Error,
    errors: Error[]
  ): never {
    this.stats.failedRequests++;

    callFsm.transition('exhausted');
    this.#invokeHook(() => {
      this.onGiveUp(error, attempt, 'exhausted');
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
  private handleNonRetryableError(
    callFsm: RetryCallFsm,
    attempt: number,
    error: Error,
    classification: ErrorClassificationType
  ): never {
    this.stats.failedRequests++;

    callFsm.transition('failed');
    this.#invokeHook(() => {
      this.onGiveUp(error, attempt, 'nonRetryable');
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
  private handleSuccess(callFsm: RetryCallFsm, attempt: number, startTime: number): void {
    this.stats.successfulRequests++;

    callFsm.transition('succeeded');
    this.#invokeHook(() => {
      this.onSuccess(attempt, Date.now() - startTime);
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
    callFsm: RetryCallFsm,
    attempt: number,
    error: Error,
    classification: ErrorClassificationType,
    errors: Error[],
    startTime: number,
    state: Record<string, unknown>
  ): Promise<void> {
    // Enter waiting state before any budget or abort checks so that terminal
    // transitions (exhausted, aborted) always come from 'waiting'.
    callFsm.transition('waiting');

    if (attempt === this.maxRetries) {
      this.handleMaxRetriesExceeded(callFsm, attempt, error, errors);
    }

    // Time ceiling: same exhaustion path as attempt-count exhaustion — whichever
    // budget (attempts or elapsed time) is hit first wins.
    if (this.maxElapsedMs !== undefined && Date.now() - startTime >= this.maxElapsedMs) {
      this.handleMaxRetriesExceeded(callFsm, attempt, error, errors);
    }

    // Only count a retry when the budget allows another attempt.
    this.stats.totalRetries++;

    const context: RetryContextType = {
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

    await this.onRetryScheduled(context);

    if (context.abort === true) {
      this.handleAbort(callFsm, attempt, error);
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

  private static readonly propertyValidators: Record<string, (val: unknown) => void> = {
    'backoffStrategy': backoffStrategy.validateBackoffStrategy,
    'errorClassifier': errorClassifier.validateErrorClassifier,
    'maxElapsedMs': maxElapsedMs.validateMaxElapsedMs,
    'maxRetries': maxRetries.validateMaxRetries
  };

  static #validateConfig(config?: Partial<RetryConfigInterface>): Partial<RetryConfigInterface> {
    try {
      const userConfig = config ?? {};
      const configObj = userConfig as Record<string, unknown>;

      ConfigValidation.assertNoUnknownKeys(configObj, RETRY_CONFIG_KEYS);

      for (const [key, validator] of Object.entries(Retry.propertyValidators)) {
        if (key in userConfig) {
          validator(configObj[key]);
        }
      }

      return userConfig;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      if (error instanceof Error) {
        throw ConfigurationError.create(error.message);
      }
      throw ConfigurationError.create(String(error));
    }
  }
}
