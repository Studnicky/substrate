
import type { FileSystemInterface } from '#runtime';

import type { FileLockOptionsEntity } from '../entities/FileLockOptionsEntity.js';
import type { OwnerTokenInterface } from './OwnerTokenInterface.js';

export interface FileRenameLockCreateOptionsInterface {
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'ownerToken'?: OwnerTokenInterface;
  readonly 'path': FileLockOptionsEntity.InputType['path'];
}
