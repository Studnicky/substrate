import type { ErrorClassificationType } from './ErrorClassificationType.js';
import type { RequestStatsType } from './RequestStatsType.js';

/**
 * Context provided to retry interceptors
 *
 * Contains all information about the current retry attempt. Interceptors
 * read this context to make decisions and write back `delayMs` and optionally
 * `abort` to control retry behavior. Multiple interceptors run in pipeline
 * order — each receives the context returned by the previous one.
 */
export type RetryContextType<TState = Record<string, unknown>> = {
  /**
   * Set by interceptors: if true, abort remaining retries immediately
   * @default false
   */
  'abort'?: boolean;

  /**
   * Current attempt number (0-indexed)
   */
  'attemptNumber': number;

  /**
   * Classification result from the error classifier
   */
  'classification': ErrorClassificationType;

  /**
   * Set by interceptors: milliseconds to delay before the next retry
   * @default 0
   */
  'delayMs': number;

  /**
   * Total elapsed time since first attempt (milliseconds)
   */
  'elapsedMs': number;

  /**
   * Error that triggered this retry
   */
  'error': Error;

  /**
   * Maximum number of retries configured
   */
  'maxRetries': number;

  /**
   * Mutable state that persists across retry attempts
   *
   * Use this to pass data between retries, such as refreshed OAuth tokens.
   *
   * @example OAuth token refresh
   * ```typescript
   * const retry = Retry.create({
   *   retryInterceptor: async (ctx) => {
   *     if (ctx.error.message.includes('token expired')) {
   *       ctx.state.token = await refreshToken();
   *     }
   *     return { ...ctx, delayMs: 100 };
   *   }
   * });
   * ```
   */
  'state': TState;

  /**
   * Current request statistics
   */
  'stats': Readonly<RequestStatsType>;
};
