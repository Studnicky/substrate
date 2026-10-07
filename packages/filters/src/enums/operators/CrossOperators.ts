
import { Predicates } from '#runtime';

import type { FilterValueEntity } from '../../FilterValueEntity.js';
import type { FilterConditionInterface } from '../../interfaces.js';

import { FilterOperatorError } from '../../errors/FilterOperatorError.js';
import { ObjectOperators } from '../../operators/ObjectOperators.js';
import { ArrayOperators } from './ArrayOperators.js';
import { BooleanOperators } from './BooleanOperators.js';
import { NumberOperators } from './NumberOperators.js';
import { StringOperators } from './StringOperators.js';

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
export class CrossOperators {
  static valueExists(value: unknown): boolean {
    const result = value !== null && value !== undefined;
    return result;
  }

  static valueAbsent(value: unknown): boolean {
    const result = value === null || value === undefined;
    return result;
  }

  static valueDefined(value: unknown): boolean {
    const result = value !== undefined;
    return result;
  }

  static valueUndefined(value: unknown): boolean {
    const result = value === undefined;
    return result;
  }

  static valueNull(value: unknown): boolean {
    const result = value === null;
    return result;
  }

  static valueNotNull(value: unknown): boolean {
    const result = value !== null;
    return result;
  }

  static crossEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    const result = value === filterValue;
    return result;
  }

  static crossNotEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    const result = value !== filterValue;
    return result;
  }

  static valueType(value: object | string | number | boolean | null | undefined, filterValue: FilterValueEntity.Type): boolean {
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
  static getValueType(value: unknown): string {
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

  static serializeComparableValue(value: unknown): string {
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

  static compareSameType(leftValue: unknown, rightValue: unknown, caseSensitive: boolean): number {
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
  static calculateCrossTypeSimilarityMixed(left: unknown, right: unknown, caseSensitive: boolean): number {
    if (Array.isArray(left) || Array.isArray(right)) {
      const result = CrossOperators.calculateArrayCrossTypeSimilarity(left, right, caseSensitive);

      return result;
    }

    const result = CrossOperators.calculateScalarCrossTypeSimilarity(left, right, caseSensitive);

    return result;
  }

  private static calculateArrayCrossTypeSimilarity(left: unknown, right: unknown, caseSensitive: boolean): number {
    if (typeof left === 'string' && Array.isArray(right)) {
      const result = CrossOperators.bestStringSimilarityAgainstArray(left, right, caseSensitive);

      return result;
    }
    if (Array.isArray(left) && typeof right === 'string') {
      const result = CrossOperators.bestStringSimilarityAgainstArray(right, left, caseSensitive);

      return result;
    }
    if (Array.isArray(left) && typeof right === 'number') {
      const result = CrossOperators.bestNumericSimilarityAgainstArray(right, left);

      return result;
    }
    if (typeof left === 'number' && Array.isArray(right)) {
      const result = CrossOperators.calculateArrayCrossTypeSimilarity(right, left, caseSensitive);

      return result;
    }

    const result = CrossOperators.serializedSimilarityFallback(left, right, caseSensitive);

    return result;
  }

  private static calculateScalarCrossTypeSimilarity(left: unknown, right: unknown, caseSensitive: boolean): number {
    if (typeof left === 'string' && typeof right === 'number') {
      const result = CrossOperators.calculateStringSimilarityScore(left, String(right), caseSensitive);

      return result;
    }
    if (typeof left === 'number' && typeof right === 'string') {
      const result = CrossOperators.calculateStringSimilarityScore(right, String(left), caseSensitive);

      return result;
    }

    const result = CrossOperators.serializedSimilarityFallback(left, right, caseSensitive);

    return result;
  }

  private static serializedSimilarityFallback(left: unknown, right: unknown, caseSensitive: boolean): number {
    const result = CrossOperators.calculateStringSimilarityScore(
      CrossOperators.serializeComparableValue(left),
      CrossOperators.serializeComparableValue(right),
      caseSensitive
    );

    return result;
  }

  private static bestStringSimilarityAgainstArray(text: string, array: unknown[], caseSensitive: boolean): number {
    let bestSimilarity = 0;

    for (let index = 0; index < array.length; index += 1) {
      const item: unknown = array[index];
      const similarity = CrossOperators.calculateStringSimilarityScore(text, CrossOperators.serializeComparableValue(item), caseSensitive);

      bestSimilarity = Math.max(bestSimilarity, similarity);
    }

    return bestSimilarity;
  }

  private static bestNumericSimilarityAgainstArray(target: number, array: unknown[]): number {
    let bestSimilarity = 0;

    for (let index = 0; index < array.length; index += 1) {
      const item: unknown = array[index];
      const itemNumber = typeof item === 'number' ? item : Number(item);

      if (!Number.isNaN(itemNumber)) {
        bestSimilarity = Math.max(
          bestSimilarity,
          NumberOperators.calculateNumericSimilarity(itemNumber, target)
        );
      }
    }

    return bestSimilarity;
  }

  // Main cross-type similarity calculation
  static calculateCrossTypeSimilarity(left: unknown, right: unknown, caseSensitive: boolean): number {
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

  static valueSimilarity(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    const condition = options?.condition;
    const threshold = CrossOperators.resolveSimilarityThreshold(condition);
    const caseSensitive = CrossOperators.resolveCaseSensitive(condition);

    // Delegate to type-specific operators when both values are the same type
    if (typeof value === typeof filterValue) {
      const sameTypeResult = CrossOperators.dispatchSameTypeSimilarity(value, filterValue, options);

      if (sameTypeResult !== null) {
        return sameTypeResult;
      }
    }

    const similarity = CrossOperators.calculateCrossTypeSimilarity(value, filterValue, caseSensitive);

    // Use a small epsilon to handle floating-point precision issues
    const epsilon = 1e-10;

    const result = similarity >= (threshold - epsilon);

    return result;
  }

  // Threshold is required for SIMILARITY operator - no defaults allowed
  private static resolveSimilarityThreshold(condition: FilterConditionInterface | undefined): number {
    const rawThreshold: unknown = condition?.threshold;

    if (!Predicates.isNumber(rawThreshold)) {
      throw new FilterOperatorError('CROSS.SIMILARITY operator requires a numeric threshold parameter. No default threshold is allowed.', {});
    }

    return rawThreshold;
  }

  private static resolveCaseSensitive(condition: FilterConditionInterface | undefined): boolean {
    const rawCaseSensitive: unknown = condition?.caseSensitive;
    const result = Predicates.isBoolean(rawCaseSensitive) ? rawCaseSensitive : true;

    return result;
  }

  /** `null` when `value`/`filterValue` are the same JS `typeof` but not one of the dispatched shapes. */
  private static dispatchSameTypeSimilarity(
    value: unknown,
    filterValue: FilterValueEntity.Type,
    options: { 'condition'?: FilterConditionInterface, 'data'?: unknown } | undefined
  ): boolean | null {
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
    if (CrossOperators.isPlainObjectPair(value, filterValue)) {
      const result = ObjectOperators.handleSimilarity(value, filterValue, options);

      return result;
    }

    return null;
  }

  private static isPlainObjectPair(value: unknown, filterValue: unknown): boolean {
    const result = typeof value === 'object' && value !== null && !Array.isArray(value)
      && typeof filterValue === 'object' && filterValue !== null && !Array.isArray(filterValue);

    return result;
  }
}
