/**
 * Comparison operators with direct function access for declarative configuration
 */

import { Predicates } from '@studnicky/types';

import type { FilterValueEntity } from '../FilterValueEntity.js';
import type { FilterConditionInterface } from '../interfaces.js';

import { DateParser } from '../converters/DateParser.js';
import { FilterOperatorError } from '../errors/FilterOperatorError.js';
import { BinaryOperators } from '../operators/BinaryOperators.js';
import { ObjectOperators } from '../operators/ObjectOperators.js';
import { DeepFreeze } from '../utils/deepFreeze.js';
import { WHITESPACE_PATTERN } from './constants/WhitespacePattern.js';

/**
 * Shared deep-equality comparison used by IDENTICAL-style operators
 */
class ComparisonOperators {
  static deepEqual<T>(leftValue: T, rightValue: T, options?: { 'visited'?: WeakSet<object> }): boolean {
    if (leftValue === rightValue) {
      return true;
    }

    // Handle null/undefined
    if (leftValue === null || leftValue === undefined || rightValue === null || rightValue === undefined) {
      const result = leftValue === rightValue;

      return result;
    }

    // Handle different types
    if (typeof leftValue !== typeof rightValue) {
      return false;
    }

    // Handle primitives
    if (typeof leftValue !== 'object' || typeof rightValue !== 'object') {
      const result = leftValue === rightValue;

      return result;
    }

    // Initialize visited set for circular reference detection
    const visitedSet = options?.visited ?? new WeakSet();

    // Check for circular references
    if (visitedSet.has(leftValue) || visitedSet.has(rightValue)) {
      // For circular references, consider them equal if they're the same reference
      const result = leftValue === rightValue;

      return result;
    }

    // Add objects to visited set
    visitedSet.add(leftValue);
    visitedSet.add(rightValue);

    try {
      // Handle Dates
      if (leftValue instanceof Date && rightValue instanceof Date) {
        const result = leftValue.getTime() === rightValue.getTime();

        return result;
      }

      // Handle RegExp
      if (leftValue instanceof RegExp && rightValue instanceof RegExp) {
        const result = leftValue.source === rightValue.source && leftValue.flags === rightValue.flags;

        return result;
      }

      // Handle Arrays
      if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
        if (leftValue.length !== rightValue.length) {
          return false;
        }
        const length = leftValue.length;
        for (let index = 0; index < length; index += 1) {
          if (!ComparisonOperators.deepEqual(leftValue[index], rightValue[index], { 'visited': visitedSet })) {
            return false;
          }
        }

        return true;
      }

      // Handle Sets
      if (leftValue instanceof Set && rightValue instanceof Set) {
        if (leftValue.size !== rightValue.size) {
          return false;
        }
        for (const item of leftValue) {
          if (!rightValue.has(item)) {
            return false;
          }
        }

        return true;
      }

      // Handle Maps
      if (leftValue instanceof Map && rightValue instanceof Map) {
        if (leftValue.size !== rightValue.size) {
          return false;
        }
        for (const [
          key,
          value
        ] of leftValue) {
          if (!rightValue.has(key) || !ComparisonOperators.deepEqual(value, rightValue.get(key), { 'visited': visitedSet })) {
            return false;
          }
        }

        return true;
      }

      // Handle plain objects
      if (!Predicates.isRecord(leftValue) || !Predicates.isRecord(rightValue)) {
        return false;
      }
      const keysA = Object.keys(leftValue);
      const keysB = Object.keys(rightValue);

      if (keysA.length !== keysB.length) {
        return false;
      }

      const keysBSet = new Set(keysB);

      const keysALength = keysA.length;
      for (let index = 0; index < keysALength; index += 1) {
        const key = keysA[index];
        if (key === undefined) {
          continue;
        }
        if (!keysBSet.has(key)) {
          return false;
        }
        if (!ComparisonOperators.deepEqual(leftValue[key], rightValue[key], { 'visited': visitedSet })) {
          return false;
        }
      }

      return true;
    } finally {
      // Clean up visited set (objects will be automatically removed when out of scope)
      visitedSet.delete(leftValue);
      visitedSet.delete(rightValue);
    }
  }
}

/**
 * Array-typed operator implementations
 */
class ArrayOperators {
  static arrayIncludes(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.INCLUDES requires value to be an array, got ${typeof value}`, {});
    }

    const result = (value as unknown[]).includes(filterValue);

    return result;
  }

  static arrayExcludes(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.EXCLUDES requires value to be an array, got ${typeof value}`, {});
    }

    const result = !(value as unknown[]).includes(filterValue);

    return result;
  }

  static arrayLength(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.LENGTH requires value to be an array, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`ARRAY.LENGTH requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value.length === filterValue;

    return result;
  }

  static arrayEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.EMPTY requires value to be an array, got ${typeof value}`, {});
    }

    const result = value.length === 0;

    return result;
  }

  static arrayIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.IDENTICAL requires value to be an array, got ${typeof value}`, {});
    }
    if (!Array.isArray(filterValue)) {
      throw new FilterOperatorError(`ARRAY.IDENTICAL requires filter value to be an array, got ${typeof filterValue}`, {});
    }

    const result = ComparisonOperators.deepEqual(value, filterValue);

    return result;
  }

  static arrayNotEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.NOT_EMPTY requires value to be an array, got ${typeof value}`, {});
    }

    const result = value.length > 0;

    return result;
  }

  static arrayEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.EQUALS requires value to be an array, got ${typeof value}`, {});
    }
    if (!Array.isArray(filterValue)) {
      throw new FilterOperatorError(`ARRAY.EQUALS requires filter value to be an array, got ${typeof filterValue}`, {});
    }

    const result = ComparisonOperators.deepEqual(value, filterValue);

    return result;
  }

  static arrayNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.NOT_EQUALS requires value to be an array, got ${typeof value}`, {});
    }
    if (!Array.isArray(filterValue)) {
      throw new FilterOperatorError(`ARRAY.NOT_EQUALS requires filter value to be an array, got ${typeof filterValue}`, {});
    }

    const result = !ComparisonOperators.deepEqual(value, filterValue);

    return result;
  }

  static arrayNotIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.NOT_IDENTICAL requires value to be an array, got ${typeof value}`, {});
    }
    if (!Array.isArray(filterValue)) {
      throw new FilterOperatorError(`ARRAY.NOT_IDENTICAL requires filter value to be an array, got ${typeof filterValue}`, {});
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

    // Jaccard similarity
    const similarity = intersection.size / union.size;

    return similarity;
  }

  static arraySimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.SIMILARITY requires value to be an array, got ${typeof value}`, {});
    }
    if (!Array.isArray(filterValue)) {
      throw new FilterOperatorError(`ARRAY.SIMILARITY requires filter value to be an array, got ${typeof filterValue}`, {});
    }
    if (typeof options?.condition?.threshold !== 'number') {
      throw new FilterOperatorError('ARRAY.SIMILARITY requires a numeric threshold parameter', {});
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
      throw new FilterOperatorError(`STRING.CONTAINS requires value to be a string, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'string') {
      throw new FilterOperatorError(`STRING.CONTAINS requires filter value to be a string, got ${typeof filterValue}`, {});
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
      throw new FilterOperatorError(`STRING.EXCLUDES requires value to be a string, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'string') {
      throw new FilterOperatorError(`STRING.EXCLUDES requires filter value to be a string, got ${typeof filterValue}`, {});
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
      throw new FilterOperatorError(`STRING.STARTS_WITH requires value to be a string, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'string') {
      throw new FilterOperatorError(`STRING.STARTS_WITH requires filter value to be a string, got ${typeof filterValue}`, {});
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
      throw new FilterOperatorError(`STRING.ENDS_WITH requires value to be a string, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'string') {
      throw new FilterOperatorError(`STRING.ENDS_WITH requires filter value to be a string, got ${typeof filterValue}`, {});
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
      throw new FilterOperatorError(`STRING.REGEX requires value to be a string, got ${typeof value}`, {});
    }

    // REGEX operator expects compiled RegExp objects only for performance
    if (!(filterValue instanceof RegExp)) {
      throw new FilterOperatorError('REGEX operator requires a pre-compiled RegExp object. Example: new RegExp("\\\\p{Emoji}", "u")', {});
    }

    const result = filterValue.test(value);

    return result;
  }

  static stringLength(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'string') {
      throw new FilterOperatorError(`STRING.LENGTH requires value to be a string, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`STRING.LENGTH requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value.length === filterValue;

    return result;
  }

  static stringEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'string') {
      throw new FilterOperatorError(`STRING.EMPTY requires value to be a string, got ${typeof value}`, {});
    }

    const result = value.length === 0;

    return result;
  }

  static stringNotEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'string') {
      throw new FilterOperatorError(`STRING.NOT_EMPTY requires value to be a string, got ${typeof value}`, {});
    }

    const result = value.length > 0;

    return result;
  }

  static stringWordCount(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'string') {
      throw new FilterOperatorError(`STRING.WORD_COUNT requires value to be a string, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`STRING.WORD_COUNT requires filter value to be a number, got ${typeof filterValue}`, {});
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
      throw new FilterOperatorError(`STRING.EQUALS requires value to be a string, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'string') {
      throw new FilterOperatorError(`STRING.EQUALS requires filter value to be a string, got ${typeof filterValue}`, {});
    }

    const result = value === filterValue;

    return result;
  }

  static stringNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'string') {
      throw new FilterOperatorError(`STRING.NOT_EQUALS requires value to be a string, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'string') {
      throw new FilterOperatorError(`STRING.NOT_EQUALS requires filter value to be a string, got ${typeof filterValue}`, {});
    }

    const result = value !== filterValue;

    return result;
  }

  // Levenshtein distance calculation for string similarity
  static calculateStringSimilarity(string1: string, string2: string): number {
    const sourceLength = string1.length;
    const initialRow: number[] = [];

    for (let columnIndex = 0; columnIndex <= sourceLength; columnIndex += 1) {
      initialRow.push(columnIndex);
    }

    let previousRow = initialRow;
    let targetIndex = 0;

    for (const targetCharacter of string2) {
      targetIndex += 1;
      const currentRow = [targetIndex];
      let sourceIndex = 0;

      for (const sourceCharacter of string1) {
        const deletionCost = previousRow[sourceIndex + 1];
        const diagonalCost = previousRow[sourceIndex];
        const insertionCost = currentRow[sourceIndex];

        if (deletionCost === undefined || diagonalCost === undefined || insertionCost === undefined) {
          throw new FilterOperatorError('Unable to calculate string similarity', {});
        }

        const substitutionCost = diagonalCost + (sourceCharacter === targetCharacter ? 0 : 1);
        const nextCost = Math.min(deletionCost + 1, insertionCost + 1, substitutionCost);

        currentRow.push(nextCost);
        sourceIndex += 1;
      }

      previousRow = currentRow;
    }

    const distance = previousRow.at(-1);

    if (distance === undefined) {
      throw new FilterOperatorError('Unable to calculate string similarity', {});
    }

    return distance;
  }

  // String similarity using Levenshtein distance
  static stringSimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'string') {
      throw new FilterOperatorError(`STRING.SIMILARITY requires value to be a string, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'string') {
      throw new FilterOperatorError(`STRING.SIMILARITY requires filter value to be a string, got ${typeof filterValue}`, {});
    }
    if (typeof options?.condition?.threshold !== 'number') {
      throw new FilterOperatorError('STRING.SIMILARITY requires a numeric threshold parameter', {});
    }

    const threshold = options.condition.threshold;
    const caseSensitive = options.condition.caseSensitive ?? true;

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
      throw new FilterOperatorError(`NUMBER.GREATER requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.GREATER requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value > filterValue;

    return result;
  }

  static numberGreaterEqual(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.GREATER_EQUAL requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.GREATER_EQUAL requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value >= filterValue;

    return result;
  }

  static numberLess(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.LESS requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.LESS requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value < filterValue;

    return result;
  }

  static numberLessEqual(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.LESS_EQUAL requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.LESS_EQUAL requires filter value to be a number, got ${typeof filterValue}`, {});
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
      throw new FilterOperatorError('NUMBER.BETWEEN requires filterValue to be an object with min and max properties: { min: number, max: number }', {});
    }

    if (!Predicates.isRecord(filterValue)) {
      throw new FilterOperatorError('NUMBER.BETWEEN requires filterValue to be an object with min and max properties: { min: number, max: number }', {});
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
      throw new FilterOperatorError('NUMBER.OUTSIDE requires filterValue to be an object with min and max properties: { min: number, max: number }', {});
    }

    if (!Predicates.isRecord(filterValue)) {
      throw new FilterOperatorError('NUMBER.OUTSIDE requires filterValue to be an object with min and max properties: { min: number, max: number }', {});
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
      throw new FilterOperatorError(`NUMBER.MODULO requires value to be a number, got ${typeof value}`, {});
    }

    // Only accept object format { divisor, remainder }
    if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue)) {
      throw new FilterOperatorError(`NUMBER.MODULO requires filter value to be an object with divisor and remainder properties, got ${typeof filterValue}`, {});
    }

    if (!Predicates.isRecord(filterValue)) {
      throw new FilterOperatorError(`NUMBER.MODULO requires filter value to be an object with divisor and remainder properties, got ${typeof filterValue}`, {});
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
      throw new FilterOperatorError(`NUMBER.EQUALS requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.EQUALS requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value === filterValue;

    return result;
  }

  static numberNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.NOT_EQUALS requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.NOT_EQUALS requires filter value to be a number, got ${typeof filterValue}`, {});
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
    }

    const diff = Math.abs(value1 - value2);
    const similarity = Math.max(0, 1 - (diff / maximum));

    return similarity;
  }

  // Number similarity using relative difference
  static numberSimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.SIMILARITY requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.SIMILARITY requires filter value to be a number, got ${typeof filterValue}`, {});
    }
    if (typeof options?.condition?.threshold !== 'number') {
      throw new FilterOperatorError('NUMBER.SIMILARITY requires a numeric threshold parameter', {});
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
      throw new FilterOperatorError('DATE.BETWEEN requires filterValue to be an object with min and max properties: { min: date, max: date }', {});
    }

    if (!Predicates.isRecord(filterValue)) {
      throw new FilterOperatorError('DATE range requires filterValue to be an object with min and max properties: { min: date, max: date }', {});
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
      throw new FilterOperatorError('DATE.OUTSIDE requires filterValue to be an object with min and max properties: { min: date, max: date }', {});
    }

    if (!Predicates.isRecord(filterValue)) {
      throw new FilterOperatorError('DATE range requires filterValue to be an object with min and max properties: { min: date, max: date }', {});
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

  static isFalsyValue(value: unknown): boolean {
    const result = value === null || value === undefined || value === false
      || value === 0 || value === '' || Number.isNaN(value);

    return result;
  }

  static booleanTruthy(value: unknown): boolean {
    const result = !BooleanOperators.isFalsyValue(value);

    return result;
  }

  static booleanFalsy(value: unknown): boolean {
    const result = value === null || value === undefined || value === false
      || value === 0 || value === '' || Number.isNaN(value);

    return result;
  }

  static booleanEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'boolean') {
      throw new FilterOperatorError(`BOOLEAN.EQUALS requires value to be a boolean, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'boolean') {
      throw new FilterOperatorError(`BOOLEAN.EQUALS requires filter value to be a boolean, got ${typeof filterValue}`, {});
    }

    const result = value === filterValue;

    return result;
  }

  static booleanNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'boolean') {
      throw new FilterOperatorError(`BOOLEAN.NOT_EQUALS requires value to be a boolean, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'boolean') {
      throw new FilterOperatorError(`BOOLEAN.NOT_EQUALS requires filter value to be a boolean, got ${typeof filterValue}`, {});
    }

    const result = value !== filterValue;

    return result;
  }

  // Boolean similarity (exact match only)
  static booleanSimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (typeof value !== 'boolean') {
      throw new FilterOperatorError(`BOOLEAN.SIMILARITY requires value to be a boolean, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'boolean') {
      throw new FilterOperatorError(`BOOLEAN.SIMILARITY requires filter value to be a boolean, got ${typeof filterValue}`, {});
    }
    if (typeof options?.condition?.threshold !== 'number') {
      throw new FilterOperatorError('BOOLEAN.SIMILARITY requires a numeric threshold parameter', {});
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
      throw new FilterOperatorError(`SET.HAS requires value to be a Set, got ${typeof value}`, {});
    }

    const result = Predicates.isString(filterValue) && value.has(filterValue);

    return result;
  }

  static setMissing(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.MISSING requires value to be a Set, got ${typeof value}`, {});
    }

    const result = !Predicates.isString(filterValue) || !value.has(filterValue);

    return result;
  }

  static setSize(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.SIZE requires value to be a Set, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`SET.SIZE requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value.size === filterValue;

    return result;
  }

  static setEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.EMPTY requires value to be a Set, got ${typeof value}`, {});
    }

    const result = value.size === 0;

    return result;
  }

  static setNotEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.NOT_EMPTY requires value to be a Set, got ${typeof value}`, {});
    }

    const result = value.size > 0;

    return result;
  }

  static setEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.EQUALS requires value to be a Set, got ${typeof value}`, {});
    }
    if (!(filterValue instanceof Set)) {
      throw new FilterOperatorError(`SET.EQUALS requires filter value to be a Set, got ${typeof filterValue}`, {});
    }

    const result = ComparisonOperators.deepEqual(value, filterValue);

    return result;
  }

  static setNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = !SetOperators.setEquals(value, filterValue);

    return result;
  }

  static setIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.IDENTICAL requires value to be a Set, got ${typeof value}`, {});
    }
    if (!(filterValue instanceof Set)) {
      throw new FilterOperatorError(`SET.IDENTICAL requires filter value to be a Set, got ${typeof filterValue}`, {});
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
      throw new FilterOperatorError(`MAP.EMPTY requires value to be a Map, got ${typeof value}`, {});
    }

    const result = value.size === 0;

    return result;
  }

  static mapNotEmpty(value: FilterValueEntity.Type, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.NOT_EMPTY requires value to be a Map, got ${typeof value}`, {});
    }

    const result = value.size > 0;

    return result;
  }

  static mapHas(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.HAS requires value to be a Map, got ${typeof value}`, {});
    }

    const result = Predicates.isString(filterValue) && value.has(filterValue);

    return result;
  }

  static mapMissing(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.MISSING requires value to be a Map, got ${typeof value}`, {});
    }

    const result = !Predicates.isString(filterValue) || !value.has(filterValue);

    return result;
  }

  static mapSize(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.SIZE requires value to be a Map, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`MAP.SIZE requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value.size === filterValue;

    return result;
  }

  static mapEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.EQUALS requires value to be a Map, got ${typeof value}`, {});
    }
    if (!(filterValue instanceof Map)) {
      throw new FilterOperatorError(`MAP.EQUALS requires filter value to be a Map, got ${typeof filterValue}`, {});
    }

    const result = ComparisonOperators.deepEqual(value, filterValue);

    return result;
  }

  static mapNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = !MapOperators.mapEquals(value, filterValue);

    return result;
  }

  static mapIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.IDENTICAL requires value to be a Map, got ${typeof value}`, {});
    }
    if (!(filterValue instanceof Map)) {
      throw new FilterOperatorError(`MAP.IDENTICAL requires filter value to be a Map, got ${typeof filterValue}`, {});
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
      throw new FilterOperatorError(`CROSS.TYPE requires filter value to be a string, got ${typeof filterValue}`, {});
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
    // Check for common type aliases (lowercase)
    if (filterValue === 'array' && Array.isArray(value)) {
      const result = true;
      return result;
    }

    // Check if they want the primitive type 'object' but exclude arrays
    if (filterValue === 'object') {
      const result = !Array.isArray(value);
      return result;
    }

    const result = value.constructor.name === filterValue;
    return result;
  }

  // Get normalized type names for cross-type comparisons
  static getValueType(value: FilterValueEntity.Type): string {
    if (value === null) {
      const result = 'null';
      return result;
    }
    if (value === undefined) {
      const result = 'undefined';
      return result;
    }
    if (Array.isArray(value)) {
      const result = 'array';
      return result;
    }
    if (value instanceof Date) {
      const result = 'date';
      return result;
    }
    if (value instanceof RegExp) {
      const result = 'regexp';
      return result;
    }
    if (value instanceof ArrayBuffer) {
      const result = 'arraybuffer';
      return result;
    }
    if (value instanceof Uint8Array) {
      const result = 'uint8array';
      return result;
    }
    if (value instanceof DataView) {
      const result = 'dataview';
      return result;
    }

    const result = typeof value;

    return result;
  }

  // Object similarity based on key-value pairs
  static keysMatch(left: Record<string, unknown>, right: Record<string, unknown>, key: string): boolean {
    try {
      const result = JSON.stringify(left[key]) === JSON.stringify(right[key]);

      return result;
    } catch {
      return false;
    }
  }

  static calculateObjectSimilarity(left: Record<string, unknown>, right: Record<string, unknown>): number {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length === 0 && rightKeys.length === 0) {
      return 1;
    }
    if (leftKeys.length === 0 || rightKeys.length === 0) {
      return 0;
    }

    const allKeys = new Set([
      ...leftKeys,
      ...rightKeys
    ]);
    let matches = 0;

    for (const key of allKeys) {
      if (key in left && key in right && CrossOperators.keysMatch(left, right, key)) {
        matches++;
      }
    }

    const similarity = matches / allKeys.size;

    return similarity;
  }

  static calculateStringSimilarityScore(left: string, right: string, caseSensitive: boolean): number {
    const targetValue = caseSensitive ? left : left.toLowerCase();
    const compareValue = caseSensitive ? right : right.toLowerCase();
    const distance = StringOperators.calculateStringSimilarity(targetValue, compareValue);
    const maximumLength = Math.max(targetValue.length, compareValue.length);

    if (maximumLength === 0) {
      return 1;
    }

    const similarity = Math.max(0, 1 - (distance / maximumLength));

    return similarity;
  }

  static serializeComparableValue(value: FilterValueEntity.Type | undefined): string {
    if (typeof value !== 'object' || value === null) {
      const result = String(value);

      return result;
    }

    try {
      const result = JSON.stringify(value);

      return result;
    } catch {
      const result = '[Circular]';

      return result;
    }
  }

  static compareSameType(leftValue: FilterValueEntity.Type, rightValue: FilterValueEntity.Type, caseSensitive: boolean): number {
    if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
      const result = ArrayOperators.calculateArraySimilarity(leftValue, rightValue);

      return result;
    }
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      const result = NumberOperators.calculateNumericSimilarity(leftValue, rightValue);

      return result;
    }
    if (typeof leftValue === 'string' && typeof rightValue === 'string') {
      const result = CrossOperators.calculateStringSimilarityScore(leftValue, rightValue, caseSensitive);

      return result;
    }
    if (Predicates.isRecord(leftValue) && Predicates.isRecord(rightValue)) {
      const result = CrossOperators.calculateObjectSimilarity(leftValue, rightValue);

      return result;
    }

    const result = leftValue === rightValue ? 1 : 0;

    return result;
  }

  // Cross-type similarity calculations (values of different types)
  static calculateCrossTypeSimilarityMixed(left: FilterValueEntity.Type, right: FilterValueEntity.Type, caseSensitive: boolean): number {
    if (typeof left === 'string' && typeof right === 'number') {
      const result = CrossOperators.calculateStringSimilarityScore(left, String(right), caseSensitive);

      return result;
    }
    if (typeof left === 'number' && typeof right === 'string') {
      const result = CrossOperators.calculateStringSimilarityScore(right, String(left), caseSensitive);

      return result;
    }
    if (typeof left === 'string' && Array.isArray(right)) {
      let bestSimilarity = 0;
      const rightLength = right.length;

      for (let index = 0; index < rightLength; index += 1) {
        const item = right[index];
        const similarity = CrossOperators.calculateStringSimilarityScore(left, CrossOperators.serializeComparableValue(item), caseSensitive);

        bestSimilarity = Math.max(bestSimilarity, similarity);
      }

      return bestSimilarity;
    }
    if (Array.isArray(left) && typeof right === 'string') {
      let bestSimilarity = 0;
      const leftLength = left.length;

      for (let index = 0; index < leftLength; index += 1) {
        const item = left[index];
        const similarity = CrossOperators.calculateStringSimilarityScore(right, CrossOperators.serializeComparableValue(item), caseSensitive);

        bestSimilarity = Math.max(bestSimilarity, similarity);
      }

      return bestSimilarity;
    }
    if (Array.isArray(left) && typeof right === 'number') {
      let bestSimilarity = 0;
      const leftLength = left.length;

      for (let index = 0; index < leftLength; index += 1) {
        const item = left[index];
        const itemNumber = typeof item === 'number' ? item : Number(item);

        if (!Number.isNaN(itemNumber)) {
          bestSimilarity = Math.max(
            bestSimilarity,
            NumberOperators.calculateNumericSimilarity(itemNumber, right)
          );
        }
      }

      return bestSimilarity;
    }
    if (typeof left === 'number' && Array.isArray(right)) {
      const result = CrossOperators.calculateCrossTypeSimilarityMixed(right, left, caseSensitive);

      return result;
    }

    const result = CrossOperators.calculateStringSimilarityScore(
      CrossOperators.serializeComparableValue(left),
      CrossOperators.serializeComparableValue(right),
      caseSensitive
    );

    return result;
  }

  // Main cross-type similarity calculation
  static calculateCrossTypeSimilarity(left: FilterValueEntity.Type, right: FilterValueEntity.Type, caseSensitive: boolean): number {
    const leftType = CrossOperators.getValueType(left);
    const rightType = CrossOperators.getValueType(right);

    // Same types - use type-specific calculations
    if (leftType === rightType) {
      const result = CrossOperators.compareSameType(left, right, caseSensitive);

      return result;
    }

    // Different types - cross-type similarity
    const result = CrossOperators.calculateCrossTypeSimilarityMixed(left, right, caseSensitive);

    return result;
  }

  static valueSimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    const condition = options?.condition;

    // Threshold is required for SIMILARITY operator - no defaults allowed
    const rawThreshold: unknown = condition?.threshold;

    if (!Predicates.isNumber(rawThreshold)) {
      throw new FilterOperatorError('CROSS.SIMILARITY operator requires a numeric threshold parameter. No default threshold is allowed.', {});
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

export const Operator = DeepFreeze.deepFreeze({
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
    'IDENTICAL': ObjectOperators.handleEquals,
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
