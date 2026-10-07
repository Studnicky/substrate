import type { BaseErrorArgumentsInterface } from '#runtime';

import { BaseError } from '#runtime';

/**
 * Abstract base for all file-lock errors.
 * Subclasses carry the specific code and context.
 */
export abstract class FileLockError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
