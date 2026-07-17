// json-schema-uninexpressible: 'cause' is a native Error class instance and 'context' is Record<string, unknown> — neither is JSON-Schema-expressible
/**
 * Options for constructing a ModuleError
 */
export type ModuleErrorOptionsType = {
  /**
   * Underlying error that caused this error.
   * Enables error chain traversal and root cause analysis.
   */
  'cause'?: Error | undefined;

  /**
   * Error code for classification (e.g., 'CONNECTION_ERROR', 'VALIDATION_ERROR')
   * Used for error categorization and routing
   */
  'code': string;

  /**
   * Additional context/metadata for debugging
   * Can include any relevant data (IDs, parameters, state, etc.)
   */
  'context': Record<string, unknown> | undefined;

  /**
   * Whether this error should trigger retry logic
   * Set to true for transient failures (network, rate limits, timeouts)
   * Set to false for permanent failures (validation, auth, not found)
   */
  'retryable': boolean | undefined;

  /**
   * HTTP status code (for API/HTTP errors, optional for internal errors)
   * Use standard HTTP codes: 400-499 for client errors, 500-599 for server errors
   */
  'statusCode': number | undefined;
};
