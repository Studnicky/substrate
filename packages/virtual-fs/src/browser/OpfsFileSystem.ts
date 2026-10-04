import type { AsyncFileSystemInterface } from '../interfaces/AsyncFileSystemInterface.js';
import type { OpfsFileSystemOptionsInterface } from './OpfsFileSystemOptionsInterface.js';
import type { OpfsStorageInterface } from './OpfsStorageInterface.js';

import { VirtualFileSystemError } from '../errors/VirtualFileSystemError.js';

/** Async filesystem backed by the browser Origin Private File System. */
export class OpfsFileSystem implements AsyncFileSystemInterface {
  readonly #storage: OpfsStorageInterface;

  protected constructor(options: OpfsFileSystemOptionsInterface) {
    this.#storage = options.storage ?? OpfsFileSystem.#getNativeStorage();
  }

  public static create(options: OpfsFileSystemOptionsInterface = {}): OpfsFileSystem {
    return new OpfsFileSystem(options);
  }

  public async exists(path: string): Promise<boolean> {
    try {
      const { name, parent } = await this.#parent(path);
      await parent.getFileHandle(name);
      return true;
    } catch {
      try {
        const { name, parent } = await this.#parent(path);
        await parent.getDirectoryHandle(name);
        return true;
      } catch {
        return false;
      }
    }
  }

  public async mkdir(path: string): Promise<void> {
    await this.#mkdir(path);
  }

  public async readdir(path: string): Promise<string[]> {
    const result = await this.#readdir(path);
    return result;
  }

  public async readFile(path: string): Promise<string> {
    const result = await this.#readFile(path);
    return result;
  }

  public async remove(path: string): Promise<void> {
    await this.#remove(path);
  }

  public async writeFile(path: string, data: string): Promise<void> {
    await this.#writeFile(path, data);
  }

  async #mkdir(path: string): Promise<void> {
    const segments = OpfsFileSystem.#segments(path);
    try {
      let directory = await this.#storage.getDirectory();
      const segmentsLength = segments.length;

      for (let index = 0; index < segmentsLength; index += 1) {
        const segment = segments[index];

        if (segment === undefined) {
          continue;
        }
        directory = await directory.getDirectoryHandle(segment, { 'create': true });
      }
    } catch (cause) {
      throw VirtualFileSystemError.from(cause);
    }
  }

  async #readdir(path: string): Promise<string[]> {
    const directory = await this.#directory(path);
    const result: string[] = [];

    try {
      const entries = directory.values();
      let nextEntry = await entries.next();

      while (nextEntry.done !== true) {
        result.push(nextEntry.value.name);
        nextEntry = await entries.next();
      }
    } catch (cause) {
      throw VirtualFileSystemError.from(cause);
    }

    const sortedResult = result.toSorted();

    return sortedResult;
  }

  async #readFile(path: string): Promise<string> {
    const { name, parent } = await this.#parent(path);
    try {
      const handle = await parent.getFileHandle(name);
      const file = await handle.getFile();

      const result = await file.text();

      return result;
    } catch (cause) {
      throw VirtualFileSystemError.from(cause);
    }
  }

  async #remove(path: string): Promise<void> {
    const { name, parent } = await this.#parent(path);
    try {
      await parent.removeEntry(name, { 'recursive': true });
    } catch (cause) {
      throw VirtualFileSystemError.from(cause);
    }
  }

  async #writeFile(path: string, data: string): Promise<void> {
    const { name, parent } = await this.#parent(path);
    try {
      const handle = await parent.getFileHandle(name, { 'create': true });
      const writable = await handle.createWritable();

      try {
        await writable.write(data);
      } finally {
        await writable.close();
      }
    } catch (cause) {
      throw VirtualFileSystemError.from(cause);
    }
  }

  static #getNativeStorage(): OpfsStorageInterface {
    const storage = globalThis.navigator?.storage;

    if (storage === undefined || typeof storage.getDirectory !== 'function') {
      throw new VirtualFileSystemError('Origin Private File System is unavailable in this browser context.');
    }

    const result: OpfsStorageInterface = storage;

    return result;
  }

  static #segments(path: string): string[] {
    const segments = path.split('/').filter((segment): boolean => {
      const result = segment.length > 0;

      return result;
    });
    if (segments.some((segment): boolean => {
      const result = segment === '.' || segment === '..';

      return result;
    })) {
      throw new VirtualFileSystemError(`Invalid OPFS path: ${path}`);
    }

    return segments;
  }

  async #directory(path: string): Promise<Awaited<ReturnType<OpfsStorageInterface['getDirectory']>>> {
    const segments = OpfsFileSystem.#segments(path);
    try {
      let directory = await this.#storage.getDirectory();
      const segmentsLength = segments.length;

      for (let index = 0; index < segmentsLength; index += 1) {
        const segment = segments[index];

        if (segment === undefined) {
          continue;
        }
        directory = await directory.getDirectoryHandle(segment);
      }

      const result = directory;

      return result;
    } catch (cause) {
      throw VirtualFileSystemError.from(cause);
    }
  }

  async #parent(path: string): Promise<{ readonly 'name': string; readonly 'parent': Awaited<ReturnType<OpfsStorageInterface['getDirectory']>> }> {
    const segments = OpfsFileSystem.#segments(path);
    const name = segments.pop();
    if (name === undefined) {
      throw new VirtualFileSystemError(`A file path is required: ${path}`);
    }

    const parent = await this.#directory(segments.join('/'));
    const result = { 'name': name, 'parent': parent };

    return result;
  }
}
