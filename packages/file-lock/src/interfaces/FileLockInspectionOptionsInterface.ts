import type { FileSystemInterface } from '@studnicky/virtual-fs/node';

export interface FileLockInspectionOptionsInterface {
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'path': string;
}
