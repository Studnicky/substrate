import { TypeGuards } from '@studnicky/config';

import type { RetryInterceptorType } from '../../types/RetryInterceptorType.js';

/**
 * Type guard for RetryInterceptorType
 *
 * @param value - Value to check
 * @returns True if value is a function (RetryInterceptorType)
 */
export function isRetryInterceptor(value: unknown): value is RetryInterceptorType {
  const result = TypeGuards.isFunction(value);
  return result;
}
