/** Thrown when BusQueue is constructed with invalid configuration. */

import { ConcurrencyError } from '../../errors/ConcurrencyError.js';

export class BusQueueConfigError extends ConcurrencyError {
  public override readonly name: string = 'BusQueueConfigError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'concurrency.invalidQueueConfig',
      'message': message,
      'retryable': false
    });
  }
}
