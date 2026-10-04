import { BaseError } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from './interfaces/EntityValidationErrorInterface.js';

/**
 * Thrown when schema intake rejects a payload.
 * Code: `'entity.schemaIntakeFailed'`.
 */
export class SchemaIntakeError extends BaseError {
  public override readonly name: string = 'SchemaIntakeError';
  public readonly errors: readonly EntityValidationErrorInterface[];
  public readonly schemaIdentifier: string | undefined;

  public constructor(message: string, errors: readonly EntityValidationErrorInterface[], schemaIdentifier: string | undefined) {
    super({
      'code': 'entity.schemaIntakeFailed',
      'message': message,
      'retryable': false
    });
    this.errors = errors;
    this.schemaIdentifier = schemaIdentifier;
  }
}
