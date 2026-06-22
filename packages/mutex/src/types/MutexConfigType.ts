/**
 * Mutex configuration options
 */
export type MutexConfigType = {
  /**
   * Enable request coalescing for runExclusive operations
   *
   * When enabled, concurrent calls to runExclusive with the same key will
   * share the result of the first in-flight operation instead of queueing
   * serially. This is useful for idempotent operations like:
   * - Token refresh (all callers wait on same refresh)
   * - Cache population (all callers wait on same fetch)
   * - Entity resolution (all callers get same resolved entity)
   *
   * @default false
   */
  'enableCoalescing': boolean;

  /**
   * Maximum number of operations that can queue per key
   * Set to 0 for unlimited queue size
   */
  'maxQueueSize': number;

  /**
   * Maximum time (ms) to wait for lock acquisition
   * Set to 0 for no timeout
   *
   * Note: This timeout applies ONLY to acquiring the lock, not to function execution.
   * Once the lock is acquired, the function can run for any duration.
   */
  'timeout': number;
};
