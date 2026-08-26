import type { FileSystemInterface } from '@studnicky/virtual-fs';
import type { StatResultInterface } from '@studnicky/virtual-fs/interfaces';

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';

export class NodeFileSystem implements FileSystemInterface {
  readonly existsSync = existsSync;
  readonly mkdirSync = mkdirSync;
  readonly readdirSync: (path: string) => string[] = readdirSync;
  readonly readFileSync = readFileSync;
  readonly renameSync = renameSync;
  readonly statSync: (path: string) => StatResultInterface = statSync;
  readonly unlinkSync = unlinkSync;
  readonly writeFileSync = writeFileSync;
}
