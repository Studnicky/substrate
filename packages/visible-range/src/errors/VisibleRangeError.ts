import type { ErrorClassificationEntity } from '@studnicky/errors';
import type { JSONSchema7Type } from 'json-schema';

import { BaseError, DomainErrorArgumentList } from '@studnicky/errors';

/** Optional construction arguments for {@link VisibleRangeError}; the class supplies its own code and message. */
interface VisibleRangeErrorArgumentListInterface {
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

/** Thrown when a {@link VisibleRangeConfigInterface} is invalid or ambiguous. */
export class VisibleRangeError extends BaseError {
  public constructor(message: string, argumentList?: VisibleRangeErrorArgumentListInterface) {
    const fields = { 'message': message };
    super(DomainErrorArgumentList.build(fields, {
      'cause': argumentList?.cause,
      'code': 'visibleRange.invalidConfig',
      'correlationId': argumentList?.correlationId,
      'message': (messageFields) => {
        const messagePayload = { 'message': messageFields.message };
        return messagePayload.message;
      },
      'metadata': argumentList?.metadata,
      'retryable': argumentList?.retryable ?? false
    }));
  }
}
