import type { FilterValueEntity } from '../../FilterValueEntity.js';
import type { FilterConditionInterface } from '../../interfaces.js';

import { FilterOperatorError } from '../../errors/FilterOperatorError.js';
import { WHITESPACE_PATTERN } from '../constants/WhitespacePattern.js';

/**
 * String-typed operator implementations
 */
export class StringOperators {
  static stringContains(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
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

  static stringExcludes(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
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

  static stringStartsWith(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
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

  static stringEndsWith(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
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

  static stringRegex(value: unknown, filterValue: FilterValueEntity.Type): boolean {
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

  static stringLength(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'string') {
      throw new FilterOperatorError(`STRING.LENGTH requires value to be a string, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`STRING.LENGTH requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value.length === filterValue;

    return result;
  }

  static stringEmpty(value: unknown, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    if (typeof value !== 'string') {
      throw new FilterOperatorError(`STRING.EMPTY requires value to be a string, got ${typeof value}`, {});
    }

    const result = value.length === 0;

    return result;
  }

  static stringNotEmpty(value: unknown, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    if (typeof value !== 'string') {
      throw new FilterOperatorError(`STRING.NOT_EMPTY requires value to be a string, got ${typeof value}`, {});
    }

    const result = value.length > 0;

    return result;
  }

  static stringWordCount(value: unknown, filterValue: FilterValueEntity.Type): boolean {
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

  static stringEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'string') {
      throw new FilterOperatorError(`STRING.EQUALS requires value to be a string, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'string') {
      throw new FilterOperatorError(`STRING.EQUALS requires filter value to be a string, got ${typeof filterValue}`, {});
    }

    const result = value === filterValue;

    return result;
  }

  static stringNotEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
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
  static stringSimilarity(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
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
