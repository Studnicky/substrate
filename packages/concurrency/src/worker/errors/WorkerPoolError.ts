import type { BaseErrorArgumentsInterface } from '#runtime';

import { BaseError } from '#runtime';

export interface WorkerPoolErrorOptionsInterface extends Omit<BaseErrorArgumentsInterface, 'retryable'> {}

export class WorkerPoolError extends BaseError {
  public override readonly name: string = 'WorkerPoolError';

  public constructor(options: WorkerPoolErrorOptionsInterface) {
    super({ ...options, 'retryable': false });
  }

  /**
   * Returns `cause` unchanged when it is already a named `BaseError`; wraps any other value
   * (a platform error or a foreign thrown value) in a `WorkerPoolError` carrying it as `cause`.
   */
  public static from(cause: unknown, code: string, message: string): BaseError {
    if (cause instanceof BaseError) {
      return cause;
    }
    return new WorkerPoolError({ 'cause': cause, 'code': code, 'message': message });
  }
}
