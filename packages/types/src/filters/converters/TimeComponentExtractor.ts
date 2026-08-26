/**
 * @module TimeComponentExtractor
 * @description Extract time components from date values
 */

import { DateParser } from './DateParser.js';

/**
 * Extract time components from date values
 */
export class TimeComponentExtractor {
  /**
   * Extracts time components from a date for time-only comparisons
   * @param {Date|string|number} value - Date value
   * @returns {Object|null} Time components {hours, minutes, seconds, totalMinutes} or null
   */
  static extractTimeComponents(value: Date | string | number): { 'hours': number;
    'minutes': number;
    'seconds': number;
    'totalMinutes': number } | null {
    const date = DateParser.parseDate(value);

    if (date === null) {
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
}
