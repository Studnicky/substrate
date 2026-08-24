/**
 * @module processDateRange
 * @description Process date range values for comparison
 */

import { parseDate } from '../converters/date.js';

/**
 * Process date range values for comparison
 * @param {*} value - Value to check
 * @param {Array} filterValue - Range values [start, end]
 * @param {Logger} [logger] - Optional logger instance (defaults to console)
 * @returns {Object|null} Processed date info {dateTime, min, max} or null if invalid
 */
function processDateRange(value: unknown, filterValue: unknown): { 'dateTime': number;
  'max': number
  'min': number; } | null {
  const [
    rangeStart,
    rangeEnd
  ] = Array.isArray(filterValue) ? filterValue : [
    undefined,
    undefined
  ];
  const dateValue = parseDate(value);
  const startDate = parseDate(rangeStart);
  const endDate = parseDate(rangeEnd);

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

export { processDateRange };
