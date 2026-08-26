import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors';

/** Abstract base for all `@studnicky/keyed-rate-limiter` errors. */
export abstract class KeyedRateLimiterError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
