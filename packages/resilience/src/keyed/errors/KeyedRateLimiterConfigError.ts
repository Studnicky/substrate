import { KeyedRateLimiterError } from './KeyedRateLimiterError.js';

/** Thrown when rate-limiter configuration is invalid. */
export class KeyedRateLimiterConfigError extends KeyedRateLimiterError {
  public override readonly name: string = 'KeyedRateLimiterConfigError';

  public constructor(message: string) {
    super({ 'code': 'keyedRateLimiter.invalidConfig', 'message': message });
  }
}
