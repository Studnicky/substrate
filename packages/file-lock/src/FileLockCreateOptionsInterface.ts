import type { FileSystemInterface } from '@studnicky/virtual-fs';

import type { FileLockOptionsEntity } from './entities/FileLockOptionsEntity.js';
import type { OwnerTokenInterface } from './OwnerTokenInterface.js';

/** Dependencies, timing, and target path used by `FileLock.create()`. */
export interface FileLockCreateOptionsInterface {
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'ownerToken'?: OwnerTokenInterface;
  readonly 'path': FileLockOptionsEntity.Type['path'];
  readonly 'pollMs'?: FileLockOptionsEntity.Type['pollMs'];
  readonly 'timeoutMs'?: FileLockOptionsEntity.Type['timeoutMs'];
}
