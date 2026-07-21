import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors';

/** Abstract base for all cache errors. */
export abstract class CacheError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsInterface>) {
    super(args);
  }
}
