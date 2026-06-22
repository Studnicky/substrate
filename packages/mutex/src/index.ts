/**
 * @studnicky/mutex
 *
 * Key-based async mutex for preventing race conditions in concurrent operations.
 */

export { ConfigurationError } from './errors/ConfigurationError.js';
export { LockTimeoutError } from './errors/LockTimeoutError.js';
export { QueueSizeExceededError } from './errors/QueueSizeExceededError.js';
export type { MutexBuilderInterface } from './interfaces/MutexBuilderInterface.js';
export type {
  MutexInterface,
  MutexLockInterface
} from './interfaces/MutexInterface.js';
export { Mutex } from './mutex/Mutex.js';
export { MutexBuilder } from './mutex/MutexBuilder.js';
export type { AbortResultType } from './types/AbortResultType.js';
export type { MutexConfigType } from './types/MutexConfigType.js';
export type { MutexObservabilityType } from './types/MutexObservabilityType.js';
export type { MutexStatsType } from './types/MutexStatsType.js';
