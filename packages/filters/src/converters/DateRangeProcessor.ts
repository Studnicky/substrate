/**
 * @module DateRangeProcessor
 * @description Process date range values for comparison
 */

import { DateParser } from './DateParser.js';

/**
 * Process date range values for comparison
 */
export class DateRangeProcessor {
  /**
   * Process date range values for comparison
   * @param {*} value - Value to check
   * @param {Array} filterValue - Range values [start, end]
   * @returns {Object|null} Processed date info {dateTime, minimum, maximum} or null if invalid
   */
  static processDateRange(value: unknown, filterValue: unknown): { 'dateTime': number;
    'maximum': number
    'minimum': number; } | null {
    const [
      rangeStart,
      rangeEnd
    ]: unknown[] = Array.isArray(filterValue) ? filterValue as unknown[] : [
      undefined,
      undefined
    ];
    const dateValue = DateParser.parseDate(value);
    const startDate = DateParser.parseDate(rangeStart);
    const endDate = DateParser.parseDate(rangeEnd);

    if (dateValue === null || startDate === null || endDate === null) {
      return null;
    }

    const dateTime = dateValue.getTime();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    const result = {
      'dateTime': dateTime,
      'maximum': startTime > endTime ? startTime : endTime,
      'minimum': startTime < endTime ? startTime : endTime
    };


    return result;
  }
}
