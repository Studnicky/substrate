
import { Predicates } from '#runtime';

import type { FilterValueEntity } from '../../FilterValueEntity.js';
import type { FilterConditionInterface } from '../../interfaces.js';

import { DateParser } from '../../converters/DateParser.js';
import { FilterOperatorError } from '../../errors/FilterOperatorError.js';

/**
 * Date-typed operator implementations
 */
export class DateOperators {
  static dateBetween(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    // Convert value to Date using parseDate converter (handles Unix/epoch timestamps)
    const dateValue = DateParser.parseDate(value);

    // Check if date is valid
    if (dateValue === null) {
      return false;
    }

    const range = DateOperators.parseDateRange(
      filterValue,
      'DATE.BETWEEN requires filterValue to be an object with min and max properties: { min: date, max: date }'
    );

    if (range === null) {
      return false;
    }

    const timestamp = dateValue.getTime();

    // Handle reversed ranges (max < min) - when reversed, all dates are considered "between"
    if (range.endTime < range.startTime) {
      return true;
    }

    // Default to inclusive unless explicitly set to false
    const inclusive = options?.condition?.inclusive !== false;

    const result = inclusive
      ? (timestamp >= range.startTime && timestamp <= range.endTime)
      : (timestamp > range.startTime && timestamp < range.endTime);

    return result;
  }

  static dateOutside(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    // Convert value to Date using parseDate converter (handles Unix/epoch timestamps)
    const dateValue = DateParser.parseDate(value);

    // Check if date is valid - invalid dates are considered "outside" any range
    if (dateValue === null) {
      return true;
    }

    const range = DateOperators.parseDateRange(
      filterValue,
      'DATE.OUTSIDE requires filterValue to be an object with min and max properties: { min: date, max: date }'
    );

    if (range === null) {
      return false;
    }

    const timestamp = dateValue.getTime();

    // Handle reversed ranges (max < min) - when reversed, no dates are considered "outside"
    if (range.endTime < range.startTime) {
      return false;
    }

    // Default to inclusive unless explicitly set to false
    const inclusive = options?.condition?.inclusive !== false;

    const result = inclusive
      ? (timestamp < range.startTime || timestamp > range.endTime)
      : (timestamp <= range.startTime || timestamp >= range.endTime);

    return result;
  }

  /** Enforces object format `{ min, max }` (both resolving to valid dates), throwing `typeErrorMessage` on shape mismatch; `null` on invalid dates. */
  private static parseDateRange(filterValue: FilterValueEntity.Type, typeErrorMessage: string): { 'endTime': number, 'startTime': number } | null {
    const record = DateOperators.assertDateRangeShape(filterValue, typeErrorMessage);
    const startDate: unknown = Reflect.get(record, 'min');
    const endDate: unknown = Reflect.get(record, 'max');
    const start = DateParser.parseDate(startDate);
    const end = DateParser.parseDate(endDate);

    // Check if dates are valid
    if (start === null || end === null) {
      return null;
    }

    return { 'endTime': end.getTime(), 'startTime': start.getTime() };
  }

  private static assertDateRangeShape(filterValue: FilterValueEntity.Type, typeErrorMessage: string): Record<string, unknown> {
    // Enforce object format { min, max } only
    if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue)) {
      throw new FilterOperatorError(typeErrorMessage, {});
    }

    if (!Predicates.isRecord(filterValue)) {
      throw new FilterOperatorError('DATE range requires filterValue to be an object with min and max properties: { min: date, max: date }', {});
    }

    return filterValue;
  }

  static dateEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    const date1 = DateParser.parseDate(value);
    const date2 = DateParser.parseDate(filterValue);

    if (date1 === null || date2 === null) {
      return false;
    }

    const result = date1.getTime() === date2.getTime();

    return result;
  }

  static dateNotEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    const result = !DateOperators.dateEquals(value, filterValue);

    return result;
  }
}
