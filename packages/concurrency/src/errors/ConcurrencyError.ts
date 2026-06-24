/**
 * Abstract base error for the `@studnicky/concurrency` package.
 *
 * @module
 */
import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/** Abstract base for all concurrency-domain errors. */
export abstract class ConcurrencyError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsType>) {
    super(args);
  }
}
