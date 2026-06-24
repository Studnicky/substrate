import { CacheError } from './CacheError.js';

/** Thrown when cache configuration is invalid. */
export class CacheConfigError extends CacheError {
  public constructor(message: string) {
    super({ 'code': 'cache.invalidConfig', 'message': message, 'retryable': false });
  }
}
