import { TestWorkspace } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import type { OpfsStorageInterface } from '../../../src/browser/index.js';
import type { AsyncFileSystemInterface } from '../../../src/interfaces/AsyncFileSystemInterface.js';

import { OpfsFileSystem } from '../../../src/browser/index.js';
import { VirtualFileSystemError } from '../../../src/errors/VirtualFileSystemError.js';
import { NodeFileSystem } from '../../../src/node/index.js';

/** Raised by the in-memory OPFS doubles when an entry is missing. */
class TestEntryMissingError extends BaseError {
  public override readonly name: string = 'TestEntryMissingError';

  public constructor(message: string) {
    super({
      'code': 'virtualFs.testEntryMissing',
      'message': message,
      'retryable': false
    });
  }
}

class TestFile {
  public content = '';

  public text(): Promise<string> {
    const text = Promise.resolve(this.content);
    return text;
  }
}

class TestWritableFile {
  readonly #file: TestFile;

  public constructor(file: TestFile) {
    this.#file = file;
  }

  public async close(): Promise<void> {}

  public write(data: string): Promise<void> {
    this.#file.content = data;
    const written = Promise.resolve();
    return written;
  }
}

class TestFileHandle {
  readonly #file: TestFile;

  public constructor(file: TestFile) {
    this.#file = file;
  }

  public createWritable(): Promise<TestWritableFile> {
    const writable = Promise.resolve(new TestWritableFile(this.#file));
    return writable;
  }

  public getFile(): Promise<TestFile> {
    const file = Promise.resolve(this.#file);
    return file;
  }
}

/** Yields directory entry names one at a time. */
class TestEntryIterator implements AsyncIterableIterator<{ readonly 'name': string }> {
  readonly #names: readonly string[];
  #position = 0;

  public constructor(names: readonly string[]) {
    this.#names = names;
  }

  public [Symbol.asyncIterator](): TestEntryIterator {
    return this;
  }

  public next(): Promise<IteratorResult<{ readonly 'name': string }>> {
    const name = this.#names[this.#position];
    this.#position += 1;
    const result: IteratorResult<{ readonly 'name': string }> = name === undefined
      ? { 'done': true, 'value': undefined }
      : { 'done': false, 'value': { 'name': name } };
    const settled = Promise.resolve(result);
    return settled;
  }
}

class TestDirectory {
  readonly #directories = new Map<string, TestDirectory>();
  readonly #files = new Map<string, TestFile>();

  public getDirectoryHandle(name: string, options?: { readonly 'create'?: boolean }): Promise<TestDirectory> {
    const existing = this.#directories.get(name);
    if (existing !== undefined) {
      const found = Promise.resolve(existing);
      return found;
    }
    if (options?.create !== true) {
      const missing = Promise.reject(new TestEntryMissingError(`Directory does not exist: ${name}`));
      return missing;
    }
    const created = new TestDirectory();
    this.#directories.set(name, created);
    const createdHandle = Promise.resolve(created);
    return createdHandle;
  }

  public getFileHandle(name: string, options?: { readonly 'create'?: boolean }): Promise<TestFileHandle> {
    const existing = this.#files.get(name);
    if (existing !== undefined) {
      const found = Promise.resolve(new TestFileHandle(existing));
      return found;
    }
    if (options?.create !== true) {
      const missing = Promise.reject(new TestEntryMissingError(`File does not exist: ${name}`));
      return missing;
    }
    const created = new TestFile();
    this.#files.set(name, created);
    const createdHandle = Promise.resolve(new TestFileHandle(created));
    return createdHandle;
  }

  public removeEntry(name: string): Promise<void> {
    if (this.#files.delete(name) || this.#directories.delete(name)) {
      const removed = Promise.resolve();
      return removed;
    }
    const missing = Promise.reject(new TestEntryMissingError(`Entry does not exist: ${name}`));
    return missing;
  }

  public values(): TestEntryIterator {
    const iterator = new TestEntryIterator([...this.#directories.keys(), ...this.#files.keys()]);
    return iterator;
  }
}

class TestStorage implements OpfsStorageInterface {
  readonly #root = new TestDirectory();

  public getDirectory(): Promise<TestDirectory> {
    const root = Promise.resolve(this.#root);
    return root;
  }
}

class AsyncFileSystemContract {
  public static async assert(fileSystem: AsyncFileSystemInterface, root: string): Promise<void> {
    const directory = `${root}/records`;
    const file = `${directory}/entry.txt`;
    await fileSystem.mkdir(directory);
    await fileSystem.writeFile(file, 'value');

    assert.equal(await fileSystem.exists(file), true);
    assert.equal(await fileSystem.readFile(file), 'value');
    assert.deepEqual(await fileSystem.readdir(directory), ['entry.txt']);

    await fileSystem.remove(file);
    assert.equal(await fileSystem.exists(file), false);
  }
}

void describe('async filesystem adapters', () => {
  void it('runs the shared contract against OPFS', async () => {
    const fileSystem: AsyncFileSystemInterface = OpfsFileSystem.create({ 'storage': new TestStorage() });
    await AsyncFileSystemContract.assert(fileSystem, '/workspace');
  });

  void it('runs the shared contract against Node filesystem promises', async () => {
    using workspace = TestWorkspace.create('substrate-async-fs-');
    const fileSystem: AsyncFileSystemInterface = new NodeFileSystem();

    await AsyncFileSystemContract.assert(fileSystem, workspace.root);
  });

  void it('reports unavailable OPFS without dereferencing a missing navigator', () => {
    const navigatorMock = mock.getter(globalThis, 'navigator', () => { return undefined; });

    try {
      assert.throws(() => { OpfsFileSystem.create(); }, VirtualFileSystemError);
    } finally {
      navigatorMock.mock.restore();
    }
  });
});
