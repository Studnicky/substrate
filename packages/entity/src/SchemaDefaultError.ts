import { BaseError } from '#runtime';

/**
 * Thrown when a schema default value cannot be structured-cloned onto an entity.
 * Code: `'entity.schemaDefaultNotCloneable'`.
 */
export class SchemaDefaultError extends BaseError {
  public override readonly name: string = 'SchemaDefaultError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'entity.schemaDefaultNotCloneable',
      'message': message,
      'retryable': false
    });
  }
}
