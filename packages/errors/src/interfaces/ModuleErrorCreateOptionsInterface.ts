import type { ErrorDefaults } from '../constants/index.js';
import type { ErrorClassificationEntity } from '../entities/ErrorClassificationEntity.js';
import type { ErrorWithStatusCodeEntity } from '../entities/ErrorWithStatusCodeEntity.js';

/** Options for creating a `ModuleError` with scenario defaults. */
export interface ModuleErrorCreateOptionsInterface {
  /** Underlying error that caused this error. */
  readonly 'cause'?: Error;

  /** Additional context or metadata for debugging. */
  readonly 'context'?: Record<string, unknown>;

  /** Overrides the scenario's retry behavior. */
  readonly 'retryable'?: ErrorClassificationEntity.Type['retryable'];

  /** Selects the defaults applied to the error. */
  readonly 'scenario': keyof typeof ErrorDefaults;

  /** Overrides the scenario's HTTP status code. */
  readonly 'statusCode'?: ErrorWithStatusCodeEntity.Type['statusCode'];
}
