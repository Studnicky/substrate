/** Thrown when a scheduler operation fails. */

import { BaseError } from '@studnicky/errors/browser';

export class SchedulerError extends BaseError {
  public override readonly name: string = 'SchedulerError';

  public constructor(message: string, cause?: Error) {
    super({ 'cause': cause, 'code': 'scheduler.error', 'message': message, 'retryable': false });
  }
}
