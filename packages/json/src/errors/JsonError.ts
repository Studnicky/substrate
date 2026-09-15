import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors/node';

/** Abstract base for all JSON package errors. */
export abstract class JsonError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
