import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/types/browser';

export interface RequestExecutorErrorOptionsInterface extends Omit<BaseErrorArgumentsInterface, 'retryable'> {}

export class RequestExecutorError extends BaseError {
  public override readonly name: string = 'RequestExecutorError';

  public constructor(options: RequestExecutorErrorOptionsInterface) {
    super({ ...options, 'retryable': false });
  }
}
