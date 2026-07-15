/**
 * @studnicky/retry
 * Generic async retry utility with extensible error classification
 */

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

export { isRequestStats } from './retry/validation/isRequestStats.js';
export { isRetryConfig } from './retry/validation/isRetryConfig.js';
export { isRetryContext } from './retry/validation/isRetryContext.js';
export type { BackoffStrategyType } from './types/BackoffStrategyType.js';
export type { RequestStatsType } from './types/RequestStatsType.js';
export type { RetryContextType } from './types/RetryContextType.js';

// Error classification, promoted to @studnicky/errors (the single, shared
// classifier concept used by every consumer). Re-exported here so existing
// `@studnicky/retry` import paths keep working unchanged.
export {
  DefaultHttpErrorClassifier,
  DefaultHttpErrorClassifierBuilder,
  ErrorClassifier,
  errorTypeGuards,
  isErrorClassification,
  matchers
} from '@studnicky/errors';
export type {
  ErrorClassificationType,
  ErrorClassifierFunctionType,
  ErrorClassifierInterface
} from '@studnicky/errors';
