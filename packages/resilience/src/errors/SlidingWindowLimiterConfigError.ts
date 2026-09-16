import { SlidingWindowLimiterError } from './SlidingWindowLimiterError.js';

/** Thrown when a SlidingWindowLimiter is constructed with invalid configuration. */
export class SlidingWindowLimiterConfigError extends SlidingWindowLimiterError {
  constructor(message: string) {
    super({ 'code': 'slidingWindowLimiter.invalidConfig', 'message': message, 'retryable': false });
  }
}
