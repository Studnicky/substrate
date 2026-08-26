/**
 * TimeOperatorsPlugin - Dedicated time comparison operators
 *
 * Provides TIME_BETWEEN and TIME_OUTSIDE operators that properly handle:
 * - Time-only strings (HH:MM, HH:MM:SS)
 * - Full Date objects
 * - ISO datetime strings
 * - Timezone-aware comparisons
 *
 * This plugin uses native JavaScript Date parsing with enhancements
 * for time-only strings. For production use, consider integrating
 * a robust date library like date-fns or dayjs.
 */

import type { FilterValueEntity } from '../FilterValueEntity.js';
import type { ContextualOperatorFunctionInterface } from './ContextualOperatorFunctionInterface.js';
import type { PluginContextInterface } from './PluginContextInterface.js';

import { TIME_ONLY_PATTERN } from '../../predicates/constants/TimeOnlyPattern.js';
import { Predicates } from '../../predicates/Predicates.js';
import { WHOLE_NUMBER_PATTERN } from '../utils/constants/WholeNumberPattern.js';
import { Plugin } from './Plugin.js';

export class TimeOperatorsPlugin extends Plugin {
  /**
   * TIME_AFTER operator - checks if a time/datetime is after another
   */
  private timeAfter: ContextualOperatorFunctionInterface = (
    value: FilterValueEntity.Type,
    filterValue: FilterValueEntity.Type,
    _context?: PluginContextInterface
  ): boolean => {
    const dateValue = this.parseTimeValue(value);
    const compareDate = this.parseTimeValue(filterValue);

    if (dateValue === null || compareDate === null) {
      return false;
    }

    const timeOnly = this.isTimeOnlyComparison(value, [filterValue]);
    const valueTime = this.getComparableTime(dateValue, timeOnly);
    const compareTime = this.getComparableTime(compareDate, timeOnly);
    const result = valueTime > compareTime;

    return result;
  };

  /**
   * TIME_BEFORE operator - checks if a time/datetime is before another
   */
  private timeBefore: ContextualOperatorFunctionInterface = (
    value: FilterValueEntity.Type,
    filterValue: FilterValueEntity.Type,
    _context?: PluginContextInterface
  ): boolean => {
    const dateValue = this.parseTimeValue(value);
    const compareDate = this.parseTimeValue(filterValue);

    if (dateValue === null || compareDate === null) {
      return false;
    }

    const timeOnly = this.isTimeOnlyComparison(value, [filterValue]);
    const valueTime = this.getComparableTime(dateValue, timeOnly);
    const compareTime = this.getComparableTime(compareDate, timeOnly);
    const result = valueTime < compareTime;

    return result;
  };

  /**
   * TIME_BETWEEN operator - checks if a time/datetime is within a range
   */
  private timeBetween: ContextualOperatorFunctionInterface = (
    value: FilterValueEntity.Type,
    filterValue: FilterValueEntity.Type,
    context?: PluginContextInterface
  ): boolean => {
    // Validate range input - only accept object format { start, end }
    if (!Predicates.isRecord(filterValue)) {
      return false;
    }

    const {
      end, start
    } = filterValue;

    // Parse all values
    const dateValue = this.parseTimeValue(value);
    const startDate = this.parseTimeValue(start);
    const endDate = this.parseTimeValue(end);

    // If any parsing fails, return false
    if (dateValue === null || startDate === null || endDate === null) {
      return false;
    }

    // Determine if this is a time-only comparison
    const timeOnly = this.isTimeOnlyComparison(value, filterValue);

    // Get comparable values
    const valueTime = this.getComparableTime(dateValue, timeOnly);
    const startTime = this.getComparableTime(startDate, timeOnly);
    const endTime = this.getComparableTime(endDate, timeOnly);

    // Handle range inversion (e.g., 23:00 to 02:00 for overnight ranges)
    const minimum = Math.min(startTime, endTime);
    const maximum = Math.max(startTime, endTime);

    // Check if inclusive (default true)
    const inclusive = TimeOperatorsPlugin.isConditionInclusive(context);

    if (inclusive) {
      const result = valueTime >= minimum && valueTime <= maximum;

      return result;
    }

    const result = valueTime > minimum && valueTime < maximum;

    return result;
  };

  /**
   * TIME_OUTSIDE operator - checks if a time/datetime is outside a range
   */
  private timeOutside: ContextualOperatorFunctionInterface = (
    value: FilterValueEntity.Type,
    filterValue: FilterValueEntity.Type,
    context?: PluginContextInterface
  ): boolean => {
    // Validate range input - only accept object format { start, end }
    if (!Predicates.isRecord(filterValue)) {
      return false;
    }

    const {
      end, start
    } = filterValue;

    // Parse all values
    const dateValue = this.parseTimeValue(value);
    const startDate = this.parseTimeValue(start);
    const endDate = this.parseTimeValue(end);

    // If value parsing fails, consider it "outside"
    if (dateValue === null) {
      return true;
    }

    // If range parsing fails, return true (invalid range means everything is outside)
    if (startDate === null || endDate === null) {
      return true;
    }

    // Determine if this is a time-only comparison
    const timeOnly = this.isTimeOnlyComparison(value, filterValue);

    // Get comparable values
    const valueTime = this.getComparableTime(dateValue, timeOnly);
    const startTime = this.getComparableTime(startDate, timeOnly);
    const endTime = this.getComparableTime(endDate, timeOnly);

    // Handle range inversion
    const minimum = Math.min(startTime, endTime);
    const maximum = Math.max(startTime, endTime);

    // Check if inclusive (default true)
    const inclusive = TimeOperatorsPlugin.isConditionInclusive(context);

    if (inclusive) {
      const result = valueTime < minimum || valueTime > maximum;

      return result;
    }

    const result = valueTime <= minimum || valueTime >= maximum;

    return result;
  };

  constructor() {
    super({
      'description': 'Advanced time comparison operators for time-based filtering',
      'name': 'TimeOperators',
      'version': '1.0.0'
    });

    // Register operators in constructor. `timeAfter` etc. are already arrow
    // class fields, lexically bound to this instance at construction — no
    // `.bind(this)` needed (or permitted; see @studnicky/lexical-this-only).
    this.operators = {
      'TIME_AFTER': this.timeAfter,
      'TIME_BEFORE': this.timeBefore,
      'TIME_BETWEEN': this.timeBetween,
      'TIME_OUTSIDE': this.timeOutside
    };
  }

  private static isConditionInclusive(context: PluginContextInterface | undefined): boolean {
    const result = !Predicates.isRecord(context?.condition) || context.condition.inclusive !== false;

    return result;
  }

  /**
   * Extract time components for time-only comparisons
   * When comparing times, we only care about the time portion, not the date
   */
  private getComparableTime(date: Date, timeOnly = false): number {
    if (timeOnly) {
      // For time-only comparisons, normalize to the same date
      const referenceDate = new Date(1970, 0, 1, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
      const result = referenceDate.getTime();

      return result;
    }

    const result = date.getTime();

    return result;
  }

  /**
   * Determine if we're doing time-only comparison
   * This happens when the range contains time-only strings
   */
  private isTimeOnlyComparison(_value: unknown, range: unknown): boolean {
    // Handle object format { start, end }
    if (Predicates.isRecord(range)) {
      const {
        end, start
      } = range;
      const startIsTimeOnly = typeof start === 'string' && TIME_ONLY_PATTERN.test(start.trim());
      const endIsTimeOnly = typeof end === 'string' && TIME_ONLY_PATTERN.test(end.trim());
      const result = startIsTimeOnly && endIsTimeOnly;

      return result;
    }

    // Handle array format (legacy)
    if (Array.isArray(range)) {
      const result = range.every((item) => {
        const itemIsTimeOnly = typeof item === 'string' && TIME_ONLY_PATTERN.test(item.trim());

        return itemIsTimeOnly;
      });

      return result;
    }

    return false;
  }

  /**
   * Parse a time value into a comparable Date object
   * Handles time-only strings by using a reference date
   */
  private parseTimeValue(value: unknown): Date | null {
    if (value === null || value === undefined) {
      return null;
    }

    // Handle existing Date objects
    if (value instanceof Date) {
      const result = isNaN(value.getTime()) ? null : value;

      return result;
    }

    // Handle numeric timestamps
    if (typeof value === 'number') {
      // Distinguish between Unix timestamps (seconds) and epoch timestamps (milliseconds)
      // Unix timestamps are typically 10 digits (until year 2286)
      // Epoch milliseconds are typically 13 digits (until year 2286)
      // We'll consider anything less than 10000000000 as Unix timestamp (seconds)
      // This covers dates from 1970-01-01 to 2286-11-20
      let timestamp = value;

      // Convert Unix timestamp (seconds) to milliseconds
      if (value < 10000000000) {
        timestamp = value * 1000;
      }

      const date = new Date(timestamp);
      const result = isNaN(date.getTime()) ? null : date;

      return result;
    }

    // Handle string values
    if (typeof value === 'string') {
      const trimmed = value.trim();

      // Check if it's a numeric string (potential timestamp)
      if (WHOLE_NUMBER_PATTERN.test(trimmed)) {
        const numericValue = parseInt(trimmed, 10);

        // Recursively call with numeric value to handle Unix/epoch logic
        const result = this.parseTimeValue(numericValue);

        return result;
      }

      // Check for time-only format (HH:MM or HH:MM:SS)
      const timeMatch = TIME_ONLY_PATTERN.exec(trimmed);

      if (timeMatch !== null) {
        const hours = parseInt(timeMatch[1] ?? '0', 10);
        const minutes = parseInt(timeMatch[2] ?? '0', 10);
        const seconds = timeMatch[3] === undefined ? 0 : parseInt(timeMatch[3], 10);

        // Validate time components
        if (hours >= 0 && hours <= 23
            && minutes >= 0 && minutes <= 59
            && seconds >= 0 && seconds <= 59) {
          // Use TODAY's date for time-only comparisons
          const today = new Date();

          return new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            hours,
            minutes,
            seconds,
            0 // milliseconds
          );
        }

        // If it looks like a time string but has invalid values, reject it
        return null;
      }

      // Try standard Date parsing for full datetime strings
      const date = new Date(trimmed);
      const result = isNaN(date.getTime()) ? null : date;

      return result;
    }

    return null;
  }
}
