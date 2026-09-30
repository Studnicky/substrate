import { BaseError } from '@studnicky/types/browser';

/**
 * Thrown when a schema pattern is not a valid ECMA-262 regular expression.
 * Code: `'entity.schemaPatternInvalid'`.
 */
export class SchemaPatternError extends BaseError {
  public override readonly name: string = 'SchemaPatternError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'entity.schemaPatternInvalid',
      'message': message,
      'retryable': false
    });
  }
}
