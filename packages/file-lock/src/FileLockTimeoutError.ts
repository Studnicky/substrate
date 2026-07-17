import { DomainErrorArgs } from '@studnicky/errors';

import { FileLockError } from './errors/FileLockError.js';

export class FileLockTimeoutError extends FileLockError {
  readonly path!: string;
  readonly timeoutMs!: number;

  constructor(path: string, timeoutMs: number) {
    const fields = { 'path': path, 'timeoutMs': timeoutMs };
    super(DomainErrorArgs.build(fields, {
      'code': 'fileLock.timeout',
      'message': (f) => { const result = `Timed out acquiring lock on "${f.path}" after ${String(f.timeoutMs)}ms`; return result; },
      'retryable': false
    }));
    Object.assign(this, fields);
  }
}
