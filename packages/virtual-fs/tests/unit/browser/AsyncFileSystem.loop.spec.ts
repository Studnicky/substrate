import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { AsyncFileSystemInterface } from '../../../src/interfaces/AsyncFileSystemInterface.js';
import type { OpfsStorageInterface } from '../../../src/browser/index.js';
import { OpfsFileSystem } from '../../../src/browser/index.js';
import { VirtualFileSystemError } from '../../../src/errors/VirtualFileSystemError.js';
import { NodeFileSystem } from '../../../src/node/index.js';

class TestFile {
  public content = '';

  public async text(): Promise<string> {
    return this.content;
  }
}

class TestWritableFile {
  readonly #file: TestFile;

  public constructor(file: TestFile) {
    this.#file = file;
  }

  public async close(): Promise<void> {}

  public async write(data: string): Promise<void> {
    this.#file.content = data;
  }
}

class TestFileHandle {
  readonly #file: TestFile;

  public constructor(file: TestFile) {
    this.#file = file;
  }

  public async createWritable(): Promise<TestWritableFile> {
    return new TestWritableFile(this.#file);
  }

  public async getFile(): Promise<TestFile> {
    return this.#file;
  }
}

class TestDirectory {
  readonly #directories = new Map<string, TestDirectory>();
  readonly #files = new Map<string, TestFile>();

  public async getDirectoryHandle(name: string, options?: { readonly 'create'?: boolean }): Promise<TestDirectory> {
    const existing = this.#directories.get(name);
    if (existing !== undefined) {
      return existing;
    }
    if (options?.create !== true) {
      throw new Error(`Directory does not exist: ${name}`);
    }
    const created = new TestDirectory();
    this.#directories.set(name, created);
    return created;
  }

  public async getFileHandle(name: string, options?: { readonly 'create'?: boolean }): Promise<TestFileHandle> {
    const existing = this.#files.get(name);
    if (existing !== undefined) {
      return new TestFileHandle(existing);
    }
    if (options?.create !== true) {
      throw new Error(`File does not exist: ${name}`);
    }
    const created = new TestFile();
    this.#files.set(name, created);
    return new TestFileHandle(created);
  }

  public async removeEntry(name: string): Promise<void> {
    if (!this.#files.delete(name) && !this.#directories.delete(name)) {
      throw new Error(`Entry does not exist: ${name}`);
    }
  }

  public async *values(): AsyncIterableIterator<{ readonly 'name': string }> {
    for (const name of this.#directories.keys()) {
      yield { name };
    }
    for (const name of this.#files.keys()) {
      yield { name };
    }
  }
}

class TestStorage implements OpfsStorageInterface {
  readonly #root = new TestDirectory();

  public async getDirectory(): Promise<TestDirectory> {
    return this.#root;
  }
}

async function assertFileSystemContract(fileSystem: AsyncFileSystemInterface, root: string): Promise<void> {
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

void describe('async filesystem adapters', () => {
  void it('runs the shared contract against OPFS', async () => {
    const fileSystem: AsyncFileSystemInterface = OpfsFileSystem.create({ 'storage': new TestStorage() });
    await assertFileSystemContract(fileSystem, '/workspace');
  });

  void it('runs the shared contract against Node filesystem promises', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'substrate-async-fs-'));
    const fileSystem: AsyncFileSystemInterface = new NodeFileSystem();

    try {
      await assertFileSystemContract(fileSystem, root);
    } finally {
      await rm(root, { 'force': true, 'recursive': true });
    }
  });

  void it('reports unavailable OPFS without dereferencing a missing navigator', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    assert.equal(Reflect.deleteProperty(globalThis, 'navigator'), true);

    try {
      assert.throws(() => OpfsFileSystem.create(), VirtualFileSystemError);
    } finally {
      if (descriptor !== undefined) {
        Object.defineProperty(globalThis, 'navigator', descriptor);
      }
    }
  });
});
