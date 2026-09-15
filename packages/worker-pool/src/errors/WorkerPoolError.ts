import type { BaseErrorArgumentsInterface } from '@studnicky/errors/interfaces';

import { BaseError } from '@studnicky/errors/node';

export interface WorkerPoolErrorOptionsInterface extends Omit<BaseErrorArgumentsInterface, 'retryable'> {}

export class WorkerPoolError extends BaseError {
  public constructor(options: WorkerPoolErrorOptionsInterface) {
    super({ ...options, 'retryable': false });
  }
}
