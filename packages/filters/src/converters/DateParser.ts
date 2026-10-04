/**
 * @module DateParser
 * @description Date parsing with multiple format support
 */

import { TIME_ONLY_PATTERN } from '@studnicky/types/browser';

import { INTEGER_STRING_PATTERN } from './constants/IntegerStringPattern.js';

/**
 * Date parsing with multiple format support
 */
export class DateParser {
  /**
   * Parses a date value with support for multiple formats
   * @param {*} value - Date value (string, number, Date object)
   * @returns {Date|null} Parsed Date object or null if invalid
   */
  static parseDate(value: unknown): Date | null {
    // Handle null, undefined, and other falsy primitives
    if (value === null || value === undefined || value === false || value === '') {
      return null;
    }

    if (value instanceof Date) {
      const result = DateParser.parseDateInstance(value);

      return result;
    }

    if (typeof value === 'number') {
      const result = DateParser.parseNumericTimestamp(value);

      return result;
    }

    if (typeof value === 'string') {
      const result = DateParser.parseStringDate(value);

      return result;
    }

    // Reject all other types (objects, arrays, functions, symbols, bigints, etc.)
    return null;
  }

  private static parseDateInstance(value: Date): Date | null {
    const timeValue = value.getTime();

    if (Number.isNaN(timeValue)) {
      return null;
    }

    return value;
  }

  private static parseNumericTimestamp(value: number): Date | null {
    if (!Number.isFinite(value)) {
      return null;
    }

    // Distinguish between Unix timestamps (seconds) and epoch timestamps (milliseconds)
    // Unix timestamps are typically 10 digits (until year 2286)
    // Epoch milliseconds are typically 13 digits (until year 2286)
    // We'll consider anything less than 10000000000 as Unix timestamp (seconds)
    // This covers dates from 1970-01-01 to 2286-11-20
    const timestamp = Math.abs(value) < 10000000000 ? value * 1000 : value;
    const date = new Date(timestamp);
    const timeValue = date.getTime();

    if (Number.isNaN(timeValue)) {
      return null;
    }

    return date;
  }

  private static parseStringDate(value: string): Date | null {
    if (value.trim() === '') {
      return null;
    }

    const trimmedValue = value.trim();

    // Check if it's a numeric string (potential timestamp)
    if (INTEGER_STRING_PATTERN.test(trimmedValue)) {
      const numberValue = parseInt(trimmedValue, 10);

      // Recursively call with numeric value to handle Unix/epoch logic
      const result = DateParser.parseDate(numberValue);

      return result;
    }

    const timeOnlyResult = DateParser.parseTimeOnlyString(trimmedValue);

    if (timeOnlyResult !== undefined) {
      return timeOnlyResult;
    }

    // Try regular date parsing
    const date = new Date(trimmedValue);
    const timeValue = date.getTime();

    if (Number.isNaN(timeValue)) {
      return null;
    }

    return date;
  }

  /** `undefined` means `trimmedValue` isn't a time-only string, so the caller falls through to general date parsing. */
  private static parseTimeOnlyString(trimmedValue: string): Date | null | undefined {
    // Check for time-only strings (HH:MM or HH:MM:SS format)
    const timeMatch = TIME_ONLY_PATTERN.exec(trimmedValue);

    if (timeMatch === null) {
      return undefined;
    }

    const hours = parseInt(timeMatch[1] ?? '0', 10);
    const minutes = parseInt(timeMatch[2] ?? '0', 10);
    const seconds = timeMatch[3] !== undefined ? parseInt(timeMatch[3], 10) : 0;

    // Validate time components
    if (DateParser.isValidTimeComponents(hours, minutes, seconds)) {
      // Create a date object using TODAY's date and the specified time
      const today = new Date();
      const date = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        hours,
        minutes,
        seconds,
        0 // milliseconds
      );

      return date;
    }

    // Invalid time components - return null, don't fall through
    return null;
  }

  private static isValidTimeComponents(hours: number, minutes: number, seconds: number): boolean {
    const result = hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59;

    return result;
  }
}
