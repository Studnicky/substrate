import type { FilterValue } from '../types.js';

/**
 * @module DateOperators
 * @description Date operation implementations for FilterEngine
 */
import { Guard } from '../../guards/Guard.js';
import { parseDate } from '../converters/date.js';

/**
 * Date operation implementations
 */
export class DateOperators {
  /**
   * Checks if a date is between two dates
   * @param {*} value - Value to check
   * @param {*} filterValue - Object with min/max dates
   * @returns {boolean} True if date is within range
   * @throws {Error} If filterValue is not an object with min/max
   */
  static handleBetween(value: FilterValue, filterValue: FilterValue) {
    const dateValue = parseDate(value);

    if (!dateValue) {
      return false;
    }

    if (!Guard.isPlainObject(filterValue)) {
      throw new Error('DATE.BETWEEN requires filter value to be an object with min and max properties');
    }

    const {
      'max': endDate, 'min': startDate
    } = filterValue;
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end) {
      throw new Error('DATE.BETWEEN requires valid min and max date values');
    }

    const timestamp = dateValue.getTime();

    return timestamp >= start.getTime() && timestamp <= end.getTime();
  }

  /**
   * Checks if two dates are equal (strict date comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Date to compare against
   * @returns {boolean} True if dates are exactly equal
   * @throws {Error} If either value cannot be parsed as a date
   */
  static handleEquals(value: FilterValue, filterValue: FilterValue) {
    const date1 = parseDate(value);
    const date2 = parseDate(filterValue);

    if (!date1) {
      throw new Error(`DATE.EQUALS requires value to be a valid date, got ${typeof value}`);
    }
    if (!date2) {
      throw new Error(`DATE.EQUALS requires filter value to be a valid date, got ${typeof filterValue}`);
    }

    return date1.getTime() === date2.getTime();
  }

  /**
   * Checks if two dates are identical (same as equals for dates)
   * @param {*} value - Value to check
   * @param {*} filterValue - Date to compare against
   * @returns {boolean} True if dates are identical
   * @throws {Error} If either value cannot be parsed as a date
   */
  static handleIdentical(value: FilterValue, filterValue: FilterValue) {
    return this.handleEquals(value, filterValue);
  }

  /**
   * Checks if two dates are not equal
   * @param {*} value - Value to check
   * @param {*} filterValue - Date to compare against
   * @returns {boolean} True if dates are not equal
   * @throws {Error} If either value cannot be parsed as a date
   */
  static handleNotEquals(value: FilterValue, filterValue: FilterValue) {
    return !this.handleEquals(value, filterValue);
  }

  /**
   * Checks if two dates are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Date to compare against
   * @returns {boolean} True if dates are not identical
   * @throws {Error} If either value cannot be parsed as a date
   */
  static handleNotIdentical(value: FilterValue, filterValue: FilterValue) {
    return !this.handleEquals(value, filterValue);
  }

  /**
   * Checks if a date is outside two dates
   * @param {*} value - Value to check
   * @param {*} filterValue - Object with min/max dates
   * @returns {boolean} True if date is outside range
   * @throws {Error} If filterValue is not an object with min/max
   */
  static handleOutside(value: FilterValue, filterValue: FilterValue) {
    const dateValue = parseDate(value);

    if (!dateValue) {
      return false;
    }

    if (!Guard.isPlainObject(filterValue)) {
      throw new Error('DATE.OUTSIDE requires filter value to be an object with min and max properties');
    }

    const {
      'max': endDate, 'min': startDate
    } = filterValue;
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end) {
      throw new Error('DATE.OUTSIDE requires valid min and max date values');
    }

    const timestamp = dateValue.getTime();

    return timestamp < start.getTime() || timestamp > end.getTime();
  }
}
