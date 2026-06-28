import type {
  ErrorClassifierInterface,
  RetryBuilderInterface,
  RetryConfigInterface,
  RetryInterface
} from '../interfaces/index.js';
import type { ErrorClassifierFunctionType } from '../types/ErrorClassifierFunctionType.js';

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
    create: (options: Partial<RetryConfigInterface>) => T
  ): RetryBuilder<T> {
    return new RetryBuilder<T>(create);
  }

  readonly #create: (options: Partial<RetryConfigInterface>) => T;
  #maxRetries?: number;
  #errorClassifier?: ErrorClassifierFunctionType | ErrorClassifierInterface;

  private constructor(create: (options: Partial<RetryConfigInterface>) => T) {
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
   * Build and return Retry instance
   * Config validation occurs in create()
   */
  build(): T {
    const config: Partial<RetryConfigInterface> = {
      ...(this.#maxRetries !== undefined ? { 'maxRetries': this.#maxRetries } : {}),
      ...(this.#errorClassifier !== undefined ? { 'errorClassifier': this.#errorClassifier } : {})
    };
    return this.#create(config);
  }
}
