/** Thrown when a scheduler operation fails. */

import { BaseError } from '@studnicky/errors';

export class SchedulerError extends BaseError {
  public constructor(message: string, cause?: Error) {
    super({ 'cause': cause, 'code': 'scheduler.error', 'message': message, 'retryable': false });
  }
}
