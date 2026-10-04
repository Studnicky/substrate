import { BaseError } from '@studnicky/types/browser';

import { FileLockError } from './FileLockError.js';

/** The operating system refused to report whether a lock owner is alive. */
export class FileLockLivenessError extends FileLockError {
  public override readonly name: string = 'FileLockLivenessError';

  public readonly 'ownerToken': string;

  public constructor(ownerToken: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'fileLock.livenessCheckFailed',
      'message': `Liveness check failed for lock owner "${ownerToken}": ${BaseError.toMessage(cause)}`,
      'retryable': false
    });
    this.ownerToken = ownerToken;
  }
}
