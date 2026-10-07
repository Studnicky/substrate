import type { FileSystemInterface } from '#runtime';

export interface FileLockInspectionOptionsInterface {
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'path': string;
}
