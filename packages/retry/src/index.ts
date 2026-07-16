/**
 * @studnicky/retry
 * Generic async retry utility with extensible error classification
 */

export { RequestStatsEntity } from './entities/RequestStatsEntity.js';
export { RetryConfigEntity } from './entities/RetryConfigEntity.js';
export {
  ConfigurationError,
  MaxRetriesExceededError,
  NonRetryableError,
  RetryError
} from './errors/index.js';
export type { RetryBuilderInterface } from './interfaces/RetryBuilderInterface.js';
export type { RetryConfigInterface } from './interfaces/RetryConfigInterface.js';
export type { RetryInterface } from './interfaces/RetryInterface.js';
export { BackoffStrategy } from './retry/backoff/index.js';
export { Retry } from './retry/Retry.js';
export { RetryBuilder } from './retry/RetryBuilder.js';

export { RequestStatsGuard } from './retry/validation/RequestStatsGuard.js';
export { RetryConfigGuard } from './retry/validation/RetryConfigGuard.js';
export { RetryContextGuard } from './retry/validation/RetryContextGuard.js';
export type { BackoffStrategyType } from './types/BackoffStrategyType.js';
export type { RetryContextType } from './types/RetryContextType.js';

// Error classification, promoted to @studnicky/errors (the single, shared
// classifier concept used by every consumer). Re-exported here so existing
// `@studnicky/retry` import paths keep working unchanged.
export {
  DefaultHttpErrorClassifier,
  DefaultHttpErrorClassifierBuilder,
  ErrorClassificationEntity,
  ErrorClassificationGuard,
  ErrorClassifier,
  errorTypeGuards,
  matchers
} from '@studnicky/errors';
export type {
  ErrorClassifierFunctionType,
  ErrorClassifierInterface
} from '@studnicky/errors';
