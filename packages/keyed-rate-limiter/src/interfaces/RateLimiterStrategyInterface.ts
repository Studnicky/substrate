import type { RateLimitConsumptionInterface } from '@studnicky/resilience/interfaces';

/**
 * Structural contract implemented by a per-key rate-limiting strategy.
 *
 * `tokens` arrives already validated — `KeyedRateLimiter` intakes the caller's
 * request through `RateLimitRequestEntity` before ever calling a strategy — so
 * these signatures take the plain post-validation type, not a schema InputType.
 */
export interface RateLimiterStrategyInterface {
  /** Throws when insufficient capacity is available for `tokens`. */
  consume(tokens?: number): RateLimitConsumptionInterface;
  /** Resolves once `tokens` capacity is available, or rejects on abort. */
  waitForToken(options?: {
    'signal'?: AbortSignal;
    'tokens'?: number;
  }): Promise<RateLimitConsumptionInterface>;
}
