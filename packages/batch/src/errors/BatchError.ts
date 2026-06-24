import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/** Thrown when batch configuration is invalid. */
export class BatchError extends BaseError {
  public constructor(message: string, args?: Partial<Omit<BaseErrorArgumentsType, 'code' | 'message'>>) {
    super({ ...args, 'code': 'batch.invalidConfig', 'message': message, 'retryable': false });
  }
}
