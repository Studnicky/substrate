import type { FileSystemInterface } from '@studnicky/virtual-fs';

import type { FileLockInspectionOptionsInterface } from './interfaces/FileLockInspectionOptionsInterface.js';

import { FileLockInspectionEntity } from './entities/FileLockInspectionEntity.js';
import { FileLockOptionsEntity } from './entities/FileLockOptionsEntity.js';
import { LockPathHelpers } from './LockPathHelpers.js';
import { NodeFileSystem } from './NodeFileSystem.js';

export class FileLockInspection {
  public static inspect(options: FileLockInspectionOptionsInterface): readonly FileLockInspectionEntity.Type[] {
    const path = FileLockOptionsEntity.intake({ 'path': options.path }).path;
    const fileSystem: FileSystemInterface = options.fileSystem ?? new NodeFileSystem();
    const directory = LockPathHelpers.dirname(path);
    const prefix = `${LockPathHelpers.basename(path)}.lock.`;
    const result: FileLockInspectionEntity.Type[] = [];
    const entries = fileSystem.readdirSync(directory).toSorted();

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      if (!entry.startsWith(prefix)) {
        continue;
      }
      const ownerToken = entry.slice(prefix.length);
      if (ownerToken.length === 0) {
        continue;
      }
      result.push(FileLockInspectionEntity.intake({
        'lockPath': LockPathHelpers.join(directory, entry),
        'originalPath': path,
        'ownerToken': ownerToken
      }));
    }

    return result;
  }
}
