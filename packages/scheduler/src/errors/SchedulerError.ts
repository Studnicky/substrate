/** Thrown when a scheduler operation fails. */

import { BaseError } from '@studnicky/types/browser';

export class SchedulerError extends BaseError {
  public override readonly name: string = 'SchedulerError';

  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'scheduler.error', 'message': message, 'retryable': false });
  }
}
