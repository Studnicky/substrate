import type { RetryConfigEntity } from '../entities/RetryConfigEntity.js';
import type { ErrorClassifierFunctionType } from '../types/ErrorClassifierFunctionType.js';
import type { RetryInterceptorType } from '../types/RetryInterceptorType.js';
import type { ErrorClassifierInterface } from './ErrorClassifierInterface.js';

/**
 * Runtime configuration contract for retry behavior.
 *
 * Composes the JSON-serializable {@link RetryConfigEntity.Type} with non-serializable
 * runtime members (errorClassifier, retryInterceptor). This interface is the full
 * contract accepted by {@link Retry} and {@link RetryBuilder}.
 *
 * Schema validation covers only the JSON subset (maxRetries). Runtime members are
 * validated by the Retry construction path.
 */
export interface RetryConfigInterface extends RetryConfigEntity.Type {
  readonly 'errorClassifier'?: ErrorClassifierFunctionType | ErrorClassifierInterface;
  readonly 'retryInterceptor'?: RetryInterceptorType | readonly RetryInterceptorType[];
}
