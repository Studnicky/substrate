/**
 * Comparison operators with direct function access for declarative configuration
 */

import type { FilterValueEntity } from '../FilterValueEntity.js';
import type {
  FilterConditionInterface, OperatorFunctionInterface
} from '../interfaces.js';

import { Predicates } from '../../predicates/Predicates.js';
import { DateParser } from '../converters/DateParser.js';
import { BinaryOperators } from '../operators/BinaryOperators.js';
import { ObjectOperators } from '../operators/ObjectOperators.js';
import { DeepFreeze } from '../utils/deepFreeze.js';
import { WHITESPACE_PATTERN } from './constants/WhitespacePattern.js';

/**
 * Shared deep-equality comparison used by IDENTICAL-style operators
 */
class ComparisonOperators {
  static deepEqual(a: unknown, b: unknown, visited?: WeakSet<object>): boolean {
    if (a === b) {
      return true;
    }

    // Handle null/undefined
    if (a === null || a === undefined || b === null || b === undefined) {
      const result = a === b;

      return result;
    }

    // Handle different types
    if (typeof a !== typeof b) {
      return false;
    }

    // Handle primitives
    if (typeof a !== 'object') {
      const result = a === b;

      return result;
    }

    // Initialize visited set for circular reference detection
    const visitedSet = visited ?? new WeakSet();

    // Check for circular references
    if (visitedSet.has(a) || visitedSet.has(b)) {
      // For circular references, consider them equal if they're the same reference
      const result = a === b;

      return result;
    }

    // Add objects to visited set
    visitedSet.add(a);
    visitedSet.add(b);

    try {
      // Handle Dates
      if (a instanceof Date && b instanceof Date) {
        const result = a.getTime() === b.getTime();

        return result;
      }

      // Handle RegExp
      if (a instanceof RegExp && b instanceof RegExp) {
        const result = a.source === b.source && a.flags === b.flags;

        return result;
      }

      // Handle Arrays
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
          return false;
        }
        for (let i = 0; i < a.length; i++) {
          if (!ComparisonOperators.deepEqual(a[i], b[i], visitedSet)) {
            return false;
          }
        }

        return true;
      }

      // Handle Sets
      if (a instanceof Set && b instanceof Set) {
        if (a.size !== b.size) {
          return false;
        }
        for (const item of a) {
          if (!b.has(item)) {
            return false;
          }
        }

        return true;
      }

      // Handle Maps
      if (a instanceof Map && b instanceof Map) {
        if (a.size !== b.size) {
          return false;
        }
        for (const [
          key,
          value
        ] of a) {
          if (!b.has(key) || !ComparisonOperators.deepEqual(value, b.get(key), visitedSet)) {
            return false;
          }
        }

        return true;
      }

      // Handle plain objects
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) {
        return false;
      }

      const keysBSet = new Set(keysB);

      for (let index = 0; index < keysA.length; index++) {
        const key = keysA[index]!;

        if (!keysBSet.has(key)) {
          return false;
        }
        if (!ComparisonOperators.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], visitedSet)) {
          return false;
        }
      }

      return true;
    } finally {
      // Clean up visited set (objects will be automatically removed when out of scope)
      visitedSet.delete(a);
      visitedSet.delete(b);
    }
  }
}

/**
 * Array-typed operator implementations
 */
class ArrayOperators {
  static arrayIncludes(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new Error(`ARRAY.INCLUDES requires value to be an array, got ${typeof value}`);
    }

    const result = (value as unknown[]).includes(filterValue);

    return result;
  }

  static arrayExcludes(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new Error(`ARRAY.EXCLUDES requires value to be an array, got ${typeof value}`);
    }

    const result = !(value as unknown[]).includes(filterValue);

    return result;
  }

  static arrayLength(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new Error(`ARRAY.LENGTH requires value to be an array, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`ARRAY.LENGTH requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = value.length === filterValue;

    return result;
  }

  static arrayEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!Array.isArray(value)) {
      throw new Error(`ARRAY.EMPTY requires value to be an array, got ${typeof value}`);
    }

    const result = value.length === 0;

    return result;
  }

  static arrayIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new Error(`ARRAY.IDENTICAL requires value to be an array, got ${typeof value}`);
    }
    if (!Array.isArray(filterValue)) {
      throw new Error(`ARRAY.IDENTICAL requires filter value to be an array, got ${typeof filterValue}`);
    }

    const result = ComparisonOperators.deepEqual(value, filterValue);

    return result;
  }

  static arrayNotEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!Array.isArray(value)) {
      throw new Error(`ARRAY.NOT_EMPTY requires value to be an array, got ${typeof value}`);
    }

    const result = value.length > 0;

    return result;
  }

  static arrayEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new Error(`ARRAY.EQUALS requires value to be an array, got ${typeof value}`);
    }
    if (!Array.isArray(filterValue)) {
      throw new Error(`ARRAY.EQUALS requires filter value to be an array, got ${typeof filterValue}`);
    }

    const result = value === filterValue;

    return result;
  }

  static arrayNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new Error(`ARRAY.NOT_EQUALS requires value to be an array, got ${typeof value}`);
    }
    if (!Array.isArray(filterValue)) {
      throw new Error(`ARRAY.NOT_EQUALS requires filter value to be an array, got ${typeof filterValue}`);
    }

    const result = value !== filterValue;

    return result;
  }

  static arrayNotIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new Error(`ARRAY.NOT_IDENTICAL requires value to be an array, got ${typeof value}`);
    }
    if (!Array.isArray(filterValue)) {
      throw new Error(`ARRAY.NOT_IDENTICAL requires filter value to be an array, got ${typeof filterValue}`);
    }

    const result = !ComparisonOperators.deepEqual(value, filterValue);

    return result;
  }

  // Array similarity using Jaccard index
  static calculateArraySimilarity(value1: unknown[], value2: unknown[]): number {
    if (value1.length === 0 && value2.length === 0) {
      return 1;
    }
    if (value1.length === 0 || value2.length === 0) {
      return 0;
    }

    const setA = new Set(value1.map((item) => {
      const serialized = JSON.stringify(item);

      return serialized;
    }));
    const setB = new Set(value2.map((item) => {
      const serialized = JSON.stringify(item);

      return serialized;
    }));

    const intersection = new Set([...setA].filter((entry) => {
      const isShared = setB.has(entry);

      return isShared;
    }));
    const union = new Set([
      ...setA,
      ...setB
    ]);

    const similarity = intersection.size / union.size; // Jaccard similarity

    return similarity;
  }

  static arraySimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!Array.isArray(value)) {
      throw new Error(`ARRAY.SIMILARITY requires value to be an array, got ${typeof value}`);
    }
    if (!Array.isArray(filterValue)) {
      throw new Error(`ARRAY.SIMILARITY requires filter value to be an array, got ${typeof filterValue}`);
    }
    if (typeof options?.condition?.threshold !== 'number') {
      throw new Error('ARRAY.SIMILARITY requires a numeric threshold parameter');
    }

    const threshold = options.condition.threshold;

    if (value.length === 0 && filterValue.length === 0) {
      return true;
    }
    if (value.length === 0 || filterValue.length === 0) {
      const result = 0 >= threshold;

      return result;
    }

    const similarity = ArrayOperators.calculateArraySimilarity(value, filterValue);
    const result = similarity >= threshold;

    return result;
  }
}

/**
 * String-typed operator implementations
 */
class StringOperators {
  static stringContains(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.CONTAINS requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.CONTAINS requires filter value to be a string, got ${typeof filterValue}`);
    }

    // Default to case-sensitive if not specified
    const caseSensitive = options?.condition?.caseSensitive ?? true;

    const targetValue = caseSensitive ? value : value.toLowerCase();
    const compareValue = caseSensitive ? filterValue : filterValue.toLowerCase();

    const result = targetValue.includes(compareValue);

    return result;
  }

  static stringExcludes(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.EXCLUDES requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.EXCLUDES requires filter value to be a string, got ${typeof filterValue}`);
    }

    // Default to case-sensitive if not specified
    const caseSensitive = options?.condition?.caseSensitive ?? true;

    const targetValue = caseSensitive ? value : value.toLowerCase();
    const compareValue = caseSensitive ? filterValue : filterValue.toLowerCase();

    const result = !targetValue.includes(compareValue);

    return result;
  }

  static stringStartsWith(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.STARTS_WITH requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.STARTS_WITH requires filter value to be a string, got ${typeof filterValue}`);
    }

    // Default to case-sensitive if not specified
    const caseSensitive = options?.condition?.caseSensitive ?? true;

    const targetValue = caseSensitive ? value : value.toLowerCase();
    const compareValue = caseSensitive ? filterValue : filterValue.toLowerCase();

    const result = targetValue.startsWith(compareValue);

    return result;
  }

  static stringEndsWith(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.ENDS_WITH requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.ENDS_WITH requires filter value to be a string, got ${typeof filterValue}`);
    }

    // Default to case-sensitive if not specified
    const caseSensitive = options?.condition?.caseSensitive ?? true;

    const targetValue = caseSensitive ? value : value.toLowerCase();
    const compareValue = caseSensitive ? filterValue : filterValue.toLowerCase();

    const result = targetValue.endsWith(compareValue);

    return result;
  }

  static stringRegex(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.REGEX requires value to be a string, got ${typeof value}`);
    }

    // REGEX operator expects compiled RegExp objects only for performance
    if (!(filterValue instanceof RegExp)) {
      throw new Error('REGEX operator requires a pre-compiled RegExp object. Example: new RegExp("\\\\p{Emoji}", "u")');
    }

    const result = filterValue.test(value);

    return result;
  }

  static stringLength(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.LENGTH requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`STRING.LENGTH requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = value.length === filterValue;

    return result;
  }

  static stringEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.EMPTY requires value to be a string, got ${typeof value}`);
    }

    const result = value.length === 0;

    return result;
  }

  static stringNotEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.NOT_EMPTY requires value to be a string, got ${typeof value}`);
    }

    const result = value.length > 0;

    return result;
  }

  static stringWordCount(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.WORD_COUNT requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`STRING.WORD_COUNT requires filter value to be a number, got ${typeof filterValue}`);
    }

    // Split by whitespace and filter out empty strings
    const words = value.trim().split(WHITESPACE_PATTERN)
      .filter((word) => {
        const isNonEmpty = word.length > 0;

        return isNonEmpty;
      });

    const result = words.length === filterValue;

    return result;
  }

  static stringEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.EQUALS requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.EQUALS requires filter value to be a string, got ${typeof filterValue}`);
    }

    const result = value === filterValue;

    return result;
  }

  static stringNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.NOT_EQUALS requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.NOT_EQUALS requires filter value to be a string, got ${typeof filterValue}`);
    }

    const result = value !== filterValue;

    return result;
  }

  // Levenshtein distance calculation for string similarity
  static calculateStringSimilarity(string1: string, string2: string): number {
    const matrix: number[][] = Array<number[]>(string2.length + 1).fill([])
      .map(() => {
        const row = Array<number>(string1.length + 1).fill(0);

        return row;
      });

    for (let i = 0; i <= string1.length; i += 1) {
      matrix[0]![i] = i;
    }

    for (let j = 0; j <= string2.length; j += 1) {
      matrix[j]![0] = j;
    }

    for (let j = 1; j <= string2.length; j += 1) {
      for (let i = 1; i <= string1.length; i += 1) {
        const indicator = string1[i - 1] === string2[j - 1] ? 0 : 1;

        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1,
          matrix[j - 1]![i]! + 1,
          matrix[j - 1]![i - 1]! + indicator
        );
      }
    }

    const distance = matrix[string2.length]![string1.length]!;

    return distance;
  }

  // String similarity using Levenshtein distance
  static stringSimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'string') {
      throw new Error(`STRING.SIMILARITY requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.SIMILARITY requires filter value to be a string, got ${typeof filterValue}`);
    }
    if (typeof options?.condition?.threshold !== 'number') {
      throw new Error('STRING.SIMILARITY requires a numeric threshold parameter');
    }

    const threshold = options.condition.threshold;
    const caseSensitive = options?.condition?.caseSensitive ?? true;

    const targetValue = caseSensitive ? value : value.toLowerCase();
    const compareValue = caseSensitive ? filterValue : filterValue.toLowerCase();

    const distance = StringOperators.calculateStringSimilarity(targetValue, compareValue);
    const maximumLength = Math.max(targetValue.length, compareValue.length);
    const similarity = maximumLength === 0 ? 1 : 1 - (distance / maximumLength);

    const result = similarity >= threshold;

    return result;
  }
}

/**
 * Number-typed operator implementations
 */
class NumberOperators {
  static numberGreater(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.GREATER requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.GREATER requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = value > filterValue;

    return result;
  }

  static numberGreaterEqual(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.GREATER_EQUAL requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.GREATER_EQUAL requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = value >= filterValue;

    return result;
  }

  static numberLess(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.LESS requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.LESS requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = value < filterValue;

    return result;
  }

  static numberLessEqual(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.LESS_EQUAL requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.LESS_EQUAL requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = value <= filterValue;

    return result;
  }

  static numberBetween(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    // NUMBER.BETWEEN should only handle numeric values
    // Time/date comparisons should use DATE.BETWEEN or TimeOperatorsPlugin

    // Only handle numeric values
    if (typeof value !== 'number') {
      return false;
    }

    // Enforce object format { min, max } only
    if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue)) {
      throw new Error('NUMBER.BETWEEN requires filterValue to be an object with min and max properties: { min: number, max: number }');
    }

    if (!Predicates.isRecord(filterValue)) {
      throw new Error('NUMBER.BETWEEN requires filterValue to be an object with min and max properties: { min: number, max: number }');
    }
    let minimum = Number(Reflect.get(filterValue, 'min'));
    let maximum = Number(Reflect.get(filterValue, 'max'));

    // Validate numbers
    if (isNaN(minimum) || isNaN(maximum)) {
      return false;
    }

    // Handle Infinity
    if (!isFinite(minimum)) {
      minimum = -Infinity;
    }
    if (!isFinite(maximum)) {
      maximum = Infinity;
    }

    // Default to inclusive unless explicitly set to false
    const inclusive = options?.condition?.inclusive !== false;

    const result = inclusive
      ? (value >= minimum && value <= maximum)
      : (value > minimum && value < maximum);

    return result;
  }

  static numberOutside(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    // NUMBER.OUTSIDE should only handle numeric values
    // Time/date comparisons should use DATE.OUTSIDE or TimeOperatorsPlugin

    // Only handle numeric values
    if (typeof value !== 'number') {
      return false;
    }

    // Enforce object format { min, max } only
    if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue)) {
      throw new Error('NUMBER.OUTSIDE requires filterValue to be an object with min and max properties: { min: number, max: number }');
    }

    if (!Predicates.isRecord(filterValue)) {
      throw new Error('NUMBER.OUTSIDE requires filterValue to be an object with min and max properties: { min: number, max: number }');
    }
    let minimum = Number(Reflect.get(filterValue, 'min'));
    let maximum = Number(Reflect.get(filterValue, 'max'));

    // Validate numbers
    if (isNaN(minimum) || isNaN(maximum)) {
      return false;
    }

    // Handle Infinity
    if (!isFinite(minimum)) {
      minimum = -Infinity;
    }
    if (!isFinite(maximum)) {
      maximum = Infinity;
    }

    // Default to inclusive unless explicitly set to false
    const inclusive = options?.condition?.inclusive !== false;

    const result = inclusive
      ? (value < minimum || value > maximum)
      : (value <= minimum || value >= maximum);

    return result;
  }

  static numberModulo(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    // Only work with numbers - no type coercion
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.MODULO requires value to be a number, got ${typeof value}`);
    }

    // Only accept object format { divisor, remainder }
    if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue)) {
      throw new Error(`NUMBER.MODULO requires filter value to be an object with divisor and remainder properties, got ${typeof filterValue}`);
    }

    if (!Predicates.isRecord(filterValue)) {
      throw new Error(`NUMBER.MODULO requires filter value to be an object with divisor and remainder properties, got ${typeof filterValue}`);
    }

    const divisor: unknown = Reflect.get(filterValue, 'divisor');
    const remainder: unknown = Reflect.get(filterValue, 'remainder');

    // Both must be numbers
    if (!Predicates.isNumber(divisor) || !Predicates.isNumber(remainder)) {
      return false;
    }

    if (isNaN(value) || isNaN(divisor) || isNaN(remainder) || divisor === 0) {
      return false;
    }

    // Optimized modulo for power-of-2 divisors
    if (divisor > 0 && (divisor & (divisor - 1)) === 0) {
      const result = (value & (divisor - 1)) === remainder;

      return result;
    }

    const result = value % divisor === remainder;

    return result;
  }

  static numberEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.EQUALS requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.EQUALS requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = value === filterValue;

    return result;
  }

  static numberNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.NOT_EQUALS requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.NOT_EQUALS requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = value !== filterValue;

    return result;
  }

  // Numeric similarity based on relative difference
  static calculateNumericSimilarity(value1: number, value2: number): number {
    if (value1 === value2) {
      return 1;
    }
    if (Number.isNaN(value1) && Number.isNaN(value2)) {
      return 1;
    }
    if (Number.isNaN(value1) || Number.isNaN(value2)) {
      return 0;
    }
    if (!Number.isFinite(value1) || !Number.isFinite(value2)) {
      const result = (value1 === value2) ? 1 : 0;

      return result;
    }

    const maximum = Math.max(Math.abs(value1), Math.abs(value2));

    if (maximum === 0) {
      return 1;
    } // Both are zero

    const diff = Math.abs(value1 - value2);
    const similarity = Math.max(0, 1 - (diff / maximum));

    return similarity;
  }

  // Number similarity using relative difference
  static numberSimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.SIMILARITY requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.SIMILARITY requires filter value to be a number, got ${typeof filterValue}`);
    }
    if (typeof options?.condition?.threshold !== 'number') {
      throw new Error('NUMBER.SIMILARITY requires a numeric threshold parameter');
    }

    const threshold = options.condition.threshold;
    const similarity = NumberOperators.calculateNumericSimilarity(value, filterValue);

    const result = similarity >= threshold;

    return result;
  }
}

/**
 * Date-typed operator implementations
 */
class DateOperators {
  static dateBetween(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    // Convert value to Date using parseDate converter (handles Unix/epoch timestamps)
    const dateValue = DateParser.parseDate(value);

    // Check if date is valid
    if (dateValue === null) {
      return false;
    }

    // Enforce object format { min, max } only
    if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue)) {
      throw new Error('DATE.BETWEEN requires filterValue to be an object with min and max properties: { min: date, max: date }');
    }

    if (!Predicates.isRecord(filterValue)) {
      throw new Error('DATE range requires filterValue to be an object with min and max properties: { min: date, max: date }');
    }
    const startDate: unknown = Reflect.get(filterValue, 'min');
    const endDate: unknown = Reflect.get(filterValue, 'max');

    const start = DateParser.parseDate(startDate);
    const end = DateParser.parseDate(endDate);

    // Check if dates are valid
    if (start === null || end === null) {
      return false;
    }

    const timestamp = dateValue.getTime();
    const startTime = start.getTime();
    const endTime = end.getTime();

    // Handle reversed ranges (max < min) - when reversed, all dates are considered "between"
    if (endTime < startTime) {
      return true;
    }

    // Default to inclusive unless explicitly set to false
    const inclusive = options?.condition?.inclusive !== false;

    const result = inclusive
      ? (timestamp >= startTime && timestamp <= endTime)
      : (timestamp > startTime && timestamp < endTime);

    return result;
  }

  static dateOutside(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    // Convert value to Date using parseDate converter (handles Unix/epoch timestamps)
    const dateValue = DateParser.parseDate(value);

    // Check if date is valid - invalid dates are considered "outside" any range
    if (dateValue === null) {
      return true;
    }

    // Enforce object format { min, max } only
    if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue)) {
      throw new Error('DATE.OUTSIDE requires filterValue to be an object with min and max properties: { min: date, max: date }');
    }

    if (!Predicates.isRecord(filterValue)) {
      throw new Error('DATE range requires filterValue to be an object with min and max properties: { min: date, max: date }');
    }
    const startDate: unknown = Reflect.get(filterValue, 'min');
    const endDate: unknown = Reflect.get(filterValue, 'max');

    const start = DateParser.parseDate(startDate);
    const end = DateParser.parseDate(endDate);

    // Check if dates are valid
    if (start === null || end === null) {
      return false;
    }

    const timestamp = dateValue.getTime();
    const startTime = start.getTime();
    const endTime = end.getTime();

    // Handle reversed ranges (max < min) - when reversed, no dates are considered "outside"
    if (endTime < startTime) {
      return false;
    }

    // Default to inclusive unless explicitly set to false
    const inclusive = options?.condition?.inclusive !== false;

    const result = inclusive
      ? (timestamp < startTime || timestamp > endTime)
      : (timestamp <= startTime || timestamp >= endTime);

    return result;
  }

  static dateEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const date1 = DateParser.parseDate(value);
    const date2 = DateParser.parseDate(filterValue);

    if (date1 === null || date2 === null) {
      return false;
    }

    const result = date1.getTime() === date2.getTime();

    return result;
  }

  static dateNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = !DateOperators.dateEquals(value, filterValue);

    return result;
  }
}

/**
 * Boolean-typed operator implementations
 */
class BooleanOperators {
  static booleanTrue(value: FilterValueEntity.Type): boolean {
    const result = value === true;

    return result;
  }

  static booleanFalse(value: FilterValueEntity.Type): boolean {
    const result = value === false;

    return result;
  }

  static isFalsyValue(value: FilterValueEntity.Type): boolean {
    const result = value === null || value === undefined || value === false
      || value === 0 || value === '' || (typeof value === 'number' && Number.isNaN(value));

    return result;
  }

  static booleanTruthy(value: FilterValueEntity.Type): boolean {
    const result = !BooleanOperators.isFalsyValue(value);

    return result;
  }

  static booleanFalsy(value: FilterValueEntity.Type): boolean {
    const result = value === null || value === undefined || value === false
      || value === 0 || value === '' || (typeof value === 'number' && Number.isNaN(value));

    return result;
  }

  static booleanEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'boolean') {
      throw new Error(`BOOLEAN.EQUALS requires value to be a boolean, got ${typeof value}`);
    }
    if (typeof filterValue !== 'boolean') {
      throw new Error(`BOOLEAN.EQUALS requires filter value to be a boolean, got ${typeof filterValue}`);
    }

    const result = value === filterValue;

    return result;
  }

  static booleanNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'boolean') {
      throw new Error(`BOOLEAN.NOT_EQUALS requires value to be a boolean, got ${typeof value}`);
    }
    if (typeof filterValue !== 'boolean') {
      throw new Error(`BOOLEAN.NOT_EQUALS requires filter value to be a boolean, got ${typeof filterValue}`);
    }

    const result = value !== filterValue;

    return result;
  }

  // Boolean similarity (exact match only)
  static booleanSimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'boolean') {
      throw new Error(`BOOLEAN.SIMILARITY requires value to be a boolean, got ${typeof value}`);
    }
    if (typeof filterValue !== 'boolean') {
      throw new Error(`BOOLEAN.SIMILARITY requires filter value to be a boolean, got ${typeof filterValue}`);
    }
    if (typeof options?.condition?.threshold !== 'number') {
      throw new Error('BOOLEAN.SIMILARITY requires a numeric threshold parameter');
    }

    const threshold = options.condition.threshold;
    const similarity = value === filterValue ? 1 : 0;

    const result = similarity >= threshold;

    return result;
  }
}

/**
 * Set-typed operator implementations
 */
class SetOperators {
  static setHas(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new Error(`SET.HAS requires value to be a Set, got ${typeof value}`);
    }

    const result = Predicates.isString(filterValue) && value.has(filterValue);

    return result;
  }

  static setMissing(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new Error(`SET.MISSING requires value to be a Set, got ${typeof value}`);
    }

    const result = !Predicates.isString(filterValue) || !value.has(filterValue);

    return result;
  }

  static setSize(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new Error(`SET.SIZE requires value to be a Set, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`SET.SIZE requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = value.size === filterValue;

    return result;
  }

  static setEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!(value instanceof Set)) {
      throw new Error(`SET.EMPTY requires value to be a Set, got ${typeof value}`);
    }

    const result = value.size === 0;

    return result;
  }

  static setNotEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!(value instanceof Set)) {
      throw new Error(`SET.NOT_EMPTY requires value to be a Set, got ${typeof value}`);
    }

    const result = value.size > 0;

    return result;
  }

  static setEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new Error(`SET.EQUALS requires value to be a Set, got ${typeof value}`);
    }
    if (!(filterValue instanceof Set)) {
      throw new Error(`SET.EQUALS requires filter value to be a Set, got ${typeof filterValue}`);
    }

    const result = value === filterValue;

    return result;
  }

  static setNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = !SetOperators.setEquals(value, filterValue);

    return result;
  }

  static setIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new Error(`SET.IDENTICAL requires value to be a Set, got ${typeof value}`);
    }
    if (!(filterValue instanceof Set)) {
      throw new Error(`SET.IDENTICAL requires filter value to be a Set, got ${typeof filterValue}`);
    }

    const result = ComparisonOperators.deepEqual(value, filterValue);

    return result;
  }

  static setNotIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = !SetOperators.setIdentical(value, filterValue);

    return result;
  }
}

/**
 * Map-typed operator implementations
 */
class MapOperators {
  static mapEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.EMPTY requires value to be a Map, got ${typeof value}`);
    }

    const result = value.size === 0;

    return result;
  }

  static mapNotEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.NOT_EMPTY requires value to be a Map, got ${typeof value}`);
    }

    const result = value.size > 0;

    return result;
  }

  static mapHas(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.HAS requires value to be a Map, got ${typeof value}`);
    }

    const result = Predicates.isString(filterValue) && value.has(filterValue);

    return result;
  }

  static mapMissing(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.MISSING requires value to be a Map, got ${typeof value}`);
    }

    const result = !Predicates.isString(filterValue) || !value.has(filterValue);

    return result;
  }

  static mapSize(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.SIZE requires value to be a Map, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`MAP.SIZE requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = value.size === filterValue;

    return result;
  }

  static mapEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.EQUALS requires value to be a Map, got ${typeof value}`);
    }
    if (!(filterValue instanceof Map)) {
      throw new Error(`MAP.EQUALS requires filter value to be a Map, got ${typeof filterValue}`);
    }

    const result = value === filterValue;

    return result;
  }

  static mapNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = !MapOperators.mapEquals(value, filterValue);

    return result;
  }

  static mapIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.IDENTICAL requires value to be a Map, got ${typeof value}`);
    }
    if (!(filterValue instanceof Map)) {
      throw new Error(`MAP.IDENTICAL requires filter value to be a Map, got ${typeof filterValue}`);
    }

    const result = ComparisonOperators.deepEqual(value, filterValue);

    return result;
  }

  static mapNotIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = !MapOperators.mapIdentical(value, filterValue);

    return result;
  }
}

/**
 * Cross-type operator implementations, including CROSS.SIMILARITY
 *
 * CROSS.SIMILARITY performs fuzzy matching across all data types with configurable thresholds.
 *
 * SAME-TYPE COMPARISONS (delegates to type-specific operators):
 * - string x string: Levenshtein distance (edit distance)
 * - number x number: Relative difference (1 - |a-b|/max(|a|,|b|))
 * - boolean x boolean: Exact match (1.0 or 0.0)
 * - array x array: Jaccard index (intersection/union)
 * - object x object: Key-value matching ratio
 *
 * CROSS-TYPE COMPARISONS:
 *
 * String x Number:
 * - Converts number to string representation
 * - Applies Levenshtein distance between strings
 * - Example: "123" x 123 = 1.0 (perfect match)
 * - Example: "12.5" x 12.5 = 1.0
 * - Example: "100" x 1000 = 0.75 (one character difference)
 *
 * String x Array:
 * - Compares string against each array element (converted to string)
 * - Returns highest similarity score found
 * - Example: "apple" x ["apple", "orange"] = 1.0
 * - Example: "appl" x ["apple", "application"] = 0.8 (matches "apple")
 *
 * Number x Array:
 * - Compares number against numeric elements in array
 * - Non-numeric elements are attempted to be converted
 * - Returns highest similarity score found
 * - Example: 42 x [41, 42, 43] = 1.0 (exact match)
 * - Example: 10 x [9, 11, "10"] = 1.0 (matches string "10")
 *
 * String x Object:
 * - Converts object to JSON string representation
 * - Applies string similarity between string and JSON
 * - Useful for searching within object structures
 *
 * Boolean x Other:
 * - Converts boolean to string ("true"/"false")
 * - Applies string comparison with other value's string form
 *
 * Null/Undefined Handling:
 * - null x null = 1.0
 * - undefined x undefined = 1.0
 * - null x undefined = 0.0
 * - null/undefined x any other = 0.0
 *
 * Default Fallback (any x any):
 * - Converts both values to strings
 * - Applies Levenshtein distance
 * - Works for any type combination not explicitly handled
 *
 * REQUIRED PARAMETERS:
 * - threshold: number (0.0-1.0) - Minimum similarity score to pass
 *
 * OPTIONAL PARAMETERS:
 * - caseSensitive: boolean (default: true) - For string comparisons
 */
class CrossOperators {
  static valueExists(value: FilterValueEntity.Type): boolean {
    const result = value !== null && value !== undefined;

    return result;
  }

  static valueAbsent(value: FilterValueEntity.Type): boolean {
    const result = value === null || value === undefined;

    return result;
  }

  static valueDefined(value: FilterValueEntity.Type): boolean {
    const result = value !== undefined;

    return result;
  }

  static valueUndefined(value: FilterValueEntity.Type): boolean {
    const result = value === undefined;

    return result;
  }

  static valueNull(value: FilterValueEntity.Type): boolean {
    const result = value === null;

    return result;
  }

  static valueNotNull(value: FilterValueEntity.Type): boolean {
    const result = value !== null;

    return result;
  }

  static crossEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = value === filterValue;

    return result;
  }

  static crossNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = value !== filterValue;

    return result;
  }

  static valueType(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof filterValue !== 'string') {
      throw new Error(`CROSS.TYPE requires filter value to be a string, got ${typeof filterValue}`);
    }
    if (value === null) {
      const result = filterValue === 'null';

      return result;
    }
    if (value === undefined) {
      const result = filterValue === 'undefined';

      return result;
    }

    // Handle primitive types (string, number, boolean, bigint, symbol)
    const primitiveType = typeof value;

    if (primitiveType !== 'object') {
      const result = primitiveType === filterValue;

      return result;
    }

    // For objects, check both primitive type ('object') and constructor name
    if (value !== null) {
      // Check for common type aliases (lowercase)
      if (filterValue === 'array' && Array.isArray(value)) {
        return true;
      }

      // Check if they want the primitive type 'object' but exclude arrays
      if (filterValue === 'object') {
        const result = !Array.isArray(value);

        return result;
      }

      // Then check constructor name (Object, Array, Date, etc.)
      const result = value.constructor?.name === filterValue;

      return result;
    }

    return false;
  }

  // Get normalized type names for cross-type comparisons
  static getValueType(value: FilterValueEntity.Type): string {
    if (value === null) {
      return 'null';
    }
    if (value === undefined) {
      return 'undefined';
    }
    if (Array.isArray(value)) {
      return 'array';
    }
    if (value instanceof Date) {
      return 'date';
    }
    if (value instanceof RegExp) {
      return 'regexp';
    }
    if (Buffer.isBuffer(value)) {
      return 'buffer';
    }
    if (value instanceof ArrayBuffer) {
      return 'arraybuffer';
    }
    if (value instanceof Uint8Array) {
      return 'uint8array';
    }
    if (value instanceof DataView) {
      return 'dataview';
    }

    const result = typeof value;

    return result;
  }

  // Object similarity based on key-value pairs
  static keysMatch(a: Record<string, unknown>, b: Record<string, unknown>, key: string): boolean {
    try {
      const result = JSON.stringify(a[key]) === JSON.stringify(b[key]);

      return result;
    } catch {
      // Handle circular references - consider non-matching if can't stringify
      return false;
    }
  }

  static calculateObjectSimilarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length === 0 && keysB.length === 0) {
      return 1;
    }
    if (keysA.length === 0 || keysB.length === 0) {
      return 0;
    }

    const allKeys = new Set([
      ...keysA,
      ...keysB
    ]);
    let matches = 0;

    for (const key of allKeys) {
      if (key in a && key in b && CrossOperators.keysMatch(a, b, key)) {
        matches++;
      }
    }

    const similarity = matches / allKeys.size;

    return similarity;
  }

  // String x String same-type comparison honoring caseSensitive
  static compareSameTypeStrings(value1: string, value2: string, caseSensitive: boolean): number {
    const targetValue = caseSensitive ? value1 : value1.toLowerCase();
    const compareValue = caseSensitive ? value2 : value2.toLowerCase();
    const distance = StringOperators.calculateStringSimilarity(targetValue, compareValue);
    const maximumLength = Math.max(targetValue.length, compareValue.length);

    if (maximumLength === 0) {
      return 1;
    }

    const similarity = Math.max(0, 1 - (distance / maximumLength));

    return similarity;
  }

  static compareSameTypeDefault(value1: unknown, value2: unknown): number {
    try {
      const result = (JSON.stringify(value1) === JSON.stringify(value2)) ? 1 : 0;

      return result;
    } catch {
      const result = (value1 === value2) ? 1 : 0;

      return result;
    }
  }

  // Same-type dispatch for calculateCrossTypeSimilarity, keyed by normalized type name
  static compareSameType(type: string, value1: FilterValueEntity.Type, value2: FilterValueEntity.Type, caseSensitive: boolean): number {
    const handlers: Record<string, () => number> = {
      'array': () => {
        const result = ArrayOperators.calculateArraySimilarity(value1 as unknown[], value2 as unknown[]);

        return result;
      },
      'boolean': () => {
        const result = (value1 === value2) ? 1 : 0;

        return result;
      },
      'null': () => {return 1;},
      'number': () => {
        const result = NumberOperators.calculateNumericSimilarity(value1 as number, value2 as number);

        return result;
      },
      'object': () => {
        const result = CrossOperators.calculateObjectSimilarity(value1 as Record<string, unknown>, value2 as Record<string, unknown>);

        return result;
      },
      'string': () => {
        const result = CrossOperators.compareSameTypeStrings(value1 as string, value2 as string, caseSensitive);

        return result;
      },
      'undefined': () => {return 1;}
    };

    const handler = handlers[type];

    if (handler !== undefined) {
      const result = handler();

      return result;
    }

    // For other types (date, regexp, etc), use JSON comparison
    const result = CrossOperators.compareSameTypeDefault(value1, value2);

    return result;
  }

  // Cross-type similarity calculations (values of different types)
  static calculateCrossTypeSimilarityMixed(value1: FilterValueEntity.Type, value2: FilterValueEntity.Type, type1: string, type2: string, caseSensitive: boolean): number {
    // String to Number: compare string representation with number
    if ((type1 === 'string' && type2 === 'number') || (type1 === 'number' && type2 === 'string')) {
      const targetString = type1 === 'string' ? value1 as string : value2 as string;
      const targetNumber = type1 === 'number' ? value1 as number : value2 as number;
      const numberString = String(targetNumber);

      const processedString = caseSensitive ? targetString : targetString.toLowerCase();
      const processedNumberString = caseSensitive ? numberString : numberString.toLowerCase();

      const distance = StringOperators.calculateStringSimilarity(processedString, processedNumberString);
      const maximumLength = Math.max(processedString.length, processedNumberString.length);

      if (maximumLength === 0) {
        return 1;
      }

      const result = Math.max(0, 1 - (distance / maximumLength));

      return result;
    }

    // String to Array: compare string with array elements as strings
    if ((type1 === 'string' && type2 === 'array') || (type1 === 'array' && type2 === 'string')) {
      const targetString = type1 === 'string' ? value1 as string : value2 as string;
      const targetArray = type1 === 'array' ? value1 as unknown[] : value2 as unknown[];

      const arrayStrings = targetArray.map((item) => {
        const itemString = String(item);

        return itemString;
      });
      const processedString = caseSensitive ? targetString : targetString.toLowerCase();

      let bestSimilarity = 0;

      for (let index = 0; index < arrayStrings.length; index++) {
        const arrayItemString = arrayStrings[index]!;
        const processedArrayItemString = caseSensitive ? arrayItemString : arrayItemString.toLowerCase();
        const distance = StringOperators.calculateStringSimilarity(processedString, processedArrayItemString);
        const maximumLength = Math.max(processedString.length, processedArrayItemString.length);

        if (maximumLength > 0) {
          const similarity = Math.max(0, 1 - (distance / maximumLength));

          bestSimilarity = Math.max(bestSimilarity, similarity);
        }
      }

      return bestSimilarity;
    }

    // Array to Number: compare array elements with number
    if ((type1 === 'array' && type2 === 'number') || (type1 === 'number' && type2 === 'array')) {
      const targetArray = type1 === 'array' ? value1 as unknown[] : value2 as unknown[];
      const targetNumber = type1 === 'number' ? value1 as number : value2 as number;

      let bestSimilarity = 0;

      for (let index = 0; index < targetArray.length; index++) {
        const item = targetArray[index];

        if (typeof item === 'number') {
          const similarity = NumberOperators.calculateNumericSimilarity(item, targetNumber);

          bestSimilarity = Math.max(bestSimilarity, similarity);
        } else {
          // Try to convert to number
          const itemNumber = Number(item);

          if (!Number.isNaN(itemNumber)) {
            const similarity = NumberOperators.calculateNumericSimilarity(itemNumber, targetNumber);

            bestSimilarity = Math.max(bestSimilarity, similarity);
          }
        }
      }

      return bestSimilarity;
    }

    // Default cross-type: convert both to strings and compare
    const string1 = String(value1);
    const string2 = String(value2);
    const processedString1 = caseSensitive ? string1 : string1.toLowerCase();
    const processedString2 = caseSensitive ? string2 : string2.toLowerCase();

    const distance = StringOperators.calculateStringSimilarity(processedString1, processedString2);
    const maximumLength = Math.max(processedString1.length, processedString2.length);

    if (maximumLength === 0) {
      return 1;
    }

    const result = Math.max(0, 1 - (distance / maximumLength));

    return result;
  }

  // Main cross-type similarity calculation
  static calculateCrossTypeSimilarity(value1: FilterValueEntity.Type, value2: FilterValueEntity.Type, caseSensitive: boolean): number {
    const type1 = CrossOperators.getValueType(value1);
    const type2 = CrossOperators.getValueType(value2);

    // Same types - use type-specific calculations
    if (type1 === type2) {
      const result = CrossOperators.compareSameType(type1, value1, value2, caseSensitive);

      return result;
    }

    // Different types - cross-type similarity
    const result = CrossOperators.calculateCrossTypeSimilarityMixed(value1, value2, type1, type2, caseSensitive);

    return result;
  }

  static valueSimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    const condition = options?.condition;

    // Threshold is required for SIMILARITY operator - no defaults allowed
    const rawThreshold: unknown = condition?.threshold;

    if (!Predicates.isNumber(rawThreshold)) {
      throw new Error('CROSS.SIMILARITY operator requires a numeric threshold parameter. No default threshold is allowed.');
    }
    const threshold = rawThreshold;
    const rawCaseSensitive: unknown = condition?.caseSensitive;
    const caseSensitive = Predicates.isBoolean(rawCaseSensitive) ? rawCaseSensitive : true;

    // Delegate to type-specific operators when both values are the same type
    if (typeof value === typeof filterValue) {
      if (typeof value === 'string' && typeof filterValue === 'string') {
        const result = StringOperators.stringSimilarity(value, filterValue, options);

        return result;
      }
      if (typeof value === 'number' && typeof filterValue === 'number') {
        const result = NumberOperators.numberSimilarity(value, filterValue, options);

        return result;
      }
      if (typeof value === 'boolean' && typeof filterValue === 'boolean') {
        const result = BooleanOperators.booleanSimilarity(value, filterValue, options);

        return result;
      }
      if (Array.isArray(value) && Array.isArray(filterValue)) {
        const result = ArrayOperators.arraySimilarity(value, filterValue, options);

        return result;
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)
          && typeof filterValue === 'object' && filterValue !== null && !Array.isArray(filterValue)) {
        const result = ObjectOperators.handleSimilarity(value, filterValue, options);

        return result;
      }
    }

    const similarity = CrossOperators.calculateCrossTypeSimilarity(value, filterValue, caseSensitive);

    // Use a small epsilon to handle floating-point precision issues
    const epsilon = 1e-10;

    const result = similarity >= (threshold - epsilon);

    return result;
  }
}

// Operator enum with proper types
interface OperatorEnumInterface {
  readonly 'ARRAY': {
    readonly 'EMPTY': OperatorFunctionInterface;
    readonly 'EQUALS': OperatorFunctionInterface;
    readonly 'EXCLUDES': OperatorFunctionInterface;
    readonly 'IDENTICAL': OperatorFunctionInterface;
    readonly 'INCLUDES': OperatorFunctionInterface;
    readonly 'LENGTH': OperatorFunctionInterface;
    readonly 'NOT_EMPTY': OperatorFunctionInterface;
    readonly 'NOT_EQUALS': OperatorFunctionInterface;
    readonly 'NOT_IDENTICAL': OperatorFunctionInterface;
    readonly [key: string]: OperatorFunctionInterface;
    readonly 'SIMILARITY': OperatorFunctionInterface;
  };
  readonly 'BINARY': {
    readonly 'CONTAINS': OperatorFunctionInterface;
    readonly 'EMPTY': OperatorFunctionInterface;
    readonly 'ENDS_WITH': OperatorFunctionInterface;
    readonly 'EQUALS': OperatorFunctionInterface;
    readonly 'LENGTH': OperatorFunctionInterface;
    readonly 'NOT_EMPTY': OperatorFunctionInterface;
    readonly 'NOT_EQUALS': OperatorFunctionInterface;
    readonly [key: string]: OperatorFunctionInterface;
    readonly 'STARTS_WITH': OperatorFunctionInterface;
  };
  readonly 'BOOLEAN': {
    readonly 'EQUALS': OperatorFunctionInterface;
    readonly 'FALSE': OperatorFunctionInterface;
    readonly 'FALSY': OperatorFunctionInterface;
    readonly 'NOT_EQUALS': OperatorFunctionInterface;
    readonly [key: string]: OperatorFunctionInterface;
    readonly 'SIMILARITY': OperatorFunctionInterface;
    readonly 'TRUE': OperatorFunctionInterface;
    readonly 'TRUTHY': OperatorFunctionInterface;
  };
  readonly 'CROSS': {
    readonly 'ABSENT': OperatorFunctionInterface;
    readonly 'DEFINED': OperatorFunctionInterface;
    readonly 'EQUALS': OperatorFunctionInterface;
    readonly 'EXISTS': OperatorFunctionInterface;
    readonly 'NOT_EQUALS': OperatorFunctionInterface;
    readonly 'NOT_NULL': OperatorFunctionInterface;
    readonly 'NULL': OperatorFunctionInterface;
    readonly [key: string]: OperatorFunctionInterface;
    readonly 'SIMILARITY': OperatorFunctionInterface;
    readonly 'TYPE': OperatorFunctionInterface;
    readonly 'UNDEFINED': OperatorFunctionInterface;
  };
  readonly 'DATE': {
    readonly 'BETWEEN': OperatorFunctionInterface;
    readonly 'EQUALS': OperatorFunctionInterface;
    readonly 'IDENTICAL'?: OperatorFunctionInterface;
    readonly 'NOT_EQUALS': OperatorFunctionInterface;
    readonly 'NOT_IDENTICAL'?: OperatorFunctionInterface;
    readonly 'OUTSIDE': OperatorFunctionInterface;
  };
  readonly 'MAP': {
    readonly 'EMPTY': OperatorFunctionInterface;
    readonly 'EQUALS': OperatorFunctionInterface;
    readonly 'HAS': OperatorFunctionInterface;
    readonly 'MISSING': OperatorFunctionInterface;
    readonly 'NOT_EMPTY': OperatorFunctionInterface;
    readonly 'NOT_EQUALS': OperatorFunctionInterface;
    readonly [key: string]: OperatorFunctionInterface;
    readonly 'SIZE': OperatorFunctionInterface;
  };
  readonly 'NUMBER': {
    readonly 'BETWEEN': OperatorFunctionInterface;
    readonly 'EQUALS': OperatorFunctionInterface;
    readonly 'GREATER': OperatorFunctionInterface;
    readonly 'GREATER_EQUAL': OperatorFunctionInterface;
    readonly 'LESS': OperatorFunctionInterface;
    readonly 'LESS_EQUAL': OperatorFunctionInterface;
    readonly 'MODULO': OperatorFunctionInterface;
    readonly 'NOT_EQUALS': OperatorFunctionInterface;
    readonly 'OUTSIDE': OperatorFunctionInterface;
    readonly [key: string]: OperatorFunctionInterface;
    readonly 'SIMILARITY': OperatorFunctionInterface;
  };
  readonly 'OBJECT': {
    readonly 'DEEP_INCLUDES': OperatorFunctionInterface;
    readonly 'EMPTY': OperatorFunctionInterface;
    readonly 'EQUALS': OperatorFunctionInterface;
    readonly 'HAS_PROPERTY': OperatorFunctionInterface;
    readonly 'IDENTICAL': OperatorFunctionInterface;
    readonly 'MISSING_PROPERTY': OperatorFunctionInterface;
    readonly 'NOT_EMPTY': OperatorFunctionInterface;
    readonly 'NOT_EQUALS': OperatorFunctionInterface;
    readonly 'NOT_IDENTICAL': OperatorFunctionInterface;
    readonly 'PROPERTY_COUNT': OperatorFunctionInterface;
    readonly [key: string]: OperatorFunctionInterface;
    readonly 'SIMILARITY': OperatorFunctionInterface;
  };
  readonly [key: string]: Record<string, OperatorFunctionInterface>;
  readonly 'SET': {
    readonly 'EMPTY': OperatorFunctionInterface;
    readonly 'EQUALS': OperatorFunctionInterface;
    readonly 'HAS': OperatorFunctionInterface;
    readonly 'MISSING': OperatorFunctionInterface;
    readonly 'NOT_EMPTY': OperatorFunctionInterface;
    readonly 'NOT_EQUALS': OperatorFunctionInterface;
    readonly [key: string]: OperatorFunctionInterface;
    readonly 'SIZE': OperatorFunctionInterface;
  };
  readonly 'STRING': {
    readonly 'CONTAINS': OperatorFunctionInterface;
    readonly 'EMPTY': OperatorFunctionInterface;
    readonly 'ENDS_WITH': OperatorFunctionInterface;
    readonly 'EQUALS': OperatorFunctionInterface;
    readonly 'EXCLUDES': OperatorFunctionInterface;
    readonly 'LENGTH': OperatorFunctionInterface;
    readonly 'NOT_EMPTY': OperatorFunctionInterface;
    readonly 'NOT_EQUALS': OperatorFunctionInterface;
    readonly [key: string]: OperatorFunctionInterface;
    readonly 'REGEX': OperatorFunctionInterface;
    readonly 'SIMILARITY': OperatorFunctionInterface;
    readonly 'STARTS_WITH': OperatorFunctionInterface;
    readonly 'WORD_COUNT': OperatorFunctionInterface;
  };
}

export const Operator: OperatorEnumInterface = DeepFreeze.deepFreeze({
  'ARRAY': {
    'EMPTY': ArrayOperators.arrayEmpty,
    'EQUALS': ArrayOperators.arrayEquals,
    'EXCLUDES': ArrayOperators.arrayExcludes,
    'IDENTICAL': ArrayOperators.arrayIdentical,
    'INCLUDES': ArrayOperators.arrayIncludes,
    'LENGTH': ArrayOperators.arrayLength,
    'NOT_EMPTY': ArrayOperators.arrayNotEmpty,
    'NOT_EQUALS': ArrayOperators.arrayNotEquals,
    'NOT_IDENTICAL': ArrayOperators.arrayNotIdentical,
    'SIMILARITY': ArrayOperators.arraySimilarity
  },
  'BINARY': {
    'CONTAINS': BinaryOperators.handleContains,
    'EMPTY': BinaryOperators.handleEmpty,
    'ENDS_WITH': BinaryOperators.handleEndsWith,
    'EQUALS': BinaryOperators.handleEquals,
    'LENGTH': BinaryOperators.handleLength,
    'NOT_EMPTY': BinaryOperators.handleNotEmpty,
    'NOT_EQUALS': BinaryOperators.handleNotEquals,
    'STARTS_WITH': BinaryOperators.handleStartsWith
  },
  'BOOLEAN': {
    'EQUALS': BooleanOperators.booleanEquals,
    'FALSE': BooleanOperators.booleanFalse,
    'FALSY': BooleanOperators.booleanFalsy,
    'NOT_EQUALS': BooleanOperators.booleanNotEquals,
    'SIMILARITY': BooleanOperators.booleanSimilarity,
    'TRUE': BooleanOperators.booleanTrue,
    'TRUTHY': BooleanOperators.booleanTruthy
  },
  'CROSS': {
    'ABSENT': CrossOperators.valueAbsent,
    'DEFINED': CrossOperators.valueDefined,
    'EQUALS': CrossOperators.crossEquals,
    'EXISTS': CrossOperators.valueExists,
    'NOT_EQUALS': CrossOperators.crossNotEquals,
    'NOT_NULL': CrossOperators.valueNotNull,
    'NULL': CrossOperators.valueNull,
    'SIMILARITY': CrossOperators.valueSimilarity,
    'TYPE': CrossOperators.valueType,
    'UNDEFINED': CrossOperators.valueUndefined
  },
  'DATE': {
    'BETWEEN': DateOperators.dateBetween,
    'EQUALS': DateOperators.dateEquals,
    'NOT_EQUALS': DateOperators.dateNotEquals,
    'OUTSIDE': DateOperators.dateOutside
  },
  'MAP': {
    'EMPTY': MapOperators.mapEmpty,
    'EQUALS': MapOperators.mapEquals,
    'HAS': MapOperators.mapHas,
    'IDENTICAL': MapOperators.mapIdentical,
    'MISSING': MapOperators.mapMissing,
    'NOT_EMPTY': MapOperators.mapNotEmpty,
    'NOT_EQUALS': MapOperators.mapNotEquals,
    'NOT_IDENTICAL': MapOperators.mapNotIdentical,
    'SIZE': MapOperators.mapSize
  },
  'NUMBER': {
    'BETWEEN': NumberOperators.numberBetween,
    'EQUALS': NumberOperators.numberEquals,
    'GREATER': NumberOperators.numberGreater,
    'GREATER_EQUAL': NumberOperators.numberGreaterEqual,
    'LESS': NumberOperators.numberLess,
    'LESS_EQUAL': NumberOperators.numberLessEqual,
    'MODULO': NumberOperators.numberModulo,
    'NOT_EQUALS': NumberOperators.numberNotEquals,
    'OUTSIDE': NumberOperators.numberOutside,
    'SIMILARITY': NumberOperators.numberSimilarity
  },
  'OBJECT': {
    'DEEP_INCLUDES': ObjectOperators.handleDeepIncludes,
    'EMPTY': ObjectOperators.handleEmpty,
    'EQUALS': ObjectOperators.handleEquals,
    'HAS_PROPERTY': ObjectOperators.handleHasProperty,
    'IDENTICAL': ObjectOperators.handleIdentical,
    'MISSING_PROPERTY': ObjectOperators.handleMissingProperty,
    'NOT_EMPTY': ObjectOperators.handleNotEmpty,
    'NOT_EQUALS': ObjectOperators.handleNotEquals,
    'NOT_IDENTICAL': ObjectOperators.handleNotIdentical,
    'PROPERTY_COUNT': ObjectOperators.handlePropertyCount,
    'SIMILARITY': ObjectOperators.handleSimilarity
  },
  'SET': {
    'EMPTY': SetOperators.setEmpty,
    'EQUALS': SetOperators.setEquals,
    'HAS': SetOperators.setHas,
    'IDENTICAL': SetOperators.setIdentical,
    'MISSING': SetOperators.setMissing,
    'NOT_EMPTY': SetOperators.setNotEmpty,
    'NOT_EQUALS': SetOperators.setNotEquals,
    'NOT_IDENTICAL': SetOperators.setNotIdentical,
    'SIZE': SetOperators.setSize
  },
  'STRING': {
    'CONTAINS': StringOperators.stringContains,
    'EMPTY': StringOperators.stringEmpty,
    'ENDS_WITH': StringOperators.stringEndsWith,
    'EQUALS': StringOperators.stringEquals,
    'EXCLUDES': StringOperators.stringExcludes,
    'LENGTH': StringOperators.stringLength,
    'NOT_EMPTY': StringOperators.stringNotEmpty,
    'NOT_EQUALS': StringOperators.stringNotEquals,
    'REGEX': StringOperators.stringRegex,
    'SIMILARITY': StringOperators.stringSimilarity,
    'STARTS_WITH': StringOperators.stringStartsWith,
    'WORD_COUNT': StringOperators.stringWordCount
  }
});
