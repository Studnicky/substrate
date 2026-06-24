import type {
  ErrorClassifierInterface,
  RetryBuilderInterface,
  RetryConfigInterface,
  RetryInterface
} from '../interfaces/index.js';
import type { ErrorClassifierFunctionType } from '../types/ErrorClassifierFunctionType.js';
import type { RetryInterceptorType } from '../types/RetryInterceptorType.js';

/** Mutable config shape used internally during builder accumulation. */
type BuilderConfig = {
  'errorClassifier'?: ErrorClassifierFunctionType | ErrorClassifierInterface;
  'maxRetries'?: number;
  'retryInterceptor'?: RetryInterceptorType[];
};

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
 *
 * @example With retry interceptor
 * ```typescript
 * import { BackoffStrategy } from '@studnicky/retry';
 *
 * const retry = Retry.builder()
 *   .maxRetries(3)
 *   .retryInterceptor((ctx) => {
 *     console.log(`Retry ${ctx.attemptNumber}`);
 *     return { delayMs: BackoffStrategy.exponential(ctx.attemptNumber, 100) };
 *   })
 *   .build();
 * ```
 */
export class RetryBuilder<T extends RetryInterface = RetryInterface> implements RetryBuilderInterface<T> {
  private readonly config: BuilderConfig = {};
  private readonly ctor: new (config?: Partial<RetryConfigInterface>) => T;

  constructor(ctor: new (config?: Partial<RetryConfigInterface>) => T) {
    this.ctor = ctor;
  }

  /**
   * Build and return Retry instance
   * Config validation occurs in the constructor
   */
  build(): T {
    const result = new this.ctor({ ...this.config });
    return result;
  }

  /**
   * Set error classifier for determining retry behavior
   */
  errorClassifier(value: ErrorClassifierFunctionType | ErrorClassifierInterface): this {
    this.config.errorClassifier = value;

    return this;
  }

  /**
   * Set maximum number of retry attempts
   */
  maxRetries(value: number): this {
    this.config.maxRetries = value;

    return this;
  }

  /**
   * Add a retry interceptor to the pipeline
   *
   * Multiple calls append to the pipeline in registration order.
   */
  retryInterceptor(value: RetryInterceptorType): this {
    const current = this.config.retryInterceptor;

    if (current === undefined) {
      this.config.retryInterceptor = [value];
    } else {
      current.push(value);
    }

    return this;
  }
}
