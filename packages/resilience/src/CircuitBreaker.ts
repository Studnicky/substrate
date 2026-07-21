/** Async circuit breaker: closed → open (on failure threshold) → halfOpen (on timeout) → closed. */

import type { ErrorClassificationEntity } from '@studnicky/errors';

import { HookInvoker } from '@studnicky/errors';

import type { CircuitStateEntity } from './entities/CircuitStateEntity.js';
import type { CircuitBreakerOptionsInterface } from './interfaces/CircuitBreakerOptionsInterface.js';

import { CircuitBreakerOpenError } from './CircuitBreakerOpenError.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

export class CircuitBreaker {
  static readonly #OwnedHookInvoker = class CircuitBreakerHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  readonly #failureThreshold: number;
  readonly #resetTimeoutMs: number;
  readonly #successThreshold: number;
  readonly #name: string;
  readonly #clock: () => number;
  readonly #classifierFn: (error: Error, attemptNumber: number) => ErrorClassificationEntity.Type;
  #state: CircuitStateEntity.Type = 'closed';
  #failureCount = 0;
  #successCount = 0;
  #openedAt = 0;

  /** Invokes lifecycle hooks, retaining diagnostics in the invoker while swallowing failures. */
  protected readonly hooks: HookInvoker;

  static create(options: CircuitBreakerOptionsInterface): CircuitBreaker {
    return new this(options);
  }

  protected constructor(options: CircuitBreakerOptionsInterface) {
    this.hooks = new CircuitBreaker.#OwnedHookInvoker();
    if (options.failureThreshold < 1) {throw new ResilienceConfigError('failureThreshold must be >= 1');}
    if (options.resetTimeoutMs < 0) {throw new ResilienceConfigError('resetTimeoutMs must be >= 0');}
    this.#failureThreshold = options.failureThreshold;
    this.#resetTimeoutMs = options.resetTimeoutMs;
    this.#successThreshold = options.successThreshold ?? 1;
    this.#name = options.name ?? 'circuit-breaker';
    this.#clock = options.clock ?? (() => { const result = Date.now(); return result; });

    let classifierFn: (error: Error, attemptNumber: number) => ErrorClassificationEntity.Type;
    if (options.errorClassifier === undefined) {
      // Arrow function required for subclass polymorphism - classifyError may be overridden
      classifierFn = (error, attemptNumber) => { const result = this.classifyError(error, attemptNumber); return result; };
    } else if (typeof options.errorClassifier === 'function') {
      classifierFn = options.errorClassifier;
    } else {
      const classifier = options.errorClassifier;

      classifierFn = (error, attemptNumber) => { const result = classifier.classify(error, attemptNumber); return result; };
    }
    this.#classifierFn = classifierFn;
  }

  get state(): CircuitStateEntity.Type { const result = this.#state;
    return result; }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.#checkHalfOpen();
    if (this.#state === 'open') {
      this.hooks.invoke('onReject', () => {
        const result = this.onReject();
        return result;
      });
      throw new CircuitBreakerOpenError(this.#name);
    }
    try {
      const result = await fn();
      this.#recordSuccess();
      return result;
    } catch (err: unknown) {
      this.#recordFailure(err);
      throw err;
    }
  }

  reset(): void {
    this.#state = 'closed';
    this.#failureCount = 0;
    this.#successCount = 0;
    this.#openedAt = 0;
    this.hooks.invoke('onClose', () => {
      const result = this.onClose();
      return result;
    });
  }

  forceOpen(): void {
    this.#state = 'open';
    this.#openedAt = this.#clock();
    this.hooks.invoke('onOpen', () => {
      const result = this.onOpen();
      return result;
    });
  }

  /**
   * Classify a thrown error to determine whether it counts as a circuit failure.
   *
   * Subclasses can override this method to provide custom classification logic.
   * If `errorClassifier` is provided in options, it takes precedence over this
   * method. This is the same `@studnicky/errors` classifier family
   * `@studnicky/retry`'s `Retry` class uses — `{ retryable: true }` means the
   * error is transient and already handled elsewhere (e.g. by a wrapped `Retry`),
   * so it does NOT count toward the failure threshold; `{ retryable: false }`
   * means the error is real, non-transient breakage, so it DOES count.
   *
   * Default implementation always returns `{ retryable: false }` — every thrown
   * error counts as a failure, preserving `CircuitBreaker`'s original behavior.
   *
   * @param error - The error thrown by the wrapped call
   * @param attemptNumber - Count of consecutive failures so far (`#failureCount`)
   * @returns Classification result indicating whether the error counts as a failure
   */
  protected classifyError(_error: unknown, _attemptNumber: number): ErrorClassificationEntity.Type {
    return { 'retryable': false };
  }

  /**
   * Fires after `fn()` resolves successfully in any circuit state.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onSuccess(): void {}

  /**
   * Fires after `fn()` throws in any circuit state.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onFailure(_error: unknown): void {}

  /**
   * Fires when the failure threshold is reached and the circuit transitions closed → open.
   * Does NOT fire on the halfOpen → open re-open path. Must not throw or block.
   */
  protected onTrip(): void {}

  /**
   * Fires every time the circuit state becomes open (threshold trip or halfOpen → open on failure).
   * Must not throw or block.
   */
  protected onOpen(): void {}

  /**
   * Fires when the circuit transitions open → halfOpen after resetTimeoutMs.
   * Must not throw or block.
   */
  protected onHalfOpen(): void {}

  /**
   * Fires when the circuit becomes closed (successThreshold reached in halfOpen or manual reset).
   * Must not throw or block.
   */
  protected onClose(): void {}

  /**
   * Fires when execute() short-circuits because the circuit is open.
   * Must not throw or block.
   */
  protected onReject(): void {}

  #checkHalfOpen(): void {
    if (this.#state === 'open' && this.#clock() - this.#openedAt >= this.#resetTimeoutMs) {
      this.#state = 'halfOpen';
      this.#successCount = 0;
      this.hooks.invoke('onHalfOpen', () => {
        const result = this.onHalfOpen();
        return result;
      });
    }
  }

  #recordSuccess(): void {
    if (this.#state === 'halfOpen') {
      this.#successCount += 1;
      if (this.#successCount >= this.#successThreshold) {
        this.#state = 'closed';
        this.#failureCount = 0;
        this.#successCount = 0;
        this.#openedAt = 0;
        this.hooks.invoke('onSuccess', () => {
          const result = this.onSuccess();
          return result;
        });
        this.hooks.invoke('onClose', () => {
          const result = this.onClose();
          return result;
        });
      } else {
        this.hooks.invoke('onSuccess', () => {
          const result = this.onSuccess();
          return result;
        });
      }
    } else {
      this.#failureCount = 0;
      this.hooks.invoke('onSuccess', () => {
        const result = this.onSuccess();
        return result;
      });
    }
  }

  #recordFailure(err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err));
    const classification = this.#classifierFn(error, this.#failureCount);
    if (classification.retryable) {
      return;
    }
    if (this.#state === 'halfOpen') {
      this.#state = 'open';
      this.#openedAt = this.#clock();
      this.hooks.invoke('onFailure', () => {
        const result = this.onFailure(err);
        return result;
      });
      this.hooks.invoke('onOpen', () => {
        const result = this.onOpen();
        return result;
      });
      return;
    }
    this.#failureCount += 1;
    if (this.#failureCount >= this.#failureThreshold) {
      this.#state = 'open';
      this.#openedAt = this.#clock();
      this.hooks.invoke('onFailure', () => {
        const result = this.onFailure(err);
        return result;
      });
      this.hooks.invoke('onTrip', () => {
        const result = this.onTrip();
        return result;
      });
      this.hooks.invoke('onOpen', () => {
        const result = this.onOpen();
        return result;
      });
    } else {
      this.hooks.invoke('onFailure', () => {
        const result = this.onFailure(err);
        return result;
      });
    }
  }
}
