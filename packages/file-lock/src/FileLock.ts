import { readFileSync, renameSync, writeFileSync } from 'node:fs';

import type { FileLockOptionsEntity } from './entities/FileLockOptionsEntity.js';

import { FileLockConfigError } from './errors/FileLockConfigError.js';
import { FileLockTimeoutError } from './FileLockTimeoutError.js';

const DEFAULT_POLL_MS = 50;
const DEFAULT_TIMEOUT_MS = 5000;

export class FileLock {
  readonly #lockPath: string;
  readonly #originalPath: string;
  #released = false;

  private constructor(originalPath: string, lockPath: string) {
    this.#originalPath = originalPath;
    this.#lockPath = lockPath;
  }

  static #isErrnoException(e: unknown): e is NodeJS.ErrnoException {
    return e instanceof Error && 'code' in e;
  }

  static acquire(path: string, options?: FileLockOptionsEntity.Type): Promise<FileLock> {
    if (options?.pollMs !== undefined && (options.pollMs <= 0 || Number.isNaN(options.pollMs))) {
      return Promise.reject(new FileLockConfigError('pollMs must be a positive number'));
    }
    if (options?.timeoutMs !== undefined && (options.timeoutMs <= 0 || Number.isNaN(options.timeoutMs))) {
      return Promise.reject(new FileLockConfigError('timeoutMs must be a positive number'));
    }

    const pollMs = options?.pollMs ?? DEFAULT_POLL_MS;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const lockPath = `${path}.lock.${String(process.pid)}`;
    const deadline = Date.now() + timeoutMs;

    return new Promise<FileLock>((resolve, reject) => {
      const attempt = (): void => {
        try {
          renameSync(path, lockPath);
          resolve(new FileLock(path, lockPath));
        } catch (error: unknown) {
          if (FileLock.#isErrnoException(error) && error.code === 'ENOENT') {
            reject(new FileLockTimeoutError(path, timeoutMs));
            return;
          }
          if (Date.now() >= deadline) {
            reject(new FileLockTimeoutError(path, timeoutMs));
            return;
          }
          setTimeout(attempt, pollMs);
        }
      };
      attempt();
    });
  }

  read(): string {
    const result = readFileSync(this.#lockPath, 'utf8');
    return result;
  }

  write(content: string): void {
    writeFileSync(this.#lockPath, content, 'utf8');
  }

  release(): void {
    if (this.#released) { return; }
    this.#released = true;
    renameSync(this.#lockPath, this.#originalPath);
  }

  [Symbol.dispose](): void {
    this.release();
  }
}
