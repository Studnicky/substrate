/**
 * Construction argument list type for `BaseError` subclasses.
 *
 * @module
 */
import type { JsonValueType } from '@studnicky/types';

/** Construction parameters for `BaseError` subclasses. */
export type BaseErrorArgumentsType = {
  /** Underlying cause (native `Error`, `BaseError`, or any primitive). */
  readonly 'cause'?: unknown;
  /** Registered error code (dotted camelCase, e.g. `'errors.validationFailed'`). */
  readonly 'code': string;
  /** Optional correlation ID for distributed tracing. */
  readonly 'correlationId'?: string | undefined;
  /** Human-readable description of what went wrong. */
  readonly 'message': string;
  /**
   * Structured context (metadata) dictionary attached to this error instance.
   * Exposed as both `context` and `metadata` on the instance.
   */
  readonly 'metadata'?: Readonly<Record<string, JsonValueType>>;
  /** Whether this error represents a transient condition that may succeed on retry. */
  readonly 'retryable'?: boolean;
};
