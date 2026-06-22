import type { ErrorClassifierFunctionType } from '../types/ErrorClassifierFunctionType.js';
import type { RetryInterceptorType } from '../types/RetryInterceptorType.js';
import type { ErrorClassifierInterface } from './ErrorClassifierInterface.js';

/**
 * Configuration for request retry behavior
 *
 * All properties are optional. When not provided, defaults are applied
 * AFTER validation in the Retry constructor.
 *
 * Logger and timing are accessed via the telemetry context silo mechanism.
 * Initialize the telemetryContext with logger/timing at the API layer,
 * and Retry will automatically access them.
 */
export type RetryConfigType = {
  /**
   * Error classifier for determining retry eligibility
   * Can be either an ErrorClassifier instance or a function
   * @default DefaultHttpErrorClassifier (handles standard HTTP status codes)
   */
  'errorClassifier'?: ErrorClassifierFunctionType | ErrorClassifierInterface;

  /**
   * Maximum number of retry attempts
   * @default 3
   */
  'maxRetries'?: number;

  /**
   * Interceptor(s) called before each retry to set delay and control flow
   *
   * Each interceptor receives the retry context, sets `delayMs` (and optionally
   * `abort: true`), and returns the updated context. Multiple interceptors run
   * as a pipeline in registration order.
   *
   * @default No delay (delayMs: 0)
   *
   * @example Single interceptor
   * ```typescript
   * import { BackoffStrategy } from '@studnicky/retry';
   *
   * const retry = Retry.create({
   *   retryInterceptor: (ctx) => ({
   *     ...ctx,
   *     delayMs: BackoffStrategy.exponential(ctx.attemptNumber, 100)
   *   })
   * });
   * ```
   *
   * @example Multiple interceptors (pipeline)
   * ```typescript
   * const retry = Retry.create({
   *   retryInterceptor: [
   *     (ctx) => ({ ...ctx, delayMs: BackoffStrategy.exponential(ctx.attemptNumber, 100) }),
   *     (ctx) => { logger.warn('Retrying', ctx); return ctx; }
   *   ]
   * });
   * ```
   */
  'retryInterceptor'?: RetryInterceptorType | RetryInterceptorType[];
};
