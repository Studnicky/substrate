import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/** Abstract base for all JSON package errors. */
export abstract class JsonError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsType>) {
    super(args);
  }
}
