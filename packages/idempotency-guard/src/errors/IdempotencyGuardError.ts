import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/** Abstract base for all `@studnicky/idempotency-guard` errors. */
export abstract class IdempotencyGuardError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsType>) {
    const obj: Record<string, unknown> = {};
    obj.cause = args.cause;
    obj.code = args.code;
    obj.correlationId = args.correlationId;
    obj.message = args.message;
    obj.metadata = args.metadata;
    obj.retryable = args.retryable ?? false;
    super(obj as BaseErrorArgumentsType);
  }
}
