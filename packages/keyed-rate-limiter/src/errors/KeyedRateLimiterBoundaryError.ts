import { KeyedRateLimiterError } from './KeyedRateLimiterError.js';

/** Thrown when an operation request, factory strategy, or strategy result violates the public keyed rate-limiter contract. */
export class KeyedRateLimiterBoundaryError extends KeyedRateLimiterError {
  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'keyedRateLimiter.invalidBoundary', 'message': message });
  }
}
