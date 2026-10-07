import { BaseError } from '#runtime';

/**
 * Thrown when a schema node is read before its definition resolves, or a bundled metaschema document is malformed.
 * Code: `'entity.schemaNodeDefinitionInvalid'`.
 */
export class SchemaNodeDefinitionError extends BaseError {
  public override readonly name: string = 'SchemaNodeDefinitionError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'entity.schemaNodeDefinitionInvalid',
      'message': message,
      'retryable': false
    });
  }
}
