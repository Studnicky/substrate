import { BaseError } from '@studnicky/errors';

/**
 * Thrown by `BoundaryKit#execute()` when the composed `Throttle` discards the call via
 * its detach-and-abandon abort behavior (`Throttle#abort()` was called while the call
 * was queued or in flight). `Throttle#execute()` resolves such calls with `undefined`
 * rather than rejecting; `BoundaryKit#execute()` cannot return `undefined` as a `T`, so
 * it surfaces the discard as a rejection instead.
 */
export class BoundaryKitAbortedError extends BaseError {
  constructor(message = 'BoundaryKit call was discarded by an aborted Throttle') {
    super({ 'code': 'boundaryKit.aborted', 'message': message, 'retryable': false });
  }
}
