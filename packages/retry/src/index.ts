/**
 * @studnicky/retry
 * Generic async retry utility with extensible error classification
 */

export { BackoffConfigEntity } from './entities/BackoffConfigEntity.js';
export { RequestStatsEntity } from './entities/RequestStatsEntity.js';
export { RetryCallStateEntity } from './entities/RetryCallStateEntity.js';
export { RetryConfigEntity } from './entities/RetryConfigEntity.js';
export { RetryContextDataEntity } from './entities/RetryContextDataEntity.js';
export {
  MaxRetriesExceededError,
  NonRetryableError,
  RetryError
} from './errors/index.js';
export type { BackoffStrategyInterface } from './interfaces/BackoffStrategyInterface.js';
export type { RetryConfigInterface } from './interfaces/RetryConfigInterface.js';
export type { RetryContextInterface } from './interfaces/RetryContextInterface.js';
export type { RetryErrorOptionsInterface } from './interfaces/RetryErrorOptionsInterface.js';
export type { RetryInterface } from './interfaces/RetryInterface.js';
export { BackoffStrategy } from './retry/backoff/index.js';
export { Retry } from './retry/Retry.js';

export { RetryConfigGuard } from './retry/validation/RetryConfigGuard.js';
export { RetryContextGuard } from './retry/validation/RetryContextGuard.js';
