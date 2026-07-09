import { KeyedRateLimiterError } from './KeyedRateLimiterError.js';

/** Thrown when `KeyedRateLimiterBuilder#build()` is called with missing required configuration. */
export class KeyedRateLimiterConfigError extends KeyedRateLimiterError {
  public constructor(message: string) {
    super({ 'code': 'keyedRateLimiter.invalidConfig', 'message': message });
  }
}
