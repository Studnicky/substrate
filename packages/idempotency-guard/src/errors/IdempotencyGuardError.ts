import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/** Abstract base for all `@studnicky/idempotency-guard` errors. */
export abstract class IdempotencyGuardError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsType>) {
    super(args);
  }
}
