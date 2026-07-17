/**
 * @studnicky/mutex
 *
 * Key-based async mutex for preventing race conditions in concurrent operations.
 */

export { AbortResultEntity } from './entities/AbortResultEntity.js';
export { MutexConfigEntity } from './entities/MutexConfigEntity.js';
export { MutexStatsEntity } from './entities/MutexStatsEntity.js';
export { LockTimeoutError } from './errors/LockTimeoutError.js';
export { MutexError } from './errors/MutexError.js';
export { QueueSizeExceededError } from './errors/QueueSizeExceededError.js';
export type { MutexBuilderInterface } from './interfaces/MutexBuilderInterface.js';
export type {
  MutexInterface,
  MutexLockInterface
} from './interfaces/MutexInterface.js';
export { Mutex } from './mutex/Mutex.js';
export { MutexBuilder } from './mutex/MutexBuilder.js';
export { ConfigurationError } from '@studnicky/config';
