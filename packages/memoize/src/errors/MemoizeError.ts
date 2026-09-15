import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors/node';

/** Abstract base for all `@studnicky/memoize` errors. */
export abstract class MemoizeError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
