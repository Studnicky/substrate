import type { FileSystemInterface } from '@studnicky/virtual-fs/browser';

export interface FileLockInspectionOptionsInterface {
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'path': string;
}
