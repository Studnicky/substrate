/**
 * Per-call options for RequestExecutor#execute
 */

/**
 * Options accepted by a single `RequestExecutor#execute()` call.
 */
// json-schema-uninexpressible: 'contextInitial' is Record<string, unknown> (arbitrary unknown-valued map) and 'signal' is an AbortSignal class instance — neither is JSON-Schema-expressible
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
