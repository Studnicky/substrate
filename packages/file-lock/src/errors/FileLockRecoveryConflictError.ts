import { DomainErrorArgumentList } from '@studnicky/errors';

import { FileLockError } from './FileLockError.js';

export class FileLockRecoveryConflictError extends FileLockError {
  public readonly 'path': string;

  public constructor(path: string) {
    super(DomainErrorArgumentList.build({ 'path': path }, {
      'code': 'fileLock.recoveryConflict',
      'message': (fields): string => { return `Cannot recover lock because "${fields.path}" already exists`; },
      'retryable': false
    }));
    this.path = path;
  }
}
