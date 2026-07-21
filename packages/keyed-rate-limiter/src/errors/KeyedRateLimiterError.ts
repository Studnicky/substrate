import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors';

/** Abstract base for all `@studnicky/keyed-rate-limiter` errors. */
export abstract class KeyedRateLimiterError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsInterface>) {
    super(args);
  }
}
