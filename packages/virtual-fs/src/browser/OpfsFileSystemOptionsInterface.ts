import type { OpfsStorageInterface } from './OpfsStorageInterface.js';

/** Options for creating an OPFS-backed async filesystem. */
export interface OpfsFileSystemOptionsInterface {
  readonly 'storage'?: OpfsStorageInterface;
}
