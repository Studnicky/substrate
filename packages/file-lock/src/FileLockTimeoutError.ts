import { DomainErrorArgs } from '@studnicky/errors';

import { FileLockError } from './errors/FileLockError.js';

export class FileLockTimeoutError extends FileLockError {
  readonly path!: string;
  readonly timeoutMs!: number;

  private static buildMessage(fields: Readonly<{ 'path': string; 'timeoutMs': number }>): string {
    const result = `Timed out acquiring lock on "${fields.path}" after ${String(fields.timeoutMs)}ms`;
    return result;
  }

  constructor(path: string, timeoutMs: number) {
    const fields = { 'path': path, 'timeoutMs': timeoutMs };
    super(DomainErrorArgs.build(fields, {
      'code': 'fileLock.timeout',
      'message': FileLockTimeoutError.buildMessage,
      'retryable': false
    }));

    const resolveInstance = (): this => {
      return this;
    };
    Object.assign(resolveInstance(), fields);
  }
}
