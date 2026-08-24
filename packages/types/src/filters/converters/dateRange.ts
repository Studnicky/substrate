/**
 * @module DateRangeProcessor
 * @description Process date range values for comparison
 */

import { DateParser } from './date.js';

/**
 * Process date range values for comparison
 */
export class DateRangeProcessor {
  /**
   * Process date range values for comparison
   * @param {*} value - Value to check
   * @param {Array} filterValue - Range values [start, end]
   * @returns {Object|null} Processed date info {dateTime, min, max} or null if invalid
   */
  static processDateRange(value: unknown, filterValue: unknown): { 'dateTime': number;
    'max': number
    'min': number; } | null {
    const [
      rangeStart,
      rangeEnd
    ] = Array.isArray(filterValue) ? filterValue : [
      undefined,
      undefined
    ];
    const dateValue = DateParser.parseDate(value);
    const startDate = DateParser.parseDate(rangeStart);
    const endDate = DateParser.parseDate(rangeEnd);

    if (!dateValue || !startDate || !endDate) {
      return null;
    }

    const dateTime = dateValue.getTime();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    const result = {
      'dateTime': dateTime,
      'max': startTime > endTime ? startTime : endTime,
      'min': startTime < endTime ? startTime : endTime
    };


    return result;
  }
}
