import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/types/browser';

export interface WorkerPoolErrorOptionsInterface extends Omit<BaseErrorArgumentsInterface, 'retryable'> {}

export class WorkerPoolError extends BaseError {
  public override readonly name: string = 'WorkerPoolError';

  public constructor(options: WorkerPoolErrorOptionsInterface) {
    super({ ...options, 'retryable': false });
  }
}
