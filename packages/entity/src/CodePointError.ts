import { BaseError } from '@studnicky/types/browser';

/**
 * Thrown when a value is not a Unicode code point that can be converted to a string.
 * The platform error is the `cause`.
 * Code: `'entity.codePointInvalid'`.
 */
export class CodePointError extends BaseError {
  public override readonly name: string = 'CodePointError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'entity.codePointInvalid',
      'message': message,
      'retryable': false
    });
  }
}
