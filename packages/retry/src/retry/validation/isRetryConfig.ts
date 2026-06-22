import { TypeGuards } from '@studnicky/config';

import type { RetryConfigType } from '../../interfaces/RetryConfigType.js';

import { Retry } from '../Retry.js';

/**
 * Type guard for RetryConfigType
 *
 * @param value - Value to check
 * @returns True if value is a valid RetryConfigType
 *
 * @example
 * ```typescript
 * if (isRetryConfig(config)) {
 *   const retry = Retry.create(config);
 * }
 * ```
 */
export function isRetryConfig(value: unknown): value is RetryConfigType {
  if (!TypeGuards.isObject(value)) {
    return false;
  }

  try {
    Retry.create(value);

    return true;
  } catch {
    return false;
  }
}
