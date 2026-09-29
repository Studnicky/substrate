import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors/browser';

/** Abstract base for all `@studnicky/resilience/keyed` errors. */
export abstract class KeyedRateLimiterError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
