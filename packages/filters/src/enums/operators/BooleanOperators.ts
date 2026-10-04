import type { FilterValueEntity } from '../../FilterValueEntity.js';
import type { FilterConditionInterface } from '../../interfaces.js';

import { FilterOperatorError } from '../../errors/FilterOperatorError.js';

/**
 * Boolean-typed operator implementations
 */
export class BooleanOperators {
  static booleanTrue(value: unknown): boolean {
    const result = value === true;

    return result;
  }

  static booleanFalse(value: unknown): boolean {
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

  static booleanEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'boolean') {
      throw new FilterOperatorError(`BOOLEAN.EQUALS requires value to be a boolean, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'boolean') {
      throw new FilterOperatorError(`BOOLEAN.EQUALS requires filter value to be a boolean, got ${typeof filterValue}`, {});
    }

    const result = value === filterValue;

    return result;
  }

  static booleanNotEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
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
  static booleanSimilarity(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
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
