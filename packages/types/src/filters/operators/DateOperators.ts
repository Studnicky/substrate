import type { FilterValueEntity } from '../FilterValueEntity.js';

/**
 * @module DateOperators
 * @description Date operation implementations for FilterEngine
 */
import { Predicates } from '../../predicates/Predicates.js';
import { DateParser } from '../converters/DateParser.js';

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
  static handleBetween(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const dateValue = DateParser.parseDate(value);

    if (dateValue === null) {
      return false;
    }

    if (!Predicates.isPlainObject(filterValue)) {
      throw new Error('DATE.BETWEEN requires filter value to be an object with min and max properties');
    }

    const endDate = filterValue.max;
    const startDate = filterValue.min;
    const start = DateParser.parseDate(startDate);
    const end = DateParser.parseDate(endDate);

    if (start === null || end === null) {
      throw new Error('DATE.BETWEEN requires valid min and max date values');
    }

    const timestamp = dateValue.getTime();
    const result = timestamp >= start.getTime() && timestamp <= end.getTime();

    return result;
  }

  /**
   * Checks if two dates are equal (strict date comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Date to compare against
   * @returns {boolean} True if dates are exactly equal
   * @throws {Error} If either value cannot be parsed as a date
   */
  static handleEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const date1 = DateParser.parseDate(value);
    const date2 = DateParser.parseDate(filterValue);

    if (date1 === null) {
      throw new Error(`DATE.EQUALS requires value to be a valid date, got ${typeof value}`);
    }
    if (date2 === null) {
      throw new Error(`DATE.EQUALS requires filter value to be a valid date, got ${typeof filterValue}`);
    }

    const result = date1.getTime() === date2.getTime();

    return result;
  }

  /**
   * Checks if two dates are identical (same as equals for dates)
   * @param {*} value - Value to check
   * @param {*} filterValue - Date to compare against
   * @returns {boolean} True if dates are identical
   * @throws {Error} If either value cannot be parsed as a date
   */
  static handleIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const areEqual = this.handleEquals(value, filterValue);

    return areEqual;
  }

  /**
   * Checks if two dates are not equal
   * @param {*} value - Value to check
   * @param {*} filterValue - Date to compare against
   * @returns {boolean} True if dates are not equal
   * @throws {Error} If either value cannot be parsed as a date
   */
  static handleNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const areEqual = this.handleEquals(value, filterValue);
    const result = !areEqual;

    return result;
  }

  /**
   * Checks if two dates are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Date to compare against
   * @returns {boolean} True if dates are not identical
   * @throws {Error} If either value cannot be parsed as a date
   */
  static handleNotIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const areEqual = this.handleEquals(value, filterValue);
    const result = !areEqual;

    return result;
  }

  /**
   * Checks if a date is outside two dates
   * @param {*} value - Value to check
   * @param {*} filterValue - Object with min/max dates
   * @returns {boolean} True if date is outside range
   * @throws {Error} If filterValue is not an object with min/max
   */
  static handleOutside(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const dateValue = DateParser.parseDate(value);

    if (dateValue === null) {
      return false;
    }

    if (!Predicates.isPlainObject(filterValue)) {
      throw new Error('DATE.OUTSIDE requires filter value to be an object with min and max properties');
    }

    const endDate = filterValue.max;
    const startDate = filterValue.min;
    const start = DateParser.parseDate(startDate);
    const end = DateParser.parseDate(endDate);

    if (start === null || end === null) {
      throw new Error('DATE.OUTSIDE requires valid min and max date values');
    }

    const timestamp = dateValue.getTime();
    const result = timestamp < start.getTime() || timestamp > end.getTime();

    return result;
  }
}
