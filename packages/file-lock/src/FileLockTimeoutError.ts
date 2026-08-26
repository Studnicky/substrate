import { DomainErrorArgumentList } from '@studnicky/errors';

import { FileLockError } from './errors/FileLockError.js';

export class FileLockTimeoutError extends FileLockError {
  readonly path!: string;
  readonly timeoutMs!: number;

  constructor(path: string, timeoutMs: number) {
    const fields = { 'path': path, 'timeoutMs': timeoutMs };
    super(DomainErrorArgumentList.build(fields, {
      'code': 'fileLock.timeout',
      'message': (messageFields): string => {
        const result = `Timed out acquiring lock on "${messageFields.path}" after ${String(messageFields.timeoutMs)}ms`;
        return result;
      },
      'retryable': false
    }));

    this.path = fields.path;
    this.timeoutMs = fields.timeoutMs;
  }
}
