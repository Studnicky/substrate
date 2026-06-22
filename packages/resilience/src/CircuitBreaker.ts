/** Async circuit breaker: closed → open (on failure threshold) → halfOpen (on timeout) → closed. */

import type { CircuitBreakerOptionsType } from './CircuitBreakerOptionsType.js';
import type { CircuitStateType } from './CircuitStateType.js';

import { CircuitBreakerOpenError } from './CircuitBreakerOpenError.js';

export class CircuitBreaker {
  readonly #failureThreshold: number;
  readonly #resetTimeoutMs: number;
  readonly #successThreshold: number;
  readonly #name: string;
  readonly #clock: () => number;
  #state: CircuitStateType = 'closed';
  #failureCount = 0;
  #successCount = 0;
  #openedAt = 0;

  constructor(options: CircuitBreakerOptionsType) {
    if (options.failureThreshold < 1) throw new RangeError('failureThreshold must be >= 1');
    if (options.resetTimeoutMs < 0) throw new RangeError('resetTimeoutMs must be >= 0');
    this.#failureThreshold = options.failureThreshold;
    this.#resetTimeoutMs = options.resetTimeoutMs;
    this.#successThreshold = options.successThreshold ?? 1;
    this.#name = options.name ?? 'circuit-breaker';
    this.#clock = options.clock ?? (() => Date.now());
  }

  get state(): CircuitStateType { return this.#state; }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.#checkHalfOpen();
    if (this.#state === 'open') {
      throw new CircuitBreakerOpenError(this.#name);
    }
    try {
      const result = await fn();
      this.#onSuccess();
      return result;
    } catch (err: unknown) {
      this.#onFailure();
      throw err;
    }
  }

  reset(): void {
    this.#state = 'closed';
    this.#failureCount = 0;
    this.#successCount = 0;
    this.#openedAt = 0;
  }

  forceClosed(): void { this.reset(); }
  forceOpen(): void { this.#state = 'open'; this.#openedAt = this.#clock(); }

  #checkHalfOpen(): void {
    if (this.#state === 'open' && this.#clock() - this.#openedAt >= this.#resetTimeoutMs) {
      this.#state = 'halfOpen';
      this.#successCount = 0;
    }
  }

  #onSuccess(): void {
    if (this.#state === 'halfOpen') {
      this.#successCount += 1;
      if (this.#successCount >= this.#successThreshold) { this.reset(); }
    } else {
      this.#failureCount = 0;
    }
  }

  #onFailure(): void {
    if (this.#state === 'halfOpen') {
      this.#state = 'open';
      this.#openedAt = this.#clock();
      return;
    }
    this.#failureCount += 1;
    if (this.#failureCount >= this.#failureThreshold) {
      this.#state = 'open';
      this.#openedAt = this.#clock();
    }
  }
}
