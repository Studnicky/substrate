/**
 * Per-call options for RequestExecutor#execute
 */

/**
 * Options accepted by a single `RequestExecutor#execute()` call.
 */
export type RequestExecutorExecuteOptionsType = {
  /**
   * Initial values seeded into the `Context` scope for this call (ignored if no `Context` is composed).
   */
  'contextInitial'?: Record<string, unknown>;

  /**
   * Deadline (ms) for this call. Overrides the executor's default `deadlineMs`.
   */
  'deadlineMs'?: number;

  /**
   * Caller-supplied AbortSignal, merged with `deadlineMs` via `Signal#compose()`.
   */
  'signal'?: AbortSignal;
};
