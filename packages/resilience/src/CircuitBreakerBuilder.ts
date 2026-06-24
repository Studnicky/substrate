/** Fluent builder for CircuitBreaker. */

import type { CircuitBreaker } from './CircuitBreaker.js';
import type { CircuitBreakerOptionsInterface } from './interfaces/CircuitBreakerOptionsInterface.js';

export class CircuitBreakerBuilder {
  readonly #create: (options: CircuitBreakerOptionsInterface) => CircuitBreaker;
  #failureThreshold?: number;
  #resetTimeoutMs?: number;
  #successThreshold?: number;
  #name?: string;
  #clock?: () => number;

  static create(create: (options: CircuitBreakerOptionsInterface) => CircuitBreaker): CircuitBreakerBuilder {
    return new CircuitBreakerBuilder(create);
  }

  private constructor(create: (options: CircuitBreakerOptionsInterface) => CircuitBreaker) {
    this.#create = create;
  }

  withFailureThreshold(value: number): this {
    this.#failureThreshold = value;
    return this;
  }

  withResetTimeoutMs(value: number): this {
    this.#resetTimeoutMs = value;
    return this;
  }

  withSuccessThreshold(value: number): this {
    this.#successThreshold = value;
    return this;
  }

  withName(value: string): this {
    this.#name = value;
    return this;
  }

  withClock(value: () => number): this {
    this.#clock = value;
    return this;
  }

  build(): CircuitBreaker {
    const options: CircuitBreakerOptionsInterface = {
      'failureThreshold': this.#failureThreshold ?? 1,
      'resetTimeoutMs': this.#resetTimeoutMs ?? 0,
      ...(this.#successThreshold !== undefined ? { 'successThreshold': this.#successThreshold } : {}),
      ...(this.#name !== undefined ? { 'name': this.#name } : {}),
      ...(this.#clock !== undefined ? { 'clock': this.#clock } : {})
    };
    return this.#create(options);
  }
}
