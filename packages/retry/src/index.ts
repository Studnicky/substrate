/**
 * @studnicky/retry
 * Generic async retry utility with extensible error classification
 */

export {
  ConfigurationError,
  MaxRetriesExceededError,
  NonRetryableError,
  RetryError
} from './errors/index.js';

export type { ErrorClassificationType } from './interfaces/ErrorClassificationType.js';
export type { ErrorClassifierInterface } from './interfaces/ErrorClassifierInterface.js';
export type { RequestStatsType } from './interfaces/RequestStatsType.js';
export type { RetryBuilderInterface } from './interfaces/RetryBuilderInterface.js';
export type { RetryConfigType } from './interfaces/RetryConfigType.js';
export type { RetryContextType } from './interfaces/RetryContextType.js';
export type { RetryInterface } from './interfaces/RetryInterface.js';
export { BackoffStrategy } from './retry/backoff/index.js';
export { DefaultHttpErrorClassifier } from './retry/core/DefaultHttpErrorClassifier.js';
export { ErrorClassifier } from './retry/core/ErrorClassifier.js';
export { Retry } from './retry/Retry.js';
export { RetryBuilder } from './retry/RetryBuilder.js';

export { errorTypeGuards } from './retry/validation/errorTypeGuards.js';
export { isErrorClassification } from './retry/validation/isErrorClassification.js';
export { isRequestStats } from './retry/validation/isRequestStats.js';
export { isRetryConfig } from './retry/validation/isRetryConfig.js';
export { isRetryContext } from './retry/validation/isRetryContext.js';
export { isRetryInterceptor } from './retry/validation/isRetryInterceptor.js';
export type { BackoffStrategyType } from './types/BackoffStrategyType.js';
export type { ErrorClassifierFunctionType } from './types/ErrorClassifierFunctionType.js';
export type { RetryInterceptorType } from './types/RetryInterceptorType.js';
