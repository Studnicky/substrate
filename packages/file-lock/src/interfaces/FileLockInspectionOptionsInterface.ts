import type { FileSystemInterface } from '@studnicky/virtual-fs';

export interface FileLockInspectionOptionsInterface {
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'path': string;
}
