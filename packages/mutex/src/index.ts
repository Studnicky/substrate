/**
 * @studnicky/mutex
 *
 * Key-based async mutex for preventing race conditions in concurrent operations.
 */

export { AbortResultEntity } from './entities/AbortResultEntity.js';
export { AcquireWaitEventEntity } from './entities/AcquireWaitEventEntity.js';
export { MutexConfigEntity } from './entities/MutexConfigEntity.js';
export { MutexKeyStateEntity } from './entities/MutexKeyStateEntity.js';
export { MutexQueueEntryEntity } from './entities/MutexQueueEntryEntity.js';
export { MutexStatsEntity } from './entities/MutexStatsEntity.js';
export { QueueDrainEventEntity } from './entities/QueueDrainEventEntity.js';
export { ReleaseEventEntity } from './entities/ReleaseEventEntity.js';
export { LockTimeoutError } from './errors/LockTimeoutError.js';
export { MutexError } from './errors/MutexError.js';
export { QueueSizeExceededError } from './errors/QueueSizeExceededError.js';
export type {
  MutexInterface,
  MutexLockInterface
} from './interfaces/MutexInterface.js';
export { Mutex } from './mutex/Mutex.js';
