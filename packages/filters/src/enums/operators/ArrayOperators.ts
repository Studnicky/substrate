import { Predicates } from '@studnicky/types/browser';

import type { FilterValueEntity } from '../../FilterValueEntity.js';
import type { FilterConditionInterface } from '../../interfaces.js';

import { FilterOperatorError } from '../../errors/FilterOperatorError.js';

/**
 * Array-typed operator implementations
 */
export class ArrayOperators {
  static arrayIncludes(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.INCLUDES requires value to be an array, got ${typeof value}`, {});
    }

    const result = value.includes(filterValue);

    return result;
  }

  static arrayExcludes(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.EXCLUDES requires value to be an array, got ${typeof value}`, {});
    }

    const result = !value.includes(filterValue);

    return result;
  }

  static arrayLength(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.LENGTH requires value to be an array, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`ARRAY.LENGTH requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value.length === filterValue;

    return result;
  }

  static arrayEmpty(value: unknown, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.EMPTY requires value to be an array, got ${typeof value}`, {});
    }

    const result = value.length === 0;

    return result;
  }

  static arrayIdentical(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.IDENTICAL requires value to be an array, got ${typeof value}`, {});
    }
    if (!Array.isArray(filterValue)) {
      throw new FilterOperatorError(`ARRAY.IDENTICAL requires filter value to be an array, got ${typeof filterValue}`, {});
    }

    const result = Predicates.areDeeplyEqual(value, filterValue);

    return result;
  }

  static arrayNotEmpty(value: unknown, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.NOT_EMPTY requires value to be an array, got ${typeof value}`, {});
    }

    const result = value.length > 0;

    return result;
  }

  static arrayEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.EQUALS requires value to be an array, got ${typeof value}`, {});
    }
    if (!Array.isArray(filterValue)) {
      throw new FilterOperatorError(`ARRAY.EQUALS requires filter value to be an array, got ${typeof filterValue}`, {});
    }

    const result = Predicates.areDeeplyEqual(value, filterValue);

    return result;
  }

  static arrayNotEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.NOT_EQUALS requires value to be an array, got ${typeof value}`, {});
    }
    if (!Array.isArray(filterValue)) {
      throw new FilterOperatorError(`ARRAY.NOT_EQUALS requires filter value to be an array, got ${typeof filterValue}`, {});
    }

    const result = !Predicates.areDeeplyEqual(value, filterValue);

    return result;
  }

  static arrayNotIdentical(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(value)) {
      throw new FilterOperatorError(`ARRAY.NOT_IDENTICAL requires value to be an array, got ${typeof value}`, {});
    }
    if (!Array.isArray(filterValue)) {
      throw new FilterOperatorError(`ARRAY.NOT_IDENTICAL requires filter value to be an array, got ${typeof filterValue}`, {});
    }

    const result = !Predicates.areDeeplyEqual(value, filterValue);

    return result;
  }

  private static serializeItem(item: unknown): string | undefined {
    try {
      const result: string | undefined = JSON.stringify(item);

      return result;
    } catch (error) {
      throw new FilterOperatorError('Array item is not JSON-serializable', { 'cause': error });
    }
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
      const serialized = ArrayOperators.serializeItem(item);

      return serialized;
    }));
    const setB = new Set(value2.map((item) => {
      const serialized = ArrayOperators.serializeItem(item);

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

  static arraySimilarity(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
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
