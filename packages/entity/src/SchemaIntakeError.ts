import type { EntityValidationErrorInterface } from './interfaces/EntityValidationErrorInterface.js';

/* entity-owned error */

/** Thrown when schema intake rejects a payload. */
export class SchemaIntakeError extends Error {
  public readonly code = 'entity.schemaIntakeFailed';
  public readonly retryable = false;
  public readonly errors: readonly EntityValidationErrorInterface[];
  public readonly schemaIdentifier: string | undefined;

  public constructor(message: string, errors: readonly EntityValidationErrorInterface[], schemaIdentifier: string | undefined) {
    super(message);
    this.name = 'SchemaIntakeError';
    this.errors = errors;
    this.schemaIdentifier = schemaIdentifier;
  }
}
