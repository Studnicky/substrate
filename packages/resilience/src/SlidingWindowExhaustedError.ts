import { SlidingWindowLimiterError } from './errors/SlidingWindowLimiterError.js';

/** Thrown by `consume()` when admitting the request would exceed the configured limit. */
export class SlidingWindowExhaustedError extends SlidingWindowLimiterError {
  constructor() {
    super({ 'code': 'slidingWindowLimiter.windowExhausted', 'message': 'Sliding window rate limit exceeded', 'retryable': true });
  }
}
