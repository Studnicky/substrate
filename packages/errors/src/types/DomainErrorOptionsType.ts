/**
 * Construction options for a `createDomainErrorBase()` mixin instance.
 *
 * @module
 */
import type { JsonValueType } from '@studnicky/types';

// json-schema-uninexpressible: 'message' is a callback function typed over a generic TFields — function types and generic type parameters have no JSON Schema representation
/** Options passed to a domain-error mixin constructor, alongside the typed fields. */
export type DomainErrorOptionsType<TFields extends Record<string, unknown>> = {
  /** Underlying cause (native `Error`, `BaseError`, or any primitive). */
  'cause'?: unknown;
  /** Registered error code (dotted camelCase, e.g. `'fileLock.timeout'`). */
  'code': string;
  /** Optional correlation ID for distributed tracing. */
  'correlationId'?: string | undefined;
  /** Builds the human-readable message from the typed fields. */
  'message': (fields: Readonly<TFields>) => string;
  /** Structured context (metadata) dictionary attached to this error instance. */
  'metadata'?: Readonly<Record<string, JsonValueType>> | undefined;
  /** Whether this error represents a transient condition that may succeed on retry. */
  'retryable'?: boolean | undefined;
};
