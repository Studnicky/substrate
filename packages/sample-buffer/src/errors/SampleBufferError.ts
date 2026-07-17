import type { JsonValueType } from '@studnicky/types';

import { BaseError, DomainErrorArgs } from '@studnicky/errors';

/** Optional construction arguments for {@link SampleBufferError} (all `BaseErrorArgumentsType` members except `code`/`message`, which this class supplies itself). */
type SampleBufferErrorArgsType = {
  /** Underlying cause (native `Error`, `BaseError`, or any primitive). */
  readonly 'cause'?: unknown;
  /** Optional correlation ID for distributed tracing. */
  readonly 'correlationId'?: string | undefined;
  /**
   * Structured context (metadata) dictionary attached to this error instance.
   * Exposed as both `context` and `metadata` on the instance.
   */
  readonly 'metadata'?: Readonly<Record<string, JsonValueType>>;
  /** Whether this error represents a transient condition that may succeed on retry. */
  readonly 'retryable'?: boolean;
};

/** Thrown when sample buffer configuration is invalid. */
export class SampleBufferError extends BaseError {
  public constructor(message: string, args?: SampleBufferErrorArgsType) {
    const fields = { 'message': message };
    super(DomainErrorArgs.build(fields, {
      'cause': args?.cause,
      'code': 'sampleBuffer.invalidConfig',
      'correlationId': args?.correlationId,
      'message': (f) => { const result = f.message; return result; },
      'metadata': args?.metadata,
      'retryable': false
    }));
  }
}
