import type { ErrorScenarioType } from '../types/index.js';

/**
 * Options for creating a ModuleError with scenario defaults
 */
export type ModuleErrorCreateOptionsType = {
  /**
   * Underlying error that caused this error
   */
  readonly 'cause'?: Error;

  /**
   * Additional context/metadata for debugging
   */
  readonly 'context'?: Record<string, unknown>;

  /**
   * Whether this error should trigger retry logic (overrides scenario default)
   */
  readonly 'retryable'?: boolean;

  /**
   * Error scenario to use for defaults (CONNECTION, AUTHENTICATION, etc.)
   */
  readonly 'scenario': ErrorScenarioType;

  /**
   * HTTP status code (overrides scenario default)
   */
  readonly 'statusCode'?: number;
};
