import type { ErrorScenarioType } from './index.js';

// json-schema-uninexpressible: 'cause' is a native Error class instance and 'context' is Record<string, unknown> — neither is JSON-Schema-expressible
/**
 * Options for creating a ModuleError with scenario defaults
 */
export type ModuleErrorCreateOptionsType = {
  /**
   * Underlying error that caused this error
   */
  'cause'?: Error;

  /**
   * Additional context/metadata for debugging
   */
  'context'?: Record<string, unknown>;

  /**
   * Whether this error should trigger retry logic (overrides scenario default)
   */
  'retryable'?: boolean;

  /**
   * Error scenario to use for defaults (CONNECTION, AUTHENTICATION, etc.)
   */
  'scenario': ErrorScenarioType;

  /**
   * HTTP status code (overrides scenario default)
   */
  'statusCode'?: number;
};
