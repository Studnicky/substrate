import type { JsonValueType } from '@studnicky/types';

import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/** Optional construction arguments for {@link BatchError} (all `BaseErrorArgumentsType` members except `code`/`message`, which this class supplies itself). */
type BatchErrorArgsType = {
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

/** Thrown when batch configuration is invalid. */
export class BatchError extends BaseError {
  public constructor(message: string, args?: BatchErrorArgsType) {
    const obj: Record<string, unknown> = {};
    obj.cause = args?.cause;
    obj.code = 'batch.invalidConfig';
    obj.correlationId = args?.correlationId;
    obj.message = message;
    obj.metadata = args?.metadata;
    obj.retryable = false;
    super(obj as BaseErrorArgumentsType);
  }
}
