import type { FileSystemInterface, StatResultInterface } from '@studnicky/virtual-fs';

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';

export class NodeFileSystem implements FileSystemInterface {
  existsSync(path: string): boolean {
    const result = existsSync(path);
    return result;
  }

  mkdirSync(path: string, options?: { readonly 'recursive'?: boolean }): void {
    mkdirSync(path, options);
  }

  readdirSync(path: string): string[] {
    const result = readdirSync(path, { 'encoding': 'utf8' });
    return result;
  }

  readFileSync(path: string, encoding: 'utf8'): string {
    const result = readFileSync(path, encoding);
    return result;
  }

  renameSync(oldPath: string, newPath: string): void {
    renameSync(oldPath, newPath);
  }

  statSync(path: string): StatResultInterface {
    const result = statSync(path);
    return result;
  }

  unlinkSync(path: string): void {
    unlinkSync(path);
  }

  writeFileSync(path: string, data: string, encoding: 'utf8'): void {
    writeFileSync(path, data, encoding);
  }
}
