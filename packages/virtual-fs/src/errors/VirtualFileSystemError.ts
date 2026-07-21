import type { ErrorClassificationEntity } from '@studnicky/errors';
import type { JSONSchema7Type } from 'json-schema';

import { BaseError, DomainErrorArgs } from '@studnicky/errors';

/** Optional construction arguments for {@link VirtualFileSystemError}; the class supplies its own code and message. */
interface VirtualFileSystemErrorArgsInterface {
  /** Underlying cause (native `Error`, `BaseError`, or any primitive). */
  readonly 'cause'?: unknown;
  /** Optional correlation ID for distributed tracing. */
  readonly 'correlationId'?: string | undefined;
  /**
   * Structured context (metadata) dictionary attached to this error instance.
   * Exposed as both `context` and `metadata` on the instance.
   */
  readonly 'metadata'?: Readonly<Record<string, JSONSchema7Type>>;
  /** Whether this error represents a transient condition that may succeed on retry. */
  readonly 'retryable'?: ErrorClassificationEntity.Type['retryable'];
}

export class VirtualFileSystemError extends BaseError {
  public constructor(message: string, args?: VirtualFileSystemErrorArgsInterface) {
    const fields = { 'message': message };
    super(DomainErrorArgs.build(fields, {
      'cause': args?.cause,
      'code': 'virtualFs.error',
      'correlationId': args?.correlationId,
      'message': (f) => { const result = f.message; return result; },
      'metadata': args?.metadata,
      'retryable': false
    }));
  }
}
