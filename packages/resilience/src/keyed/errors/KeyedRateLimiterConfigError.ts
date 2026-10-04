import { KeyedRateLimiterError } from './KeyedRateLimiterError.js';

/** Thrown when rate-limiter configuration is invalid. */
export class KeyedRateLimiterConfigError extends KeyedRateLimiterError {
  public override readonly name: string = 'KeyedRateLimiterConfigError';

  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'keyedRateLimiter.invalidConfig', 'message': message });
  }
}
