import { BaseError } from '@studnicky/types/browser';

import { FileLockError } from './FileLockError.js';

/** The browser Web Locks API rejected a lock request. */
export class FileLockWebLockError extends FileLockError {
  public override readonly name: string = 'FileLockWebLockError';

  public readonly 'lockName': string;

  public constructor(lockName: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'fileLock.webLockFailed',
      'message': `Web lock request failed for "${lockName}": ${BaseError.toMessage(cause)}`,
      'retryable': false
    });
    this.lockName = lockName;
  }
}
