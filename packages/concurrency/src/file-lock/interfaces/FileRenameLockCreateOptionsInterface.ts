import type { FileSystemInterface } from '@studnicky/virtual-fs/browser';

import type { FileLockOptionsEntity } from '../entities/FileLockOptionsEntity.js';
import type { OwnerTokenInterface } from './OwnerTokenInterface.js';

export interface FileRenameLockCreateOptionsInterface {
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'ownerToken'?: OwnerTokenInterface;
  readonly 'path': FileLockOptionsEntity.InputType['path'];
}
