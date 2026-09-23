import type { FileSystemInterface } from '@studnicky/virtual-fs/browser';

import type { FileLockInspectionEntity } from '../entities/FileLockInspectionEntity.js';

export interface FileLockRecoveryOptionsInterface {
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'inspection': FileLockInspectionEntity.Type;
}
