import { BaseError } from '@studnicky/types/browser';

/**
 * Thrown when a schema reference addresses no locatable target.
 * Code: `'entity.schemaReferenceUnresolvable'`.
 */
export class SchemaReferenceError extends BaseError {
  public override readonly name: string = 'SchemaReferenceError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'entity.schemaReferenceUnresolvable',
      'message': message,
      'retryable': false
    });
  }
}
