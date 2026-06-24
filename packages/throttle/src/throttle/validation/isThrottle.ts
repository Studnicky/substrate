import { Guard } from '@studnicky/config';

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
  if (!Guard.isObject(value)) {
    return false;
  }

  return (
    Guard.isFunction(value.execute)
    && Guard.isFunction(value.getStats)
    && Guard.isFunction(value.updateConfig)
    && Guard.isFunction(value.isComplete)
    && Guard.isFunction(value.drain)
    && Guard.isFunction(value.abort)
  );
}
