import type { BaseErrorArgumentsInterface } from '#runtime';

import { BaseError } from '#runtime';

/** Abstract base for all cache errors. */
export abstract class CacheError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
