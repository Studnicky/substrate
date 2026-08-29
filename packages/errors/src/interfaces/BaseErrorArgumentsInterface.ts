/**
 * Construction argument list type for `BaseError` subclasses.
 *
 * @module
 */
import type { JSONSchema7Type } from 'json-schema';

import type { ErrorClassificationEntity } from '../entities/ErrorClassificationEntity.js';
import type { ErrorDiagnosticEntity } from '../entities/ErrorDiagnosticEntity.js';
import type { ErrorWithCodeEntity } from '../entities/ErrorWithCodeEntity.js';

/** Construction parameters for `BaseError` subclasses. */
export interface BaseErrorArgumentsInterface {
  /** Underlying cause (native `Error`, `BaseError`, or any primitive). */
  'cause'?: unknown;
  /** Registered error code (dotted camelCase, e.g. `'errors.validationFailed'`). */
  'code': ErrorWithCodeEntity.Type['code'];
  /** Optional correlation ID for distributed tracing. */
  'correlationId'?: string | undefined;
  /** RFC 9457 `instance`: URI reference identifying this specific occurrence. */
  'instance'?: string | undefined;
  /** Human-readable description of what went wrong. */
  'message': ErrorDiagnosticEntity.Type['message'];
  /**
   * Structured context (metadata) dictionary attached to this error instance.
   * Exposed as both `context` and `metadata` on the instance.
   */
  'metadata'?: Readonly<Record<string, JSONSchema7Type>>;
  /** Whether this error represents a transient condition that may succeed on retry. */
  'retryable'?: ErrorClassificationEntity.Type['retryable'];
  /** RFC 9457 `status`: HTTP status code an origin server would generate for this occurrence. */
  'status'?: number | undefined;
}
