import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/** Thrown when circular buffer configuration is invalid. */
export class CircularBufferError extends BaseError {
  public constructor(message: string, args?: Partial<Omit<BaseErrorArgumentsType, 'code' | 'message'>>) {
    const obj: Record<string, unknown> = {};
    obj.cause = args?.cause;
    obj.code = 'circularBuffer.invalidConfig';
    obj.correlationId = args?.correlationId;
    obj.message = message;
    obj.metadata = args?.metadata;
    obj.retryable = false;
    super(obj as BaseErrorArgumentsType);
  }
}
