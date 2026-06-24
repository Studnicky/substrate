import type { FileLockOptionsEntity } from './entities/FileLockOptionsEntity.js';
import type { FileLock } from './FileLock.js';

export class FileLockBuilder {
  static create(create: (options: FileLockOptionsEntity.Type) => Promise<FileLock>): FileLockBuilder {
    return new FileLockBuilder(create);
  }

  readonly #create: (options: FileLockOptionsEntity.Type) => Promise<FileLock>;
  #path?: string;
  #pollMs?: number;
  #timeoutMs?: number;

  private constructor(create: (options: FileLockOptionsEntity.Type) => Promise<FileLock>) {
    this.#create = create;
  }

  withPath(value: string): this {
    this.#path = value;
    return this;
  }

  withPollMs(value: number): this {
    this.#pollMs = value;
    return this;
  }

  withTimeoutMs(value: number): this {
    this.#timeoutMs = value;
    return this;
  }

  async build(): Promise<FileLock> {
    const options: FileLockOptionsEntity.Type = {
      'path': this.#path ?? '',
      ...(this.#pollMs !== undefined ? { 'pollMs': this.#pollMs } : {}),
      ...(this.#timeoutMs !== undefined ? { 'timeoutMs': this.#timeoutMs } : {})
    };
    return await this.#create(options);
  }
}
