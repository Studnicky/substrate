import type { FileSystemInterface } from '@studnicky/virtual-fs';

import { Predicates } from '@studnicky/types';

import type { FileRenameLockCreateOptionsInterface, OwnerTokenInterface } from './interfaces/index.js';

import { FileLockOptionsEntity } from './entities/FileLockOptionsEntity.js';
import { FileLockContentionError } from './errors/FileLockContentionError.js';
import { NodeFileSystem } from './NodeFileSystem.js';
import { NodeOwnerToken } from './NodeOwnerToken.js';

export class FileRenameLock {
  readonly #fileSystem: FileSystemInterface;
  readonly #lockPath: string;
  readonly #path: string;
  #held = false;

  private constructor(fileSystem: FileSystemInterface, path: string, lockPath: string) {
    this.#fileSystem = fileSystem;
    this.#path = path;
    this.#lockPath = lockPath;
  }

  public static create(options: FileRenameLockCreateOptionsInterface): FileRenameLock {
    const path = FileLockOptionsEntity.intake({ 'path': options.path }).path;
    const fileSystem = options.fileSystem ?? new NodeFileSystem();
    const ownerToken: OwnerTokenInterface = options.ownerToken ?? new NodeOwnerToken();
    const result = new FileRenameLock(fileSystem, path, `${path}.lock.${ownerToken.get()}`);
    return result;
  }

  public acquire(): void {
    if (this.#held) {
      return;
    }
    try {
      this.#fileSystem.renameSync(this.#path, this.#lockPath);
      this.#held = true;
    } catch (error) {
      const actualError = Predicates.isError(error) ? error : new Error(String(error));
      if (FileRenameLock.isContentionError(actualError)) {
        throw new FileLockContentionError(this.#path, actualError);
      }
      throw actualError;
    }
  }

  public release(): void {
    if (!this.#held) {
      return;
    }
    this.#fileSystem.renameSync(this.#lockPath, this.#path);
    this.#held = false;
  }

  private static isContentionError(error: Error): boolean {
    if ('code' in error && error.code === 'ENOENT') {
      return true;
    }
    const result = error.message.startsWith('ENOENT');
    return result;
  }
}
