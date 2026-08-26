import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors';

/** Abstract base for all JSON package errors. */
export abstract class JsonError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
