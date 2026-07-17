/**
 * Constants for @studnicky/retry
 */

export const DEFAULT_MAX_RETRIES = 3;
export const EMPTY_LENGTH = 0;
export const INCREMENT_BY_ONE = 1;
export const INITIAL_COUNTER = 0;
export const LAST_ARRAY_INDEX = -1;
export const NO_DELAY_MS = 0;
export const EXPONENTIAL_BASE = 2;
export const JITTER_BASE = 0.5;
export const LINEAR_INCREMENT = 1;

// Error-classification constants, promoted to @studnicky/errors. Re-exported
// here to keep the @studnicky/retry/constants subpath complete.
export {
  EARLY_RETRY_THRESHOLD,
  HTTP_CLIENT_ERROR_END,
  HTTP_CLIENT_ERROR_START,
  HTTP_INFORMATIONAL_END,
  HTTP_INFORMATIONAL_START,
  HTTP_REDIRECT_END,
  HTTP_REDIRECT_START,
  HTTP_REQUEST_TIMEOUT,
  HTTP_SERVER_ERROR_END,
  HTTP_SERVER_ERROR_START,
  HTTP_SUCCESS_END,
  HTTP_SUCCESS_START,
  HttpStatus
} from '@studnicky/errors';

export const RETRY_CONFIG_KEYS = new Set<string>([
  'backoffStrategy',
  'errorClassifier',
  'hookTimeoutMs',
  'maxElapsedMs',
  'maxRetries'
]);
