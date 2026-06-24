import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/** Thrown when sample buffer configuration is invalid. */
export class SampleBufferError extends BaseError {
  public constructor(message: string, args?: Partial<Omit<BaseErrorArgumentsType, 'code' | 'message'>>) {
    super({ ...args, 'code': 'sampleBuffer.invalidConfig', 'message': message, 'retryable': false });
  }
}
