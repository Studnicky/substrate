import type { PipelineFnType } from '@studnicky/pipeline';

import type { RetryContextType } from '../interfaces/RetryContextType.js';

/**
 * Retry interceptor function type
 *
 * Receives the retry context, sets `delayMs` for the next delay and optionally
 * sets `abort: true` to stop retrying. Multiple interceptors can be registered
 * and run as a pipeline — each receives the context returned by the previous one.
 *
 * @example Exponential backoff
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
 * @example Abort on specific error
 * ```typescript
 * const retry = Retry.create({
 *   retryInterceptor: (ctx) => ({
 *     ...ctx,
 *     abort: ctx.error.message.includes('fatal'),
 *     delayMs: 100
 *   })
 * });
 * ```
 */
export type RetryInterceptorType = PipelineFnType<RetryContextType>;
