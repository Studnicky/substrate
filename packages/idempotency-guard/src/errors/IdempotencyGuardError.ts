import {
  BaseError, type BaseErrorArgumentsInterface
} from '@studnicky/errors/node';

/** Abstract base for all `@studnicky/idempotency-guard` errors. */
export abstract class IdempotencyGuardError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
