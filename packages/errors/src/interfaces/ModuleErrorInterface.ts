/**
 * Interface for standardized module errors.
 * Provides structured error handling with codes, context, and cause chains.
 */
import type { ErrorClassificationEntity } from '../entities/ErrorClassificationEntity.js';
import type { ErrorDiagnosticEntity } from '../entities/ErrorDiagnosticEntity.js';
import type { ErrorWithCodeEntity } from '../entities/ErrorWithCodeEntity.js';
import type { ErrorWithStatusCodeEntity } from '../entities/ErrorWithStatusCodeEntity.js';

export interface ModuleErrorInterface {
  /** Underlying error that caused this error (typed as `Error | undefined` for `ModuleError`). */
  readonly 'cause': Error | undefined;

  /** Error code for classification */
  readonly 'code': ErrorWithCodeEntity.Type['code'];

  /** Detached context/metadata snapshot for debugging. */
  readonly 'context': Record<string, unknown> | undefined;

  /** Human-readable error message */
  readonly 'message': ErrorDiagnosticEntity.Type['message'];

  /** Error class name */
  readonly 'name': ErrorDiagnosticEntity.Type['name'];

  /** Whether this error should trigger retry logic */
  readonly 'retryable': ErrorClassificationEntity.Type['retryable'];

  /** Stack trace */
  readonly 'stack'?: ErrorDiagnosticEntity.Type['stack'];

  /** HTTP status code (optional) */
  readonly 'statusCode': ErrorWithStatusCodeEntity.Type['statusCode'] | undefined;

  /**
   * Serialize error for structured logging
   * Returns a JSON-safe representation including all properties and cause chain
   */
  toJSON(): Record<string, unknown>;
}
