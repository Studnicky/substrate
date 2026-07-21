import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors';

/**
 * Abstract base class for all mutex-domain errors.
 *
 * Extends `BaseError` to provide a common ancestor for `LockTimeoutError`
 * and `QueueSizeExceededError`, enabling `instanceof MutexError` checks.
 */

export abstract class MutexError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsInterface>) {
    super(args);
  }
}
