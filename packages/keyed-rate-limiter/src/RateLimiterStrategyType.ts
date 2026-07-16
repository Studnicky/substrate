/**
 * Structural seam a `KeyedRateLimiter` per-key strategy must satisfy.
 *
 * `@studnicky/resilience`'s `TokenBucket` already matches this shape exactly
 * (`consume(tokens?: number): void`, `waitForToken(options?): Promise<void>`)
 * without declaring or importing it — a future `SlidingWindowLimiter` (or any
 * other rate-limiting algorithm) slots into `KeyedRateLimiter.createWithStrategy()`
 * purely by matching these two method signatures. No import, no coupling, no
 * second wrapper class.
 */
// #region shape
// json-schema-uninexpressible: a purely structural method-signature seam (consume/waitForToken are
// function types) — this is a behavioral contract, not a JSON-serializable data shape.
export type RateLimiterStrategyType = {
  /** Throws when insufficient capacity is available for `tokens`. */
  consume(tokens?: number): void;
  /** Resolves once `tokens` capacity is available, or rejects on abort. */
  waitForToken(options?: { 'signal'?: AbortSignal; 'tokens'?: number }): Promise<void>;
};
// #endregion shape
