import { BaseError } from '#runtime';

/**
 * Thrown when a schema default value cannot be structured-cloned onto an entity.
 * Code: `'entity.inputNotCloneable'`.
 */
export class EntityCloneError extends BaseError {
  public override readonly name: string = 'EntityCloneError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'entity.inputNotCloneable',
      'message': message,
      'retryable': false
    });
  }
}
