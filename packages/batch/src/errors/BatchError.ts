import type { ErrorClassificationEntity } from '@studnicky/errors';
import type { JSONSchema7Type } from 'json-schema';

import { BaseError, DomainErrorArgs } from '@studnicky/errors';

/** Optional construction arguments for {@link BatchError}; the class supplies its own code and message. */
interface BatchErrorArgsInterface {
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

/** Thrown when batch configuration is invalid. */
export class BatchError extends BaseError {
  private static buildMessage(fields: Readonly<{ 'message': string }>): string {
    const result = fields.message;
    return result;
  }

  public constructor(message: string, args?: BatchErrorArgsInterface) {
    const fields = { 'message': message };
    super(DomainErrorArgs.build(fields, {
      'cause': args?.cause,
      'code': 'batch.invalidConfig',
      'correlationId': args?.correlationId,
      'message': BatchError.buildMessage,
      'metadata': args?.metadata,
      'retryable': args?.retryable ?? false
    }));
  }
}
