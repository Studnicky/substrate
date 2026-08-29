import type { FileSystemInterface } from '@studnicky/virtual-fs';

import type { FileLockRecoveryOptionsInterface } from './interfaces/FileLockRecoveryOptionsInterface.js';

import { FileLockInspectionEntity } from './entities/FileLockInspectionEntity.js';
import { FileLockRecoveryConflictError } from './errors/FileLockRecoveryConflictError.js';
import { NodeFileSystem } from './NodeFileSystem.js';

export class FileLockRecovery {
  public static restore(options: FileLockRecoveryOptionsInterface): void {
    const inspection = FileLockInspectionEntity.intake(options.inspection);
    const fileSystem: FileSystemInterface = options.fileSystem ?? new NodeFileSystem();
    if (fileSystem.existsSync(inspection.originalPath)) {
      throw new FileLockRecoveryConflictError(inspection.originalPath);
    }
    fileSystem.renameSync(inspection.lockPath, inspection.originalPath);
  }
}
