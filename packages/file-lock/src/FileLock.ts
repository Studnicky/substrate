import { readFileSync, renameSync, writeFileSync } from 'node:fs';

import { FileLockOptionsEntity } from './entities/FileLockOptionsEntity.js';
import { FileLockConfigError } from './errors/FileLockConfigError.js';
import { FileLockBuilder } from './FileLockBuilder.js';
import { FileLockTimeoutError } from './FileLockTimeoutError.js';

const DEFAULT_POLL_MS = 50;
const DEFAULT_TIMEOUT_MS = 5000;

export class FileLock {
  static builder(): FileLockBuilder {
    // Factory closure so `create` retains its `this` binding when the builder calls it.
    const result = FileLockBuilder.create((options) => {
      const lock = FileLock.create(options);
      return lock;
    });
    return result;
  }

  static async create(options: FileLockOptionsEntity.Type): Promise<FileLock> {
    if (!FileLockOptionsEntity.validate(options)) {
      const messages = (FileLockOptionsEntity.validate.errors ?? [])
        .map((e) => {
          return e.message ?? String(e);
        })
        .join('; ');
      return await Promise.reject(new FileLockConfigError(messages.length > 0 ? messages : 'invalid options'));
    }

    const { path, pollMs = DEFAULT_POLL_MS, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
    const lockPath = `${path}.lock.${String(process.pid)}`;
    const deadline = Date.now() + timeoutMs;

    return await new Promise<FileLock>((resolve, reject) => {
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

  /**
   * Alias for `FileLock.create({ path, ...options })`.
   */
  static async acquire(path: string, options?: Omit<FileLockOptionsEntity.Type, 'path'>): Promise<FileLock> {
    const result = await FileLock.create({ 'path': path, ...options });
    return result;
  }

  static #isErrnoException(e: unknown): e is NodeJS.ErrnoException {
    return e instanceof Error && 'code' in e;
  }

  readonly #lockPath: string;
  readonly #originalPath: string;
  #released = false;

  protected constructor(originalPath: string, lockPath: string) {
    this.#originalPath = originalPath;
    this.#lockPath = lockPath;
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
