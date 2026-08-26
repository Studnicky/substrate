/**
 * Checks if a string contains only alphanumeric characters
 */

import { ALPHANUMERIC_PATTERN } from './constants/AlphanumericPattern.js';

/**
 * Checks if a value is a string containing only letters and numbers
 * @param value - The value to check
 * @returns true if value is alphanumeric, false otherwise
 */
export class IsAlphanumeric {
  static isAlphanumeric(value: unknown): boolean   {
    const result = typeof value === 'string' && ALPHANUMERIC_PATTERN.test(value);
    return result;
  }
}
