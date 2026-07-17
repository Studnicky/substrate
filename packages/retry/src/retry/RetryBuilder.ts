import type { ErrorClassifierFunctionType, ErrorClassifierInterface } from '@studnicky/errors';

import { PickDefined } from '@studnicky/types';

import type {
  RetryBuilderInterface,
  RetryConfigInterface,
  RetryInterface
} from '../interfaces/index.js';

/**
 * Builder for creating Retry instances with fluent API
 *
 * @example Basic usage
 * ```typescript
 * const retry = Retry.builder()
 *   .maxRetries(5)
 *   .build();
 * ```
 *
 * @example With errorClassifier
 * ```typescript
 * const retry = Retry.builder()
 *   .maxRetries(3)
 *   .errorClassifier(new DefaultHttpErrorClassifier())
 *   .build();
 * ```
 */
export class RetryBuilder<T extends RetryInterface = RetryInterface> implements RetryBuilderInterface<T> {
  static create<T extends RetryInterface = RetryInterface>(
    create: (options: RetryConfigInterface) => T
  ): RetryBuilder<T> {
    return new RetryBuilder<T>(create);
  }

  readonly #create: (options: RetryConfigInterface) => T;
  #maxRetries?: number;
  #maxElapsedMs?: number;
  #hookTimeoutMs?: number;
  #errorClassifier?: ErrorClassifierFunctionType | ErrorClassifierInterface;
  #backoffStrategy?: RetryConfigInterface['backoffStrategy'];

  private constructor(create: (options: RetryConfigInterface) => T) {
    this.#create = create;
  }

  /**
   * Set error classifier for determining retry behavior
   */
  errorClassifier(value: ErrorClassifierFunctionType | ErrorClassifierInterface): this {
    this.#errorClassifier = value;
    return this;
  }

  /**
   * Set maximum number of retry attempts
   */
  maxRetries(value: number): this {
    this.#maxRetries = value;
    return this;
  }

  /**
   * Set maximum total elapsed time across all attempts (ms)
   */
  maxElapsedMs(value: number): this {
    this.#maxElapsedMs = value;
    return this;
  }

  /**
   * Set the timeout (ms) each lifecycle hook is raced against
   */
  hookTimeoutMs(value: number): this {
    this.#hookTimeoutMs = value;
    return this;
  }

  /**
   * Set backoff strategy for computing retry delays
   */
  backoffStrategy(value: NonNullable<RetryConfigInterface['backoffStrategy']>): this {
    this.#backoffStrategy = value;
    return this;
  }

  /**
   * Build and return Retry instance
   * Config validation occurs in create()
   */
  build(): T {
    const config: RetryConfigInterface = PickDefined.from({
      'backoffStrategy': this.#backoffStrategy,
      'errorClassifier': this.#errorClassifier,
      'hookTimeoutMs': this.#hookTimeoutMs,
      'maxElapsedMs': this.#maxElapsedMs,
      'maxRetries': this.#maxRetries
    });
    return this.#create(config);
  }
}
