import { BaseError } from '@studnicky/types/browser';

import { FileLockError } from './FileLockError.js';

/** A filesystem operation the lock performs failed for a reason other than lock contention. */
export class FileLockFileSystemError extends FileLockError {
  public override readonly name: string = 'FileLockFileSystemError';

  public readonly 'operation': string;

  public readonly 'path': string;

  public constructor(operation: string, path: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'fileLock.fileSystemFailed',
      'message': `File lock ${operation} failed for "${path}": ${BaseError.toMessage(cause)}`,
      'retryable': false
    });
    this.operation = operation;
    this.path = path;
  }

  /** Returns `cause` unchanged when it is already a named `BaseError`; wraps any other value. */
  public static from(operation: string, path: string, cause: unknown): BaseError {
    const result = cause instanceof BaseError ? cause : new FileLockFileSystemError(operation, path, cause);
    return result;
  }

  /** Runs a synchronous filesystem operation, applying {@link FileLockFileSystemError.from} to whatever it throws. */
  public static guard<TResult>(operation: string, path: string, action: () => TResult): TResult {
    try {
      const result = action();
      return result;
    } catch (cause) {
      throw FileLockFileSystemError.from(operation, path, cause);
    }
  }
}
