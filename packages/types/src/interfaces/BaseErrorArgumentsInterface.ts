import type { JSONSchema7Type } from 'json-schema';

/** Construction parameters for `BaseError` subclasses. */
export interface BaseErrorArgumentsInterface {
  /** Underlying cause (native `Error`, `BaseError`, or any primitive). */
  'cause'?: unknown;
  /** Registered error code (dotted camelCase, e.g. `'errors.validationFailed'`). */
  'code': string;
  /** Optional correlation ID for distributed tracing. */
  'correlationId'?: string | undefined;
  /** RFC 9457 `instance`: URI reference identifying this specific occurrence. */
  'instance'?: string | undefined;
  /** Human-readable description of what went wrong. */
  'message': string;
  /** Structured context (metadata) dictionary attached to this error instance. */
  'metadata'?: Readonly<Record<string, JSONSchema7Type>>;
  /** Whether this error represents a transient condition that may succeed on retry. */
  'retryable'?: boolean;
  /** RFC 9457 `status`: HTTP status code an origin server would generate for this occurrence. */
  'status'?: number | undefined;
}
