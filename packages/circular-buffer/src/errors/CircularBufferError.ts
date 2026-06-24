import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/** Thrown when circular buffer configuration is invalid. */
export class CircularBufferError extends BaseError {
  public constructor(message: string, args?: Partial<Omit<BaseErrorArgumentsType, 'code' | 'message'>>) {
    super({ ...args, 'code': 'circularBuffer.invalidConfig', 'message': message, 'retryable': false });
  }
}
