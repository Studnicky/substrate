import { DomainErrorArgumentList } from '@studnicky/errors';

import { FileLockError } from './FileLockError.js';

export class FileLockContentionError extends FileLockError {
  public readonly 'path': string;

  public constructor(path: string, cause: Error) {
    super(DomainErrorArgumentList.build({ 'path': path }, {
      'cause': cause,
      'code': 'fileLock.contended',
      'message': (fields): string => { return `Lock is contended for "${fields.path}"`; },
      'retryable': true
    }));
    this.path = path;
  }
}
