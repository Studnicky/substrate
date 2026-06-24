import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/** Abstract base for all cache errors. */
export abstract class CacheError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsType>) {
    super({ ...args, 'retryable': args.retryable ?? false });
  }
}
