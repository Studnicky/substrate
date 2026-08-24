/**
 * @module extractTimeComponents
 * @description Extract time components from date values
 */

import { parseDate } from '../converters/date.js';

/**
 * Extracts time components from a date for time-only comparisons
 * @param {Date|string|number} value - Date value
 * @param {Logger} [logger] - Optional logger instance (defaults to console)
 * @returns {Object|null} Time components {hours, minutes, seconds, totalMinutes} or null
 */
function extractTimeComponents(value: Date | string | number): { 'hours': number;
  'minutes': number;
  'seconds': number;
  'totalMinutes': number } | null {
  const date = parseDate(value);

  if (!date) {
    return null;
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const totalMinutes = (hours << 6) - (hours << 2) + minutes;

  const result = {
    'hours': hours,
    'minutes': minutes,
    'seconds': seconds,
    'totalMinutes': totalMinutes
  };

  return result;
}

export { extractTimeComponents };
