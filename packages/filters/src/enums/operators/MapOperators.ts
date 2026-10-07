
import { Predicates } from '#runtime';

import type { FilterValueEntity } from '../../FilterValueEntity.js';
import type { FilterConditionInterface } from '../../interfaces.js';

import { FilterOperatorError } from '../../errors/FilterOperatorError.js';

/**
 * Map-typed operator implementations
 */
export class MapOperators {
  static mapEmpty(value: unknown, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.EMPTY requires value to be a Map, got ${typeof value}`, {});
    }

    const result = value.size === 0;

    return result;
  }

  static mapNotEmpty(value: unknown, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.NOT_EMPTY requires value to be a Map, got ${typeof value}`, {});
    }

    const result = value.size > 0;

    return result;
  }

  static mapHas(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.HAS requires value to be a Map, got ${typeof value}`, {});
    }

    const result = value.has(filterValue);

    return result;
  }

  static mapMissing(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.MISSING requires value to be a Map, got ${typeof value}`, {});
    }

    const result = !value.has(filterValue);

    return result;
  }

  static mapSize(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.SIZE requires value to be a Map, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`MAP.SIZE requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value.size === filterValue;

    return result;
  }

  static mapEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.EQUALS requires value to be a Map, got ${typeof value}`, {});
    }
    if (!(filterValue instanceof Map)) {
      throw new FilterOperatorError(`MAP.EQUALS requires filter value to be a Map, got ${typeof filterValue}`, {});
    }

    const result = Predicates.areDeeplyEqual(value, filterValue);

    return result;
  }

  static mapNotEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    const result = !MapOperators.mapEquals(value, filterValue);

    return result;
  }

  static mapIdentical(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Map)) {
      throw new FilterOperatorError(`MAP.IDENTICAL requires value to be a Map, got ${typeof value}`, {});
    }
    if (!(filterValue instanceof Map)) {
      throw new FilterOperatorError(`MAP.IDENTICAL requires filter value to be a Map, got ${typeof filterValue}`, {});
    }

    const result = Predicates.areDeeplyEqual(value, filterValue);

    return result;
  }

  static mapNotIdentical(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    const result = !MapOperators.mapIdentical(value, filterValue);

    return result;
  }
}
