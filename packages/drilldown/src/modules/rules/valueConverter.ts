import { Predicates } from '@studnicky/types';

/**
 * Provides type conversion utilities for matching operations.
 * Converts unknown values to strict numeric representations.
 */
export const valueConverter = {
  /**
   * Converts a canonical epoch-ms value to a timestamp in milliseconds.
   * @param value - Canonical epoch-ms number.
   * @returns Timestamp in milliseconds, or null if invalid
   */
  'toDateTimestamp': function (value: unknown): null | number {
    if (Predicates.isNumberType(value)) {
      const result = Predicates.isFiniteNumber(value) ? Math.trunc(value) : null;
      return result;
    }

    return null;
  },

  /**
   * Converts a value to a strict number.
   * @param value - Value to convert (number or numeric string)
   * @returns Parsed number, or null if invalid or empty
   */
  'toStrictNumber': function (value: unknown): null | number {
    if (Predicates.isNumberType(value)) {
      const result = isNaN(value) ? null : value;
      return result;
    }
    if (Predicates.isString(value)) {
      const trimmed = value.trim();

      if (trimmed === '') {
        return null;
      }
      const number = Number(trimmed);

      const result = isNaN(number) ? null : number;
      return result;
    }

    return null;
  }
};
