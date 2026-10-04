import { SlidingWindowLimiterError } from './SlidingWindowLimiterError.js';

/** Thrown when a SlidingWindowLimiter is constructed with invalid configuration. */
export class SlidingWindowLimiterConfigError extends SlidingWindowLimiterError {
  public override readonly name: string = 'SlidingWindowLimiterConfigError';

  constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'slidingWindowLimiter.invalidConfig', 'message': message, 'retryable': false });
  }
}
