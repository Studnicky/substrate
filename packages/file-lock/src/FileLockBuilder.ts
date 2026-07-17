import type { FileSystemInterface } from '@studnicky/virtual-fs';

import type { FileLock } from './FileLock.js';
import type { FileLockCreateOptionsType } from './FileLockCreateOptionsType.js';
import type { OwnerTokenInterface } from './OwnerTokenInterface.js';

import { FileLockConfigError } from './errors/FileLockConfigError.js';

export class FileLockBuilder {
  static create(create: (options: FileLockCreateOptionsType) => Promise<FileLock>): FileLockBuilder {
    return new FileLockBuilder(create);
  }

  readonly #create: (options: FileLockCreateOptionsType) => Promise<FileLock>;
  #fileSystem?: FileSystemInterface;
  #ownerToken?: OwnerTokenInterface;
  #path?: string;
  #pollMs?: number;
  #timeoutMs?: number;

  private constructor(create: (options: FileLockCreateOptionsType) => Promise<FileLock>) {
    this.#create = create;
  }

  withFileSystem(value: FileSystemInterface): this {
    this.#fileSystem = value;
    return this;
  }

  withOwnerToken(value: OwnerTokenInterface): this {
    this.#ownerToken = value;
    return this;
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
    if (this.#path === undefined) {
      throw new FileLockConfigError('path is required — call withPath() before build()');
    }

    const options: FileLockCreateOptionsType = {
      'path': this.#path,
      ...(this.#fileSystem !== undefined ? { 'fileSystem': this.#fileSystem } : {}),
      ...(this.#ownerToken !== undefined ? { 'ownerToken': this.#ownerToken } : {}),
      ...(this.#pollMs !== undefined ? { 'pollMs': this.#pollMs } : {}),
      ...(this.#timeoutMs !== undefined ? { 'timeoutMs': this.#timeoutMs } : {})
    };
    const result = await this.#create(options);
    return result;
  }
}
