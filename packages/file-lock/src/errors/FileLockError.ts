import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors';

/**
 * Abstract base for all file-lock errors.
 * Subclasses carry the specific code and context.
 */
export abstract class FileLockError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsInterface>) {
    super(args);
  }
}
