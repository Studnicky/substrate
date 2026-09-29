import type { RateLimitConsumptionInterface } from '../../interfaces/RateLimitConsumptionInterface.js';
import type { RateLimitRequestEntity } from '../entities/RateLimitRequestEntity.js';

/**
 * Structural contract implemented by a per-key rate-limiting strategy.
 *
 * `tokens` arrives already validated — `KeyedRateLimiter` intakes the caller's
 * request through `RateLimitRequestEntity` before ever calling a strategy — so
 * these signatures take the branded, validated type the schema produces, not
 * an unvalidated `InputType` and not a plain `number` that discards the brand
 * intake already earned.
 */
export interface RateLimiterStrategyInterface {
  /** Throws when insufficient capacity is available for `tokens`. */
  consume(tokens?: RateLimitRequestEntity.Type['tokens']): RateLimitConsumptionInterface;
  /** Resolves once `tokens` capacity is available, or rejects on abort. */
  waitForToken(options?: {
    'signal'?: AbortSignal;
    'tokens'?: RateLimitRequestEntity.Type['tokens'];
  }): Promise<RateLimitConsumptionInterface>;
}
