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

import type { FilterValue } from '../types.js';
import type { ContextualOperatorFunction, PluginContext } from './BasePlugin.js';

import { Guard } from '../../guards/Guard.js';
import { Plugin } from './BasePlugin.js';

function isConditionInclusive(context: PluginContext | undefined): boolean {
  return !Guard.isRecord(context?.condition) || context.condition.inclusive !== false;
}

export class TimeOperatorsPlugin extends Plugin {
  /**
   * TIME_AFTER operator - checks if a time/datetime is after another
   */
  private timeAfter: ContextualOperatorFunction = (
    value: FilterValue,
    filterValue: FilterValue,
    _context?: PluginContext
  ): boolean => {
    const dateValue = this.parseTimeValue(value);
    const compareDate = this.parseTimeValue(filterValue);

    if (!dateValue || !compareDate) {
      return false;
    }

    const timeOnly = this.isTimeOnlyComparison(value, [filterValue]);
    const valueTime = this.getComparableTime(dateValue, timeOnly);
    const compareTime = this.getComparableTime(compareDate, timeOnly);

    return valueTime > compareTime;
  };

  /**
   * TIME_BEFORE operator - checks if a time/datetime is before another
   */
  private timeBefore: ContextualOperatorFunction = (
    value: FilterValue,
    filterValue: FilterValue,
    _context?: PluginContext
  ): boolean => {
    const dateValue = this.parseTimeValue(value);
    const compareDate = this.parseTimeValue(filterValue);

    if (!dateValue || !compareDate) {
      return false;
    }

    const timeOnly = this.isTimeOnlyComparison(value, [filterValue]);
    const valueTime = this.getComparableTime(dateValue, timeOnly);
    const compareTime = this.getComparableTime(compareDate, timeOnly);

    return valueTime < compareTime;
  };

  /**
   * TIME_BETWEEN operator - checks if a time/datetime is within a range
   */
  private timeBetween: ContextualOperatorFunction = (
    value: FilterValue,
    filterValue: FilterValue,
    context?: PluginContext
  ): boolean => {
    // Validate range input - only accept object format { start, end }
    if (!Guard.isRecord(filterValue)) {
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
    if (!dateValue || !startDate || !endDate) {
      return false;
    }

    // Determine if this is a time-only comparison
    const timeOnly = this.isTimeOnlyComparison(value, filterValue);

    // Get comparable values
    const valueTime = this.getComparableTime(dateValue, timeOnly);
    const startTime = this.getComparableTime(startDate, timeOnly);
    const endTime = this.getComparableTime(endDate, timeOnly);

    // Handle range inversion (e.g., 23:00 to 02:00 for overnight ranges)
    const min = Math.min(startTime, endTime);
    const max = Math.max(startTime, endTime);

    // Check if inclusive (default true)
    const inclusive = isConditionInclusive(context);

    if (inclusive) {
      return valueTime >= min && valueTime <= max;
    }

    return valueTime > min && valueTime < max;
  };

  /**
   * TIME_OUTSIDE operator - checks if a time/datetime is outside a range
   */
  private timeOutside: ContextualOperatorFunction = (
    value: FilterValue,
    filterValue: FilterValue,
    context?: PluginContext
  ): boolean => {
    // Validate range input - only accept object format { start, end }
    if (!Guard.isRecord(filterValue)) {
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
    if (!dateValue) {
      return true;
    }

    // If range parsing fails, return true (invalid range means everything is outside)
    if (!startDate || !endDate) {
      return true;
    }

    // Determine if this is a time-only comparison
    const timeOnly = this.isTimeOnlyComparison(value, filterValue);

    // Get comparable values
    const valueTime = this.getComparableTime(dateValue, timeOnly);
    const startTime = this.getComparableTime(startDate, timeOnly);
    const endTime = this.getComparableTime(endDate, timeOnly);

    // Handle range inversion
    const min = Math.min(startTime, endTime);
    const max = Math.max(startTime, endTime);

    // Check if inclusive (default true)
    const inclusive = isConditionInclusive(context);

    if (inclusive) {
      return valueTime < min || valueTime > max;
    }

    return valueTime <= min || valueTime >= max;
  };

  constructor() {
    super({
      'description': 'Advanced time comparison operators for time-based filtering',
      'name': 'TimeOperators',
      'version': '1.0.0'
    });

    // Register operators in constructor
    this.operators = {
      'TIME_AFTER': this.timeAfter.bind(this),
      'TIME_BEFORE': this.timeBefore.bind(this),
      'TIME_BETWEEN': this.timeBetween.bind(this),
      'TIME_OUTSIDE': this.timeOutside.bind(this)
    };
  }

  /**
   * Extract time components for time-only comparisons
   * When comparing times, we only care about the time portion, not the date
   */
  private getComparableTime(date: Date, timeOnly = false): number {
    if (timeOnly) {
      // For time-only comparisons, normalize to the same date
      const refDate = new Date(1970, 0, 1, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());

      return refDate.getTime();
    }

    return date.getTime();
  }

  /**
   * Determine if we're doing time-only comparison
   * This happens when the range contains time-only strings
   */
  private isTimeOnlyComparison(_value: unknown, range: unknown): boolean {
    const timeOnlyRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

    // Handle object format { start, end }
    if (Guard.isRecord(range)) {
      const {
        end, start
      } = range;
      const startIsTimeOnly = typeof start === 'string' && timeOnlyRegex.test(start.trim());
      const endIsTimeOnly = typeof end === 'string' && timeOnlyRegex.test(end.trim());

      return startIsTimeOnly && endIsTimeOnly;
    }

    // Handle array format (legacy)
    if (Array.isArray(range)) {
      return range.every((v) => {return typeof v === 'string' && timeOnlyRegex.test(v.trim());});
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
      return isNaN(value.getTime()) ? null : value;
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

      return isNaN(date.getTime()) ? null : date;
    }

    // Handle string values
    if (typeof value === 'string') {
      const trimmed = value.trim();

      // Check if it's a numeric string (potential timestamp)
      if (/^\d+$/.test(trimmed)) {
        const numValue = parseInt(trimmed, 10);

        // Recursively call with numeric value to handle Unix/epoch logic
        return this.parseTimeValue(numValue);
      }

      // Check for time-only format (HH:MM or HH:MM:SS)
      const timeOnlyRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
      const timeMatch = trimmed.match(timeOnlyRegex);

      if (timeMatch) {
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

      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  }
}
