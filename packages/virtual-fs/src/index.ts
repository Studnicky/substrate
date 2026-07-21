/**
 * @studnicky/virtual-fs
 * In-memory synchronous filesystem primitive
 *
 * @module
 */
export { EntryEntity } from './entities/EntryEntity.js';
export { MkdirOptionsEntity } from './entities/MkdirOptionsEntity.js';
export { VirtualFileSystemError } from './errors/index.js';
export type { FileSystemInterface } from './interfaces/index.js';
export type { StatResultInterface } from './interfaces/index.js';
export type { VirtualFileSystemOptionsInterface } from './interfaces/index.js';
export { VirtualFileSystem } from './virtual-fs/index.js';
