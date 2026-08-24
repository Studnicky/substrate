/**
 * Comparison operators with direct function access for declarative configuration
 */

import type {
  FilterCondition, FilterValue, OperatorFunction
} from '../types.js';

import { Guard } from '../../guards/Guard.js';
import { parseDate } from '../converters/date.js';
import {
  binaryContains,
  binaryEmpty,
  binaryEndsWith,
  binaryEquals,
  binaryLength,
  binaryNotEmpty,
  binaryNotEquals,
  binaryStartsWith
} from '../operators/BinaryOperators.js';
import { ObjectOperators } from '../operators/ObjectOperators.js';
import { deepFreeze } from '../utils/deepFreeze.js';

// Helper function for deep equality comparison with circular reference detection
const deepEqual = (a: unknown, b: unknown, visited?: WeakSet<object>): boolean => {
  if (a === b) {
    return true;
  }

  // Handle null/undefined
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }

  // Handle different types
  if (typeof a !== typeof b) {
    return false;
  }

  // Handle primitives
  if (typeof a !== 'object') {
    return a === b;
  }

  // Initialize visited set for circular reference detection
  if (!visited) {
    visited = new WeakSet();
  }

  // Check for circular references
  if (visited.has(a) || visited.has(b)) {
    // For circular references, consider them equal if they're the same reference
    return a === b;
  }

  // Add objects to visited set
  visited.add(a);
  visited.add(b);

  try {
    // Handle Dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // Handle RegExp
    if (a instanceof RegExp && b instanceof RegExp) {
      return a.source === b.source && a.flags === b.flags;
    }

    // Handle Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i], visited)) {
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
        val
      ] of a) {
        if (!b.has(key) || !deepEqual(val, b.get(key), visited)) {
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

    for (const key of keysA) {
      if (!keysB.includes(key)) {
        return false;
      }
      if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], visited)) {
        return false;
      }
    }

    return true;
  } finally {
    // Clean up visited set (objects will be automatically removed when out of scope)
    visited.delete(a);
    visited.delete(b);
  }
};

// Type-safe operator implementations
const arrayIncludes: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!Array.isArray(value)) {
    throw new Error(`ARRAY.INCLUDES requires value to be an array, got ${typeof value}`);
  }

  return value.includes(filterValue);
};

const arrayExcludes: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!Array.isArray(value)) {
    throw new Error(`ARRAY.EXCLUDES requires value to be an array, got ${typeof value}`);
  }

  return !value.includes(filterValue);
};

const arrayLength: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!Array.isArray(value)) {
    throw new Error(`ARRAY.LENGTH requires value to be an array, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`ARRAY.LENGTH requires filter value to be a number, got ${typeof filterValue}`);
  }

  return value.length === filterValue;
};

const arrayEmpty: OperatorFunction = (value: FilterValue, _filterValue?: FilterValue, _condition?: FilterCondition): boolean => {
  if (!Array.isArray(value)) {
    throw new Error(`ARRAY.EMPTY requires value to be an array, got ${typeof value}`);
  }

  return value.length === 0;
};

const arrayIdentical: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!Array.isArray(value)) {
    throw new Error(`ARRAY.IDENTICAL requires value to be an array, got ${typeof value}`);
  }
  if (!Array.isArray(filterValue)) {
    throw new Error(`ARRAY.IDENTICAL requires filter value to be an array, got ${typeof filterValue}`);
  }

  return deepEqual(value, filterValue);
};

const arrayNotEmpty: OperatorFunction = (value: FilterValue, _filterValue?: FilterValue, _condition?: FilterCondition): boolean => {
  if (!Array.isArray(value)) {
    throw new Error(`ARRAY.NOT_EMPTY requires value to be an array, got ${typeof value}`);
  }

  return value.length > 0;
};

const stringContains: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.CONTAINS requires value to be a string, got ${typeof value}`);
  }
  if (typeof filterValue !== 'string') {
    throw new Error(`STRING.CONTAINS requires filter value to be a string, got ${typeof filterValue}`);
  }

  // Default to case-sensitive if not specified
  const caseSensitive = condition?.caseSensitive ?? true;

  const val1 = caseSensitive ? value : value.toLowerCase();
  const val2 = caseSensitive ? filterValue : filterValue.toLowerCase();

  return val1.includes(val2);
};

const stringExcludes: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.EXCLUDES requires value to be a string, got ${typeof value}`);
  }
  if (typeof filterValue !== 'string') {
    throw new Error(`STRING.EXCLUDES requires filter value to be a string, got ${typeof filterValue}`);
  }

  // Default to case-sensitive if not specified
  const caseSensitive = condition?.caseSensitive ?? true;

  const val1 = caseSensitive ? value : value.toLowerCase();
  const val2 = caseSensitive ? filterValue : filterValue.toLowerCase();

  return !val1.includes(val2);
};

const stringStartsWith: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.STARTS_WITH requires value to be a string, got ${typeof value}`);
  }
  if (typeof filterValue !== 'string') {
    throw new Error(`STRING.STARTS_WITH requires filter value to be a string, got ${typeof filterValue}`);
  }

  // Default to case-sensitive if not specified
  const caseSensitive = condition?.caseSensitive ?? true;

  const val1 = caseSensitive ? value : value.toLowerCase();
  const val2 = caseSensitive ? filterValue : filterValue.toLowerCase();

  return val1.startsWith(val2);
};

const stringEndsWith: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.ENDS_WITH requires value to be a string, got ${typeof value}`);
  }
  if (typeof filterValue !== 'string') {
    throw new Error(`STRING.ENDS_WITH requires filter value to be a string, got ${typeof filterValue}`);
  }

  // Default to case-sensitive if not specified
  const caseSensitive = condition?.caseSensitive ?? true;

  const val1 = caseSensitive ? value : value.toLowerCase();
  const val2 = caseSensitive ? filterValue : filterValue.toLowerCase();

  return val1.endsWith(val2);
};

// MATCHES operator removed - use REGEX with pre-compiled RegExp objects only

const stringRegex: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.REGEX requires value to be a string, got ${typeof value}`);
  }

  // REGEX operator expects compiled RegExp objects only for performance
  if (!(filterValue instanceof RegExp)) {
    throw new Error('REGEX operator requires a pre-compiled RegExp object. Example: new RegExp("\\\\p{Emoji}", "u")');
  }

  return filterValue.test(value);
};

const stringLength: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.LENGTH requires value to be a string, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`STRING.LENGTH requires filter value to be a number, got ${typeof filterValue}`);
  }

  return value.length === filterValue;
};

const stringEmpty: OperatorFunction = (value: FilterValue, _filterValue?: FilterValue, _condition?: FilterCondition): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.EMPTY requires value to be a string, got ${typeof value}`);
  }

  return value.length === 0;
};

const stringNotEmpty: OperatorFunction = (value: FilterValue, _filterValue?: FilterValue, _condition?: FilterCondition): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.NOT_EMPTY requires value to be a string, got ${typeof value}`);
  }

  return value.length > 0;
};

const stringWordCount: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.WORD_COUNT requires value to be a string, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`STRING.WORD_COUNT requires filter value to be a number, got ${typeof filterValue}`);
  }

  // Split by whitespace and filter out empty strings
  const words = value.trim().split(/\s+/)
    .filter((word) => {return word.length > 0;});

  return words.length === filterValue;
};

const numberGreater: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'number') {
    throw new Error(`NUMBER.GREATER requires value to be a number, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`NUMBER.GREATER requires filter value to be a number, got ${typeof filterValue}`);
  }

  return value > filterValue;
};

const numberGreaterEqual: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'number') {
    throw new Error(`NUMBER.GREATER_EQUAL requires value to be a number, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`NUMBER.GREATER_EQUAL requires filter value to be a number, got ${typeof filterValue}`);
  }

  return value >= filterValue;
};

const numberLess: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'number') {
    throw new Error(`NUMBER.LESS requires value to be a number, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`NUMBER.LESS requires filter value to be a number, got ${typeof filterValue}`);
  }

  return value < filterValue;
};

const numberLessEqual: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'number') {
    throw new Error(`NUMBER.LESS_EQUAL requires value to be a number, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`NUMBER.LESS_EQUAL requires filter value to be a number, got ${typeof filterValue}`);
  }

  return value <= filterValue;
};

const numberBetween: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  // DEBUG: Log the condition parameter to understand its structure
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

  if (!Guard.isRecord(filterValue)) {
    throw new Error('NUMBER.BETWEEN requires filterValue to be an object with min and max properties: { min: number, max: number }');
  }
  let min = Number(Reflect.get(filterValue, 'min'));
  let max = Number(Reflect.get(filterValue, 'max'));

  // Validate numbers
  if (isNaN(min) || isNaN(max)) {
    return false;
  }

  // Handle Infinity
  if (!isFinite(min)) {
    min = -Infinity;
  }
  if (!isFinite(max)) {
    max = Infinity;
  }

  // Default to inclusive unless explicitly set to false
  const inclusive = condition?.inclusive !== false;

  return inclusive
    ? (value >= min && value <= max)
    : (value > min && value < max);
};

const numberOutside: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
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

  if (!Guard.isRecord(filterValue)) {
    throw new Error('NUMBER.OUTSIDE requires filterValue to be an object with min and max properties: { min: number, max: number }');
  }
  let min = Number(Reflect.get(filterValue, 'min'));
  let max = Number(Reflect.get(filterValue, 'max'));

  // Validate numbers
  if (isNaN(min) || isNaN(max)) {
    return false;
  }

  // Handle Infinity
  if (!isFinite(min)) {
    min = -Infinity;
  }
  if (!isFinite(max)) {
    max = Infinity;
  }

  // Default to inclusive unless explicitly set to false
  const inclusive = condition?.inclusive !== false;

  return inclusive
    ? (value < min || value > max)
    : (value <= min || value >= max);
};

const numberModulo: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  // Only work with numbers - no type coercion
  if (typeof value !== 'number') {
    throw new Error(`NUMBER.MODULO requires value to be a number, got ${typeof value}`);
  }

  // Only accept object format { divisor, remainder }
  if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue)) {
    throw new Error(`NUMBER.MODULO requires filter value to be an object with divisor and remainder properties, got ${typeof filterValue}`);
  }

  const {
    divisor, remainder
  } = filterValue as { 'divisor'?: unknown;
    'remainder'?: unknown };

  // Both must be numbers
  if (typeof divisor !== 'number' || typeof remainder !== 'number') {
    return false;
  }

  if (isNaN(value) || isNaN(divisor) || isNaN(remainder) || divisor === 0) {
    return false;
  }

  // Optimized modulo for power-of-2 divisors
  if (divisor > 0 && (divisor & (divisor - 1)) === 0) {
    return (value & (divisor - 1)) === remainder;
  }

  return value % divisor === remainder;
};

// Object operators
const objectEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return ObjectOperators.handleEquals(value, filterValue);
};

const objectNotEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return ObjectOperators.handleNotEquals(value, filterValue);
};

const objectIdentical: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return ObjectOperators.handleIdentical(value, filterValue);
};

const objectNotIdentical: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return ObjectOperators.handleNotIdentical(value, filterValue);
};

const objectHasProperty: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return ObjectOperators.handleHasProperty(value, filterValue);
};

const objectMissingProperty: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return ObjectOperators.handleMissingProperty(value, filterValue);
};

const objectPropertyCount: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return ObjectOperators.handlePropertyCount(value, filterValue);
};

const objectDeepIncludes: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return ObjectOperators.handleDeepIncludes(value, filterValue);
};

const objectEmpty: OperatorFunction = (value: FilterValue): boolean => {
  return ObjectOperators.handleEmpty(value);
};

const objectNotEmpty: OperatorFunction = (value: FilterValue): boolean => {
  return ObjectOperators.handleNotEmpty(value);
};

const objectSimilarity: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  return ObjectOperators.handleSimilarity(value, filterValue, condition);
};

// DATE.IDENTICAL removed - use DATE.EQUALS instead
// DATE.NOT_IDENTICAL removed - use DATE.NOT_EQUALS instead

const dateBetween: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  // Convert value to Date using parseDate converter (handles Unix/epoch timestamps)
  const dateValue = parseDate(value);

  // Check if date is valid
  if (!dateValue) {
    return false;
  }

  // Enforce object format { min, max } only
  if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue)) {
    throw new Error('DATE.BETWEEN requires filterValue to be an object with min and max properties: { min: date, max: date }');
  }

  if (!Guard.isRecord(filterValue)) {
    throw new Error('DATE range requires filterValue to be an object with min and max properties: { min: date, max: date }');
  }
  const startDate = Reflect.get(filterValue, 'min');
  const endDate = Reflect.get(filterValue, 'max');

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  // Check if dates are valid
  if (!start || !end) {
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
  const inclusive = condition?.inclusive !== false;

  return inclusive
    ? (timestamp >= startTime && timestamp <= endTime)
    : (timestamp > startTime && timestamp < endTime);
};

const dateOutside: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  // Convert value to Date using parseDate converter (handles Unix/epoch timestamps)
  const dateValue = parseDate(value);

  // Check if date is valid - invalid dates are considered "outside" any range
  if (!dateValue) {
    return true;
  }

  // Enforce object format { min, max } only
  if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue)) {
    throw new Error('DATE.OUTSIDE requires filterValue to be an object with min and max properties: { min: date, max: date }');
  }

  if (!Guard.isRecord(filterValue)) {
    throw new Error('DATE range requires filterValue to be an object with min and max properties: { min: date, max: date }');
  }
  const startDate = Reflect.get(filterValue, 'min');
  const endDate = Reflect.get(filterValue, 'max');

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  // Check if dates are valid
  if (!start || !end) {
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
  const inclusive = condition?.inclusive !== false;

  return inclusive
    ? (timestamp < startTime || timestamp > endTime)
    : (timestamp <= startTime || timestamp >= endTime);
};

const booleanTrue: OperatorFunction = (value: FilterValue): boolean => {
  return value === true;
};

const booleanFalse: OperatorFunction = (value: FilterValue): boolean => {
  return value === false;
};

const booleanTruthy: OperatorFunction = (value: FilterValue): boolean => {
  return Boolean(value);
};

const booleanFalsy: OperatorFunction = (value: FilterValue): boolean => {
  return !value;
};

const setHas: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!(value instanceof Set)) {
    throw new Error(`SET.HAS requires value to be a Set, got ${typeof value}`);
  }

  return Guard.isString(filterValue) && value.has(filterValue);
};

const setMissing: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!(value instanceof Set)) {
    throw new Error(`SET.MISSING requires value to be a Set, got ${typeof value}`);
  }

  return !Guard.isString(filterValue) || !value.has(filterValue);
};

const setSize: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!(value instanceof Set)) {
    throw new Error(`SET.SIZE requires value to be a Set, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`SET.SIZE requires filter value to be a number, got ${typeof filterValue}`);
  }

  return value.size === filterValue;
};

const setEmpty: OperatorFunction = (value: FilterValue, _filterValue?: FilterValue, _condition?: FilterCondition): boolean => {
  if (!(value instanceof Set)) {
    throw new Error(`SET.EMPTY requires value to be a Set, got ${typeof value}`);
  }

  return value.size === 0;
};

const setNotEmpty: OperatorFunction = (value: FilterValue, _filterValue?: FilterValue, _condition?: FilterCondition): boolean => {
  if (!(value instanceof Set)) {
    throw new Error(`SET.NOT_EMPTY requires value to be a Set, got ${typeof value}`);
  }

  return value.size > 0;
};

// Map operators
const mapEmpty: OperatorFunction = (value: FilterValue, _filterValue?: FilterValue, _condition?: FilterCondition): boolean => {
  if (!(value instanceof Map)) {
    throw new Error(`MAP.EMPTY requires value to be a Map, got ${typeof value}`);
  }

  return value.size === 0;
};

const mapNotEmpty: OperatorFunction = (value: FilterValue, _filterValue?: FilterValue, _condition?: FilterCondition): boolean => {
  if (!(value instanceof Map)) {
    throw new Error(`MAP.NOT_EMPTY requires value to be a Map, got ${typeof value}`);
  }

  return value.size > 0;
};

const mapHas: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!(value instanceof Map)) {
    throw new Error(`MAP.HAS requires value to be a Map, got ${typeof value}`);
  }

  return Guard.isString(filterValue) && value.has(filterValue);
};

const mapMissing: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!(value instanceof Map)) {
    throw new Error(`MAP.MISSING requires value to be a Map, got ${typeof value}`);
  }

  return !Guard.isString(filterValue) || !value.has(filterValue);
};

const mapSize: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!(value instanceof Map)) {
    throw new Error(`MAP.SIZE requires value to be a Map, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`MAP.SIZE requires filter value to be a number, got ${typeof filterValue}`);
  }

  return value.size === filterValue;
};

const mapEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!(value instanceof Map)) {
    throw new Error(`MAP.EQUALS requires value to be a Map, got ${typeof value}`);
  }
  if (!(filterValue instanceof Map)) {
    throw new Error(`MAP.EQUALS requires filter value to be a Map, got ${typeof filterValue}`);
  }

  return value === filterValue;
};

// ARRAY.IN/NOT_IN removed - duplicate functionality with ARRAY.INCLUDES/EXCLUDES

// String similarity using Levenshtein distance
const stringSimilarity: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.SIMILARITY requires value to be a string, got ${typeof value}`);
  }
  if (typeof filterValue !== 'string') {
    throw new Error(`STRING.SIMILARITY requires filter value to be a string, got ${typeof filterValue}`);
  }
  if (typeof condition?.threshold !== 'number') {
    throw new Error('STRING.SIMILARITY requires a numeric threshold parameter');
  }

  const threshold = condition.threshold;
  const caseSensitive = condition?.caseSensitive ?? true;

  const a = caseSensitive ? value : value.toLowerCase();
  const b = caseSensitive ? filterValue : filterValue.toLowerCase();

  // Levenshtein distance calculation
  const matrix = Array(b.length + 1).fill(null)
    .map(() => {return Array(a.length + 1).fill(null);});

  for (let i = 0; i <= a.length; i += 1) {
    matrix[0]![i] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[j]![0] = j;
  }

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[j]![i] = Math.min(
        matrix[j]![i - 1] + 1,
        matrix[j - 1]![i] + 1,
        matrix[j - 1]![i - 1] + indicator
      );
    }
  }

  const distance = matrix[b.length]![a.length];
  const maxLength = Math.max(a.length, b.length);
  const similarity = maxLength === 0 ? 1 : 1 - (distance / maxLength);

  return similarity >= threshold;
};

// Number similarity using relative difference
const numberSimilarity: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  if (typeof value !== 'number') {
    throw new Error(`NUMBER.SIMILARITY requires value to be a number, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`NUMBER.SIMILARITY requires filter value to be a number, got ${typeof filterValue}`);
  }
  if (typeof condition?.threshold !== 'number') {
    throw new Error('NUMBER.SIMILARITY requires a numeric threshold parameter');
  }

  const threshold = condition.threshold;

  if (value === filterValue) {
    return true;
  }
  if (Number.isNaN(value) && Number.isNaN(filterValue)) {
    return true;
  }
  if (Number.isNaN(value) || Number.isNaN(filterValue)) {
    return false;
  }
  if (!Number.isFinite(value) || !Number.isFinite(filterValue)) {
    return value === filterValue;
  }

  const max = Math.max(Math.abs(value), Math.abs(filterValue));

  if (max === 0) {
    return true;
  } // Both are zero

  const diff = Math.abs(value - filterValue);
  const similarity = Math.max(0, 1 - (diff / max));

  return similarity >= threshold;
};

// Array similarity using Jaccard index
const arraySimilarity: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  if (!Array.isArray(value)) {
    throw new Error(`ARRAY.SIMILARITY requires value to be an array, got ${typeof value}`);
  }
  if (!Array.isArray(filterValue)) {
    throw new Error(`ARRAY.SIMILARITY requires filter value to be an array, got ${typeof filterValue}`);
  }
  if (typeof condition?.threshold !== 'number') {
    throw new Error('ARRAY.SIMILARITY requires a numeric threshold parameter');
  }

  const threshold = condition.threshold;

  if (value.length === 0 && filterValue.length === 0) {
    return true;
  }
  if (value.length === 0 || filterValue.length === 0) {
    return 0 >= threshold;
  }

  const setA = new Set(value.map((item) => {return JSON.stringify(item);}));
  const setB = new Set(filterValue.map((item) => {return JSON.stringify(item);}));

  const intersection = new Set([...setA].filter((x) => {return setB.has(x);}));
  const union = new Set([
    ...setA,
    ...setB
  ]);

  const similarity = intersection.size / union.size; // Jaccard similarity

  return similarity >= threshold;
};


// Boolean similarity (exact match only)
const booleanSimilarity: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error(`BOOLEAN.SIMILARITY requires value to be a boolean, got ${typeof value}`);
  }
  if (typeof filterValue !== 'boolean') {
    throw new Error(`BOOLEAN.SIMILARITY requires filter value to be a boolean, got ${typeof filterValue}`);
  }
  if (typeof condition?.threshold !== 'number') {
    throw new Error('BOOLEAN.SIMILARITY requires a numeric threshold parameter');
  }

  const threshold = condition.threshold;
  const similarity = value === filterValue ? 1 : 0;

  return similarity >= threshold;
};

const valueExists: OperatorFunction = (value: FilterValue): boolean => {
  return value !== null && value !== undefined;
};

const valueAbsent: OperatorFunction = (value: FilterValue): boolean => {
  return value === null || value === undefined;
};

const valueDefined: OperatorFunction = (value: FilterValue): boolean => {
  return value !== undefined;
};

const valueUndefined: OperatorFunction = (value: FilterValue): boolean => {
  return value === undefined;
};

const valueNull: OperatorFunction = (value: FilterValue): boolean => {
  return value === null;
};

const valueNotNull: OperatorFunction = (value: FilterValue): boolean => {
  return value !== null;
};

// Cross-type equality operators
const crossEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return value === filterValue;
};

const crossNotEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return value !== filterValue;
};

// CROSS.EMPTY removed - use type-specific EMPTY operators instead
// CROSS.NOT_EMPTY removed - use type-specific NOT_EMPTY operators instead

// Type-specific EQUALS operators
const arrayEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!Array.isArray(value)) {
    throw new Error(`ARRAY.EQUALS requires value to be an array, got ${typeof value}`);
  }
  if (!Array.isArray(filterValue)) {
    throw new Error(`ARRAY.EQUALS requires filter value to be an array, got ${typeof filterValue}`);
  }

  return value === filterValue;
};

const arrayNotEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!Array.isArray(value)) {
    throw new Error(`ARRAY.NOT_EQUALS requires value to be an array, got ${typeof value}`);
  }
  if (!Array.isArray(filterValue)) {
    throw new Error(`ARRAY.NOT_EQUALS requires filter value to be an array, got ${typeof filterValue}`);
  }

  return value !== filterValue;
};

const arrayNotIdentical: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!Array.isArray(value)) {
    throw new Error(`ARRAY.NOT_IDENTICAL requires value to be an array, got ${typeof value}`);
  }
  if (!Array.isArray(filterValue)) {
    throw new Error(`ARRAY.NOT_IDENTICAL requires filter value to be an array, got ${typeof filterValue}`);
  }

  return !deepEqual(value, filterValue);
};

const stringEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.EQUALS requires value to be a string, got ${typeof value}`);
  }
  if (typeof filterValue !== 'string') {
    throw new Error(`STRING.EQUALS requires filter value to be a string, got ${typeof filterValue}`);
  }

  return value === filterValue;
};

const stringNotEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'string') {
    throw new Error(`STRING.NOT_EQUALS requires value to be a string, got ${typeof value}`);
  }
  if (typeof filterValue !== 'string') {
    throw new Error(`STRING.NOT_EQUALS requires filter value to be a string, got ${typeof filterValue}`);
  }

  return value !== filterValue;
};

// STRING.IDENTICAL removed - use STRING.EQUALS instead
// STRING.NOT_IDENTICAL removed - use STRING.NOT_EQUALS instead

const numberEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'number') {
    throw new Error(`NUMBER.EQUALS requires value to be a number, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`NUMBER.EQUALS requires filter value to be a number, got ${typeof filterValue}`);
  }

  return value === filterValue;
};

const numberNotEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'number') {
    throw new Error(`NUMBER.NOT_EQUALS requires value to be a number, got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`NUMBER.NOT_EQUALS requires filter value to be a number, got ${typeof filterValue}`);
  }

  return value !== filterValue;
};

// NUMBER.IDENTICAL removed - use NUMBER.EQUALS instead
// NUMBER.NOT_IDENTICAL removed - use NUMBER.NOT_EQUALS instead

const dateEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  const date1 = parseDate(value);
  const date2 = parseDate(filterValue);

  if (!date1 || !date2) {
    return false;
  }

  return date1.getTime() === date2.getTime();
};

const dateNotEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return !dateEquals(value, filterValue);
};


const booleanEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error(`BOOLEAN.EQUALS requires value to be a boolean, got ${typeof value}`);
  }
  if (typeof filterValue !== 'boolean') {
    throw new Error(`BOOLEAN.EQUALS requires filter value to be a boolean, got ${typeof filterValue}`);
  }

  return value === filterValue;
};

const booleanNotEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error(`BOOLEAN.NOT_EQUALS requires value to be a boolean, got ${typeof value}`);
  }
  if (typeof filterValue !== 'boolean') {
    throw new Error(`BOOLEAN.NOT_EQUALS requires filter value to be a boolean, got ${typeof filterValue}`);
  }

  return value !== filterValue;
};

// BOOLEAN.IDENTICAL removed - use BOOLEAN.EQUALS instead
// BOOLEAN.NOT_IDENTICAL removed - use BOOLEAN.NOT_EQUALS instead

const setEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!(value instanceof Set)) {
    throw new Error(`SET.EQUALS requires value to be a Set, got ${typeof value}`);
  }
  if (!(filterValue instanceof Set)) {
    throw new Error(`SET.EQUALS requires filter value to be a Set, got ${typeof filterValue}`);
  }

  return value === filterValue;
};

const setNotEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return !setEquals(value, filterValue);
};

const setIdentical: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!(value instanceof Set)) {
    throw new Error(`SET.IDENTICAL requires value to be a Set, got ${typeof value}`);
  }
  if (!(filterValue instanceof Set)) {
    throw new Error(`SET.IDENTICAL requires filter value to be a Set, got ${typeof filterValue}`);
  }

  return deepEqual(value, filterValue);
};

const setNotIdentical: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return !setIdentical(value, filterValue);
};

const mapNotEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return !mapEquals(value, filterValue);
};

const mapIdentical: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (!(value instanceof Map)) {
    throw new Error(`MAP.IDENTICAL requires value to be a Map, got ${typeof value}`);
  }
  if (!(filterValue instanceof Map)) {
    throw new Error(`MAP.IDENTICAL requires filter value to be a Map, got ${typeof filterValue}`);
  }

  return deepEqual(value, filterValue);
};

const mapNotIdentical: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return !mapIdentical(value, filterValue);
};


const valueType: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  if (typeof filterValue !== 'string') {
    throw new Error(`CROSS.TYPE requires filter value to be a string, got ${typeof filterValue}`);
  }
  if (value === null) {
    return filterValue === 'null';
  }
  if (value === undefined) {
    return filterValue === 'undefined';
  }

  // Handle primitive types (string, number, boolean, bigint, symbol)
  const primitiveType = typeof value;

  if (primitiveType !== 'object') {
    return primitiveType === filterValue;
  }

  // For objects, check both primitive type ('object') and constructor name
  if (value !== null) {
    // Check for common type aliases (lowercase)
    if (filterValue === 'array' && Array.isArray(value)) {
      return true;
    }

    // Check if they want the primitive type 'object' but exclude arrays
    if (filterValue === 'object') {
      return !Array.isArray(value);
    }

    // Then check constructor name (Object, Array, Date, etc.)
    return value.constructor?.name === filterValue;
  }

  return false;
};


/**
 * CROSS.SIMILARITY - Universal similarity operator with intelligent type handling
 *
 * This operator performs fuzzy matching across all data types with configurable thresholds.
 *
 * SAME-TYPE COMPARISONS (delegates to type-specific operators):
 * - string × string: Levenshtein distance (edit distance)
 * - number × number: Relative difference (1 - |a-b|/max(|a|,|b|))
 * - boolean × boolean: Exact match (1.0 or 0.0)
 * - array × array: Jaccard index (intersection/union)
 * - object × object: Key-value matching ratio
 *
 * CROSS-TYPE COMPARISONS:
 *
 * String × Number:
 * - Converts number to string representation
 * - Applies Levenshtein distance between strings
 * - Example: "123" × 123 = 1.0 (perfect match)
 * - Example: "12.5" × 12.5 = 1.0
 * - Example: "100" × 1000 = 0.75 (one character difference)
 *
 * String × Array:
 * - Compares string against each array element (converted to string)
 * - Returns highest similarity score found
 * - Example: "apple" × ["apple", "orange"] = 1.0
 * - Example: "appl" × ["apple", "application"] = 0.8 (matches "apple")
 *
 * Number × Array:
 * - Compares number against numeric elements in array
 * - Non-numeric elements are attempted to be converted
 * - Returns highest similarity score found
 * - Example: 42 × [41, 42, 43] = 1.0 (exact match)
 * - Example: 10 × [9, 11, "10"] = 1.0 (matches string "10")
 *
 * String × Object:
 * - Converts object to JSON string representation
 * - Applies string similarity between string and JSON
 * - Useful for searching within object structures
 *
 * Boolean × Other:
 * - Converts boolean to string ("true"/"false")
 * - Applies string comparison with other value's string form
 *
 * Null/Undefined Handling:
 * - null × null = 1.0
 * - undefined × undefined = 1.0
 * - null × undefined = 0.0
 * - null/undefined × any other = 0.0
 *
 * Default Fallback (any × any):
 * - Converts both values to strings
 * - Applies Levenshtein distance
 * - Works for any type combination not explicitly handled
 *
 * REQUIRED PARAMETERS:
 * - threshold: number (0.0-1.0) - Minimum similarity score to pass
 *
 * OPTIONAL PARAMETERS:
 * - caseSensitive: boolean (default: true) - For string comparisons
 *
 * @param value - The value from the data being filtered
 * @param filterValue - The value to compare against
 * @param conditionOrContext - Filter condition with threshold and options
 * @returns boolean - True if similarity >= threshold
 */
// Get normalized type names for cross-type comparisons
const getValueType = (val: FilterValue): string => {
  if (val === null) {
    return 'null';
  }
  if (val === undefined) {
    return 'undefined';
  }
  if (Array.isArray(val)) {
    return 'array';
  }
  if (val instanceof Date) {
    return 'date';
  }
  if (val instanceof RegExp) {
    return 'regexp';
  }
  if (Buffer.isBuffer(val)) {
    return 'buffer';
  }
  if (val instanceof ArrayBuffer) {
    return 'arraybuffer';
  }
  if (val instanceof Uint8Array) {
    return 'uint8array';
  }
  if (val instanceof DataView) {
    return 'dataview';
  }

  return typeof val;
};

// Levenshtein distance calculation for string similarity
const calculateStringSimilarity = (a: string, b: string): number => {
  const matrix = Array(b.length + 1).fill(null)
    .map(() => {return Array(a.length + 1).fill(null);});

  for (let i = 0; i <= a.length; i += 1) {
    matrix[0]![i] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[j]![0] = j;
  }

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[j]![i] = Math.min(
        matrix[j]![i - 1] + 1,
        matrix[j - 1]![i] + 1,
        matrix[j - 1]![i - 1] + indicator
      );
    }
  }

  return matrix[b.length]![a.length];
};

// Numeric similarity based on relative difference
const calculateNumericSimilarity = (a: number, b: number): number => {
  if (a === b) {
    return 1;
  }
  if (Number.isNaN(a) && Number.isNaN(b)) {
    return 1;
  }
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return 0;
  }
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return (a === b) ? 1 : 0;
  }

  const max = Math.max(Math.abs(a), Math.abs(b));

  if (max === 0) {
    return 1;
  } // Both are zero

  const diff = Math.abs(a - b);

  return Math.max(0, 1 - (diff / max));
};

// Array similarity based on content overlap
const calculateArraySimilarity = (a: unknown[], b: unknown[]): number => {
  if (a.length === 0 && b.length === 0) {
    return 1;
  }
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const setA = new Set(a.map((item) => {return JSON.stringify(item);}));
  const setB = new Set(b.map((item) => {return JSON.stringify(item);}));

  const intersection = new Set([...setA].filter((x) => {return setB.has(x);}));
  const union = new Set([
    ...setA,
    ...setB
  ]);

  return intersection.size / union.size; // Jaccard similarity
};

// Object similarity based on key-value pairs
const calculateObjectSimilarity = (a: Record<string, unknown>, b: Record<string, unknown>): number => {
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
    if (key in a && key in b) {
      try {
        if (JSON.stringify(a[key]) === JSON.stringify(b[key])) {
          matches++;
        }
      } catch {
        // Handle circular references - consider non-matching if can't stringify
        continue;
      }
    }
  }

  return matches / allKeys.size;
};

const valueSimilarity: OperatorFunction = (value: FilterValue, filterValue: FilterValue, conditionOrContext?: FilterCondition | { 'condition': FilterCondition,
  'options'?: Record<string, unknown> }): boolean => {
  // Handle both legacy condition format and new context format
  const nestedCondition = Guard.isRecord(conditionOrContext) ? Reflect.get(conditionOrContext, 'condition') : undefined;
  const condition = Guard.isRecord(nestedCondition) ? nestedCondition : conditionOrContext;

  // Threshold is required for SIMILARITY operator - no defaults allowed
  const rawThreshold = Guard.isRecord(condition) ? Reflect.get(condition, 'threshold') : undefined;
  if (!Guard.isNumber(rawThreshold)) {
    throw new Error('CROSS.SIMILARITY operator requires a numeric threshold parameter. No default threshold is allowed.');
  }
  const threshold = rawThreshold;
  const rawCaseSensitive = Guard.isRecord(condition) ? Reflect.get(condition, 'caseSensitive') : undefined;
  const caseSensitive = rawCaseSensitive ?? true;

  // Delegate to type-specific operators when both values are the same type
  if (typeof value === typeof filterValue) {
    if (typeof value === 'string' && typeof filterValue === 'string') {
      return stringSimilarity(value, filterValue, condition);
    }
    if (typeof value === 'number' && typeof filterValue === 'number') {
      return numberSimilarity(value, filterValue, condition);
    }
    if (typeof value === 'boolean' && typeof filterValue === 'boolean') {
      return booleanSimilarity(value, filterValue, condition);
    }
    if (Array.isArray(value) && Array.isArray(filterValue)) {
      return arraySimilarity(value, filterValue, condition);
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)
        && typeof filterValue === 'object' && filterValue !== null && !Array.isArray(filterValue)) {
      return objectSimilarity(value, filterValue, condition);
    }
  }


  // Cross-type similarity calculations
  const calculateCrossTypeSimilarityMixed = (val1: FilterValue, val2: FilterValue, type1: string, type2: string): number => {
    // String to Number: compare string representation with number
    if ((type1 === 'string' && type2 === 'number') || (type1 === 'number' && type2 === 'string')) {
      const str = type1 === 'string' ? val1 as string : val2 as string;
      const num = type1 === 'number' ? val1 as number : val2 as number;
      const numStr = String(num);

      const processedStr = caseSensitive ? str : str.toLowerCase();
      const processedNumStr = caseSensitive ? numStr : numStr.toLowerCase();

      const distance = calculateStringSimilarity(processedStr, processedNumStr);
      const maxLength = Math.max(processedStr.length, processedNumStr.length);

      if (maxLength === 0) {
        return 1;
      }

      return Math.max(0, 1 - (distance / maxLength));
    }

    // String to Array: compare string with array elements as strings
    if ((type1 === 'string' && type2 === 'array') || (type1 === 'array' && type2 === 'string')) {
      const str = type1 === 'string' ? val1 as string : val2 as string;
      const arr = type1 === 'array' ? val1 as unknown[] : val2 as unknown[];

      const arrStrings = arr.map((item) => {return String(item);});
      const processedStr = caseSensitive ? str : str.toLowerCase();

      let bestSimilarity = 0;

      for (const arrStr of arrStrings) {
        const processedArrStr = caseSensitive ? arrStr : arrStr.toLowerCase();
        const distance = calculateStringSimilarity(processedStr, processedArrStr);
        const maxLength = Math.max(processedStr.length, processedArrStr.length);

        if (maxLength > 0) {
          const similarity = Math.max(0, 1 - (distance / maxLength));

          bestSimilarity = Math.max(bestSimilarity, similarity);
        }
      }

      return bestSimilarity;
    }

    // Array to Number: compare array elements with number
    if ((type1 === 'array' && type2 === 'number') || (type1 === 'number' && type2 === 'array')) {
      const arr = type1 === 'array' ? val1 as unknown[] : val2 as unknown[];
      const num = type1 === 'number' ? val1 as number : val2 as number;

      let bestSimilarity = 0;

      for (const item of arr) {
        if (typeof item === 'number') {
          const similarity = calculateNumericSimilarity(item, num);

          bestSimilarity = Math.max(bestSimilarity, similarity);
        } else {
          // Try to convert to number
          const itemNum = Number(item);

          if (!Number.isNaN(itemNum)) {
            const similarity = calculateNumericSimilarity(itemNum, num);

            bestSimilarity = Math.max(bestSimilarity, similarity);
          }
        }
      }

      return bestSimilarity;
    }

    // Default cross-type: convert both to strings and compare
    const str1 = String(val1);
    const str2 = String(val2);
    const processedStr1 = caseSensitive ? str1 : str1.toLowerCase();
    const processedStr2 = caseSensitive ? str2 : str2.toLowerCase();

    const distance = calculateStringSimilarity(processedStr1, processedStr2);
    const maxLength = Math.max(processedStr1.length, processedStr2.length);

    if (maxLength === 0) {
      return 1;
    }

    return Math.max(0, 1 - (distance / maxLength));
  };

  // Main cross-type similarity calculation
  const calculateCrossTypeSimilarity = (val1: FilterValue, val2: FilterValue): number => {
    const type1 = getValueType(val1);
    const type2 = getValueType(val2);

    // Same types - use type-specific calculations
    if (type1 === type2) {
      switch (type1) {
        case 'array':
          return calculateArraySimilarity(val1 as unknown[], val2 as unknown[]);
        case 'boolean':
          return (val1 === val2) ? 1 : 0;
        case 'null':
        case 'undefined':
          return 1; // Both are same null/undefined type
        case 'number':
          return calculateNumericSimilarity(val1 as number, val2 as number);
        case 'object':
          return calculateObjectSimilarity(val1 as Record<string, unknown>, val2 as Record<string, unknown>);
        case 'string': {
          const s1 = caseSensitive ? val1 as string : (val1 as string).toLowerCase();
          const s2 = caseSensitive ? val2 as string : (val2 as string).toLowerCase();
          const distance = calculateStringSimilarity(s1, s2);
          const maxLength = Math.max(s1.length, s2.length);

          if (maxLength === 0) {
            return 1;
          }

          return Math.max(0, 1 - (distance / maxLength));
        }
        default:
          // For other types (date, regexp, etc), use JSON comparison
          try {
            return (JSON.stringify(val1) === JSON.stringify(val2)) ? 1 : 0;
          } catch {
            return (val1 === val2) ? 1 : 0;
          }
      }
    }

    // Different types - cross-type similarity
    return calculateCrossTypeSimilarityMixed(val1, val2, type1, type2);
  };

  const similarity = calculateCrossTypeSimilarity(value, filterValue);

  // Use a small epsilon to handle floating-point precision issues
  const epsilon = 1e-10;

  return similarity >= (threshold - epsilon);
};

// Operator enum with proper types
export interface OperatorEnum {
  readonly 'ARRAY': {
    readonly 'EMPTY': OperatorFunction;
    readonly 'EQUALS': OperatorFunction;
    readonly 'EXCLUDES': OperatorFunction;
    readonly 'IDENTICAL': OperatorFunction;
    readonly 'INCLUDES': OperatorFunction;
    readonly 'LENGTH': OperatorFunction;
    readonly 'NOT_EMPTY': OperatorFunction;
    readonly 'NOT_EQUALS': OperatorFunction;
    readonly 'NOT_IDENTICAL': OperatorFunction;
    readonly [key: string]: OperatorFunction;
    readonly 'SIMILARITY': OperatorFunction;
  };
  readonly 'BINARY': {
    readonly 'CONTAINS': OperatorFunction;
    readonly 'EMPTY': OperatorFunction;
    readonly 'ENDS_WITH': OperatorFunction;
    readonly 'EQUALS': OperatorFunction;
    readonly 'LENGTH': OperatorFunction;
    readonly 'NOT_EMPTY': OperatorFunction;
    readonly 'NOT_EQUALS': OperatorFunction;
    readonly [key: string]: OperatorFunction;
    readonly 'STARTS_WITH': OperatorFunction;
  };
  readonly 'BOOLEAN': {
    readonly 'EQUALS': OperatorFunction;
    readonly 'FALSE': OperatorFunction;
    readonly 'FALSY': OperatorFunction;
    readonly 'NOT_EQUALS': OperatorFunction;
    readonly [key: string]: OperatorFunction;
    readonly 'SIMILARITY': OperatorFunction;
    readonly 'TRUE': OperatorFunction;
    readonly 'TRUTHY': OperatorFunction;
  };
  readonly 'CROSS': {
    readonly 'ABSENT': OperatorFunction;
    readonly 'DEFINED': OperatorFunction;
    readonly 'EQUALS': OperatorFunction;
    readonly 'EXISTS': OperatorFunction;
    readonly 'NOT_EQUALS': OperatorFunction;
    readonly 'NOT_NULL': OperatorFunction;
    readonly 'NULL': OperatorFunction;
    readonly [key: string]: OperatorFunction;
    readonly 'SIMILARITY': OperatorFunction;
    readonly 'TYPE': OperatorFunction;
    readonly 'UNDEFINED': OperatorFunction;
  };
  readonly 'DATE': {
    readonly 'BETWEEN': OperatorFunction;
    readonly 'EQUALS': OperatorFunction;
    readonly 'IDENTICAL'?: OperatorFunction;
    readonly 'NOT_EQUALS': OperatorFunction;
    readonly 'NOT_IDENTICAL'?: OperatorFunction;
    readonly 'OUTSIDE': OperatorFunction;
  };
  readonly 'MAP': {
    readonly 'EMPTY': OperatorFunction;
    readonly 'EQUALS': OperatorFunction;
    readonly 'HAS': OperatorFunction;
    readonly 'MISSING': OperatorFunction;
    readonly 'NOT_EMPTY': OperatorFunction;
    readonly 'NOT_EQUALS': OperatorFunction;
    readonly [key: string]: OperatorFunction;
    readonly 'SIZE': OperatorFunction;
  };
  readonly 'NUMBER': {
    readonly 'BETWEEN': OperatorFunction;
    readonly 'EQUALS': OperatorFunction;
    readonly 'GREATER': OperatorFunction;
    readonly 'GREATER_EQUAL': OperatorFunction;
    readonly 'LESS': OperatorFunction;
    readonly 'LESS_EQUAL': OperatorFunction;
    readonly 'MODULO': OperatorFunction;
    readonly 'NOT_EQUALS': OperatorFunction;
    readonly 'OUTSIDE': OperatorFunction;
    readonly [key: string]: OperatorFunction;
    readonly 'SIMILARITY': OperatorFunction;
  };
  readonly 'OBJECT': {
    readonly 'DEEP_INCLUDES': OperatorFunction;
    readonly 'EMPTY': OperatorFunction;
    readonly 'EQUALS': OperatorFunction;
    readonly 'HAS_PROPERTY': OperatorFunction;
    readonly 'IDENTICAL': OperatorFunction;
    readonly 'MISSING_PROPERTY': OperatorFunction;
    readonly 'NOT_EMPTY': OperatorFunction;
    readonly 'NOT_EQUALS': OperatorFunction;
    readonly 'NOT_IDENTICAL': OperatorFunction;
    readonly 'PROPERTY_COUNT': OperatorFunction;
    readonly [key: string]: OperatorFunction;
    readonly 'SIMILARITY': OperatorFunction;
  };
  readonly [key: string]: Record<string, OperatorFunction>;
  readonly 'SET': {
    readonly 'EMPTY': OperatorFunction;
    readonly 'EQUALS': OperatorFunction;
    readonly 'HAS': OperatorFunction;
    readonly 'MISSING': OperatorFunction;
    readonly 'NOT_EMPTY': OperatorFunction;
    readonly 'NOT_EQUALS': OperatorFunction;
    readonly [key: string]: OperatorFunction;
    readonly 'SIZE': OperatorFunction;
  };
  readonly 'STRING': {
    readonly 'CONTAINS': OperatorFunction;
    readonly 'EMPTY': OperatorFunction;
    readonly 'ENDS_WITH': OperatorFunction;
    readonly 'EQUALS': OperatorFunction;
    readonly 'EXCLUDES': OperatorFunction;
    readonly 'LENGTH': OperatorFunction;
    readonly 'NOT_EMPTY': OperatorFunction;
    readonly 'NOT_EQUALS': OperatorFunction;
    readonly [key: string]: OperatorFunction;
    readonly 'REGEX': OperatorFunction;
    readonly 'SIMILARITY': OperatorFunction;
    readonly 'STARTS_WITH': OperatorFunction;
    readonly 'WORD_COUNT': OperatorFunction;
  };
}

export const Operator: OperatorEnum = deepFreeze({
  'ARRAY': {
    'EMPTY': arrayEmpty,
    'EQUALS': arrayEquals,
    'EXCLUDES': arrayExcludes,
    'IDENTICAL': arrayIdentical,
    'INCLUDES': arrayIncludes,
    'LENGTH': arrayLength,
    'NOT_EMPTY': arrayNotEmpty,
    'NOT_EQUALS': arrayNotEquals,
    'NOT_IDENTICAL': arrayNotIdentical,
    'SIMILARITY': arraySimilarity
  },
  'BINARY': {
    'CONTAINS': binaryContains,
    'EMPTY': binaryEmpty,
    'ENDS_WITH': binaryEndsWith,
    'EQUALS': binaryEquals,
    'LENGTH': binaryLength,
    'NOT_EMPTY': binaryNotEmpty,
    'NOT_EQUALS': binaryNotEquals,
    'STARTS_WITH': binaryStartsWith
  },
  'BOOLEAN': {
    'EQUALS': booleanEquals,
    'FALSE': booleanFalse,
    'FALSY': booleanFalsy,
    'NOT_EQUALS': booleanNotEquals,
    'SIMILARITY': booleanSimilarity,
    'TRUE': booleanTrue,
    'TRUTHY': booleanTruthy
  },
  'CROSS': {
    'ABSENT': valueAbsent,
    'DEFINED': valueDefined,
    'EQUALS': crossEquals,
    'EXISTS': valueExists,
    'NOT_EQUALS': crossNotEquals,
    'NOT_NULL': valueNotNull,
    'NULL': valueNull,
    'SIMILARITY': valueSimilarity,
    'TYPE': valueType,
    'UNDEFINED': valueUndefined
  },
  'DATE': {
    'BETWEEN': dateBetween,
    'EQUALS': dateEquals,
    'NOT_EQUALS': dateNotEquals,
    'OUTSIDE': dateOutside
  },
  'MAP': {
    'EMPTY': mapEmpty,
    'EQUALS': mapEquals,
    'HAS': mapHas,
    'IDENTICAL': mapIdentical,
    'MISSING': mapMissing,
    'NOT_EMPTY': mapNotEmpty,
    'NOT_EQUALS': mapNotEquals,
    'NOT_IDENTICAL': mapNotIdentical,
    'SIZE': mapSize
  },
  'NUMBER': {
    'BETWEEN': numberBetween,
    'EQUALS': numberEquals,
    'GREATER': numberGreater,
    'GREATER_EQUAL': numberGreaterEqual,
    'LESS': numberLess,
    'LESS_EQUAL': numberLessEqual,
    'MODULO': numberModulo,
    'NOT_EQUALS': numberNotEquals,
    'OUTSIDE': numberOutside,
    'SIMILARITY': numberSimilarity
  },
  'OBJECT': {
    'DEEP_INCLUDES': objectDeepIncludes,
    'EMPTY': objectEmpty,
    'EQUALS': objectEquals,
    'HAS_PROPERTY': objectHasProperty,
    'IDENTICAL': objectIdentical,
    'MISSING_PROPERTY': objectMissingProperty,
    'NOT_EMPTY': objectNotEmpty,
    'NOT_EQUALS': objectNotEquals,
    'NOT_IDENTICAL': objectNotIdentical,
    'PROPERTY_COUNT': objectPropertyCount,
    'SIMILARITY': objectSimilarity
  },
  'SET': {
    'EMPTY': setEmpty,
    'EQUALS': setEquals,
    'HAS': setHas,
    'IDENTICAL': setIdentical,
    'MISSING': setMissing,
    'NOT_EMPTY': setNotEmpty,
    'NOT_EQUALS': setNotEquals,
    'NOT_IDENTICAL': setNotIdentical,
    'SIZE': setSize
  },
  'STRING': {
    'CONTAINS': stringContains,
    'EMPTY': stringEmpty,
    'ENDS_WITH': stringEndsWith,
    'EQUALS': stringEquals,
    'EXCLUDES': stringExcludes,
    'LENGTH': stringLength,
    'NOT_EMPTY': stringNotEmpty,
    'NOT_EQUALS': stringNotEquals,
    'REGEX': stringRegex,
    'SIMILARITY': stringSimilarity,
    'STARTS_WITH': stringStartsWith,
    'WORD_COUNT': stringWordCount
  }
});
