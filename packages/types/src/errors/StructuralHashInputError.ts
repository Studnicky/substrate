import { BaseError } from './BaseError.js';

/**
 * Thrown when a schema handed to structural hashing is not finite, acyclic JSON data.
 * Code: `'types.structuralHashInputInvalid'`.
 */
export class StructuralHashInputError extends BaseError {
  public override readonly name: string = 'StructuralHashInputError';

  public constructor(message: string) {
    super({
      'code': 'types.structuralHashInputInvalid',
      'message': message,
      'retryable': false
    });
  }
}
