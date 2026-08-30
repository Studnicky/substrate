/**
 * @studnicky/mutex
 *
 * Key-based async mutex for preventing race conditions in concurrent operations.
 */

export { LockTimeoutError } from './errors/LockTimeoutError.js';
export { MutexError } from './errors/MutexError.js';
export { QueueSizeExceededError } from './errors/QueueSizeExceededError.js';
export type { MutexCreateOptionsInterface } from './interfaces/MutexCreateOptionsInterface.js';
export { Mutex } from './mutex/Mutex.js';
