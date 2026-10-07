
import type { FileSystemInterface } from '#runtime';

import type { FileLockInspectionEntity } from '../entities/FileLockInspectionEntity.js';

export interface FileLockRecoveryOptionsInterface {
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'inspection': FileLockInspectionEntity.InputType;
}
