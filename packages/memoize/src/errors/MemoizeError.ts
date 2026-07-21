import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors';

/** Abstract base for all `@studnicky/memoize` errors. */
export abstract class MemoizeError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsInterface>) {
    super(args);
  }
}
