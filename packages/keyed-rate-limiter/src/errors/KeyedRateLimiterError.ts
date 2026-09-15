import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors/node';

/** Abstract base for all `@studnicky/keyed-rate-limiter` errors. */
export abstract class KeyedRateLimiterError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
