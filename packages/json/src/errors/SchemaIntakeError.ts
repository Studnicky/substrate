import type { ErrorObject } from 'ajv';

import { JsonError } from './JsonError.js';

/** Thrown when schema intake rejects a payload. */
export class SchemaIntakeError extends JsonError {
  public readonly errors: readonly ErrorObject[];
  public readonly schemaIdentifier: string | undefined;

  public constructor(message: string, errors: readonly ErrorObject[], schemaIdentifier: string | undefined) {
    super({ 'code': 'json.schemaIntakeFailed', 'message': message, 'retryable': false });
    this.errors = errors;
    this.schemaIdentifier = schemaIdentifier;
  }
}
