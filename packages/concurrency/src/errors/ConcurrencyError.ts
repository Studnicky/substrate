/**
 * Abstract base error for the `@studnicky/concurrency` package.
 *
 * @module
 */
import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors';

/** Abstract base for all concurrency-domain errors. */
export abstract class ConcurrencyError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsInterface>) {
    super(args);
  }
}
