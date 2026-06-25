import type { FileSystemInterface } from '@studnicky/virtual-fs';

import type { OwnerTokenInterface } from './OwnerTokenInterface.js';

export type FileLockCreateOptionsType = {
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'ownerToken'?: OwnerTokenInterface;
  readonly 'path': string;
  readonly 'pollMs'?: number;
  readonly 'timeoutMs'?: number;
};
