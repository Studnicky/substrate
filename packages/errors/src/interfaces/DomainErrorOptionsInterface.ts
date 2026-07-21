/**
 * Construction options for a `createDomainErrorBase()` mixin instance.
 *
 * @module
 */
import type { JSONSchema7Type } from 'json-schema';

import type { ErrorClassificationEntity } from '../entities/ErrorClassificationEntity.js';
import type { ErrorWithCodeEntity } from '../entities/ErrorWithCodeEntity.js';

/** Options passed to a domain-error mixin constructor, alongside the typed fields. */
export interface DomainErrorOptionsInterface<TFields extends Record<string, unknown>> {
  /** Underlying cause (native `Error`, `BaseError`, or any primitive). */
  'cause'?: unknown;
  /** Registered error code (dotted camelCase, e.g. `'fileLock.timeout'`). */
  'code': ErrorWithCodeEntity.Type['code'];
  /** Optional correlation ID for distributed tracing. */
  'correlationId'?: string | undefined;
  /** Builds the human-readable message from the typed fields. */
  'message': (fields: Readonly<TFields>) => string;
  /** Structured context (metadata) dictionary attached to this error instance. */
  'metadata'?: Readonly<Record<string, JSONSchema7Type>> | undefined;
  /** Whether this error represents a transient condition that may succeed on retry. */
  'retryable'?: ErrorClassificationEntity.Type['retryable'] | undefined;
}
