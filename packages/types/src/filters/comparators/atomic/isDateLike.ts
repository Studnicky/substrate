/**
 * Date-like value detection
 */

import { DATE_LIKE_TIMESTAMP_RANGE } from './constants/DateLikeTimestampRange.js';
import { TIME_ONLY_PATTERN } from './constants/TimeOnlyPattern.js';

/**
 * Checks if a value is date-like (can be converted to a valid date)
 * For filtering purposes, this function validates:
 * - Date instances (including invalid ones - they are still Date objects)
 * - String values that can be parsed as valid dates
 * - Numeric timestamps within a reasonable range (1990-2100)
 */
export class IsDateLike {
  static isDateLike(value: unknown): boolean   {
    if (value === null || value === undefined) {
      return false;
    }

    // Already a Date object - always considered date-like even if invalid
    // This allows filtering logic to handle invalid dates appropriately
    if (value instanceof Date) {
      return true;
    }

    // Only accept primitive string and number types for parsing
    // Reject arrays, objects, symbols, etc.
    if (typeof value !== 'string' && typeof value !== 'number') {
      return false;
    }

    // Handle numeric timestamps
    if (typeof value === 'number') {
      // Reject special numeric values
      if (!Number.isFinite(value)) {
        return false;
      }

      // Check if the timestamp is within our valid range
      const result = value >= DATE_LIKE_TIMESTAMP_RANGE.MINIMUM && value <= DATE_LIKE_TIMESTAMP_RANGE.MAXIMUM;
      return result;
    }

    // Handle string values
    if (typeof value === 'string') {
      // Reject empty strings
      if (value.trim() === '') {
        return false;
      }

      const trimmedValue = value.trim();

      // Check for time-only strings (HH:MM or HH:MM:SS format)
      const timeMatch = TIME_ONLY_PATTERN.exec(trimmedValue);

      if (timeMatch !== null) {
        const hours = parseInt(timeMatch[1] ?? '0', 10);
        const minutes = parseInt(timeMatch[2] ?? '0', 10);
        const seconds = timeMatch[3] === undefined ? 0 : parseInt(timeMatch[3], 10);

        // Valid time components indicate this is date-like
        const result = hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59;
        return result;
      }

      // Try to parse the string as a date
      // Use try-catch to handle any parsing errors gracefully
      try {
        const parsed = Date.parse(trimmedValue);

        const result = !isNaN(parsed);
        return result;
      } catch {
        return false;
      }
    }

    return false;
  }
}
