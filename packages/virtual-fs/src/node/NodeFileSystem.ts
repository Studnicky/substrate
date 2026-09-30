import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';

import type { AsyncFileSystemInterface } from '../interfaces/AsyncFileSystemInterface.js';

import { VirtualFileSystemError } from '../errors/VirtualFileSystemError.js';

/** Async Node filesystem adapter. Every platform failure surfaces as a `VirtualFileSystemError` carrying the `fs` error as `cause`. */
export class NodeFileSystem implements AsyncFileSystemInterface {
  public async exists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  public async mkdir(path: string): Promise<void> {
    try {
      await mkdir(path, { 'recursive': true });
    } catch (cause) {
      throw VirtualFileSystemError.from(cause);
    }
  }

  public async readdir(path: string): Promise<string[]> {
    try {
      const entries = await readdir(path);
      return entries;
    } catch (cause) {
      throw VirtualFileSystemError.from(cause);
    }
  }

  public async readFile(path: string): Promise<string> {
    try {
      const content = await readFile(path, 'utf8');
      return content;
    } catch (cause) {
      throw VirtualFileSystemError.from(cause);
    }
  }

  public async remove(path: string): Promise<void> {
    try {
      await rm(path, { 'force': false, 'recursive': true });
    } catch (cause) {
      throw VirtualFileSystemError.from(cause);
    }
  }

  public async writeFile(path: string, data: string): Promise<void> {
    try {
      await writeFile(path, data, 'utf8');
    } catch (cause) {
      throw VirtualFileSystemError.from(cause);
    }
  }
}
