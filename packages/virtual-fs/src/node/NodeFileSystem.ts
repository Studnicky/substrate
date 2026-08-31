import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';

import type { AsyncFileSystemInterface } from '../interfaces/AsyncFileSystemInterface.js';

/** Async Node filesystem adapter. */
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
    await mkdir(path, { 'recursive': true });
  }

  public async readdir(path: string): Promise<string[]> {
    return await readdir(path);
  }

  public async readFile(path: string): Promise<string> {
    return await readFile(path, 'utf8');
  }

  public async remove(path: string): Promise<void> {
    await rm(path, { 'force': false, 'recursive': true });
  }

  public async writeFile(path: string, data: string): Promise<void> {
    await writeFile(path, data, 'utf8');
  }
}
