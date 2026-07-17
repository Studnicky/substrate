import type { FileSystemInterface } from '@studnicky/virtual-fs';

import type { OwnerTokenInterface } from './OwnerTokenInterface.js';

// json-schema-uninexpressible: `fileSystem`/`ownerToken` are behavioral interfaces (methods like existsSync, get), not plain data
export type FileLockCreateOptionsType = {
  'fileSystem'?: FileSystemInterface;
  'ownerToken'?: OwnerTokenInterface;
  'path': string;
  'pollMs'?: number;
  'timeoutMs'?: number;
};
