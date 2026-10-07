import type { BaseErrorArgumentsInterface } from '#runtime';

import { BaseError } from '#runtime';

/** Abstract base for all JSON package errors. */
export abstract class JsonError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
