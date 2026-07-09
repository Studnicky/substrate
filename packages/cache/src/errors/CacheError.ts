import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/** Abstract base for all cache errors. */
export abstract class CacheError extends BaseError {
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
