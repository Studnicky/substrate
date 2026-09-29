import type { BaseErrorArgumentsInterface } from '@studnicky/errors/interfaces';

import { BaseError } from '@studnicky/errors/browser';

export interface WorkerPoolErrorOptionsInterface extends Omit<BaseErrorArgumentsInterface, 'retryable'> {}

export class WorkerPoolError extends BaseError {
  public override readonly name: string = 'WorkerPoolError';

  public constructor(options: WorkerPoolErrorOptionsInterface) {
    super({ ...options, 'retryable': false });
  }
}
