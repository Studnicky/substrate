import type { BaseErrorArgumentsInterface } from '#runtime';

import { BaseError } from '#runtime';

/** Abstract base for all store-package errors. */
export abstract class StoreError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
