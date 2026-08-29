/** Options for constructing a `ModuleError`. */
import type { ErrorClassificationEntity } from '../entities/ErrorClassificationEntity.js';
import type { ErrorWithCodeEntity } from '../entities/ErrorWithCodeEntity.js';
import type { ErrorWithStatusEntity } from '../entities/ErrorWithStatusEntity.js';

export interface ModuleErrorOptionsInterface {
  /** Underlying error that caused this error. */
  readonly 'cause'?: Error | undefined;

  /** Error code used for classification and routing. */
  readonly 'code': ErrorWithCodeEntity.Type['code'];

  /** Additional context or metadata for debugging. */
  readonly 'context': Record<string, unknown> | undefined;

  /** Whether the error represents a transient failure. */
  readonly 'retryable': ErrorClassificationEntity.Type['retryable'] | undefined;

  /** HTTP status code associated with the error. */
  readonly 'status': ErrorWithStatusEntity.Type['status'] | undefined;
}
