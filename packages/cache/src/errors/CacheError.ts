import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors/browser';

/** Abstract base for all cache errors. */
export abstract class CacheError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
