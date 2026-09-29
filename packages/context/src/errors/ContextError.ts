import { BaseError } from '@studnicky/types/browser';

/**
 * Error thrown when context operations fail.
 *
 * Thrown by Context when attempting invalid operations such as
 * accessing destroyed contexts or exceeding scope limits.
 */
export class ContextError extends BaseError {
  public override readonly name: string = 'ContextError';

  constructor(message: string, cause?: Error) {
    super({ 'cause': cause, 'code': 'context.error', 'message': message, 'retryable': false });
  }
}

/**
 * Error thrown when Context configuration is invalid.
 *
 * Thrown during Context construction when the provided config
 * does not satisfy required constraints.
 */
export class ContextConfigError extends BaseError {
  public override readonly name: string = 'ContextConfigError';

  constructor(message: string, cause?: Error) {
    super({ 'cause': cause, 'code': 'context.invalidConfig', 'message': message, 'retryable': false });
  }
}
