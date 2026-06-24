import { FileLockError } from './errors/FileLockError.js';

export class FileLockTimeoutError extends FileLockError {
  readonly path: string;
  readonly timeoutMs: number;

  constructor(path: string, timeoutMs: number) {
    super({
      'code': 'fileLock.timeout',
      'message': `Timed out acquiring lock on "${path}" after ${String(timeoutMs)}ms`,
      'retryable': false
    });
    this.path = path;
    this.timeoutMs = timeoutMs;
  }
}
