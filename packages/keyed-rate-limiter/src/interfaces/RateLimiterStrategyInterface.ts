import type { RateLimitRequestEntity } from '../entities/RateLimitRequestEntity.js';

/** Structural contract implemented by a per-key rate-limiting strategy. */
export interface RateLimiterStrategyInterface {
  /** Throws when insufficient capacity is available for `tokens`. */
  consume(tokens?: RateLimitRequestEntity.Type['tokens']): void;
  /** Resolves once `tokens` capacity is available, or rejects on abort. */
  waitForToken(options?: {
    'signal'?: AbortSignal;
    'tokens'?: RateLimitRequestEntity.Type['tokens'];
  }): Promise<void>;
}
