import { CacheError } from './CacheError.js';

/** Thrown when cache configuration is invalid. */
export class CacheConfigError extends CacheError {
  public override readonly name: string = 'CacheConfigError';

  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'cache.invalidConfig', 'message': message, 'retryable': false });
  }
}
