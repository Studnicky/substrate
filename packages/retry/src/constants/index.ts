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

export const RETRY_CONFIG_KEYS = new Set<string>([
  'backoffStrategy',
  'errorClassifier',
  'hookTimeoutMs',
  'maxElapsedMs',
  'maxRetries'
]);
