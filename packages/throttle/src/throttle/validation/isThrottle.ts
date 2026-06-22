import { TypeGuards } from '@studnicky/config';

import type { ThrottleInterface } from '../../interfaces/ThrottleInterface.js';

/**
 * Type guard that checks if value is a valid ThrottleInterface
 *
 * Validates that the value is an object with all required Throttle methods.
 *
 * @param value - Value to check
 * @returns True if value is a valid ThrottleInterface
 */
export function isThrottle(value: unknown): value is ThrottleInterface {
  if (!TypeGuards.isObject(value)) {
    return false;
  }

  return (
    TypeGuards.isFunction(value.execute)
    && TypeGuards.isFunction(value.getStats)
    && TypeGuards.isFunction(value.updateConfig)
    && TypeGuards.isFunction(value.isComplete)
    && TypeGuards.isFunction(value.drain)
    && TypeGuards.isFunction(value.abort)
  );
}
