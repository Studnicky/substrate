import { Predicates } from '@studnicky/types/browser';

import type { FilterValueEntity } from '../../FilterValueEntity.js';
import type { FilterConditionInterface } from '../../interfaces.js';

import { FilterOperatorError } from '../../errors/FilterOperatorError.js';

/**
 * Set-typed operator implementations
 */
export class SetOperators {
  static setHas(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.HAS requires value to be a Set, got ${typeof value}`, {});
    }

    const result = value.has(filterValue);

    return result;
  }

  static setMissing(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.MISSING requires value to be a Set, got ${typeof value}`, {});
    }

    const result = !value.has(filterValue);

    return result;
  }

  static setSize(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.SIZE requires value to be a Set, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`SET.SIZE requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value.size === filterValue;

    return result;
  }

  static setEmpty(value: unknown, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.EMPTY requires value to be a Set, got ${typeof value}`, {});
    }

    const result = value.size === 0;

    return result;
  }

  static setNotEmpty(value: unknown, _filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.NOT_EMPTY requires value to be a Set, got ${typeof value}`, {});
    }

    const result = value.size > 0;

    return result;
  }

  static setEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.EQUALS requires value to be a Set, got ${typeof value}`, {});
    }
    if (!(filterValue instanceof Set)) {
      throw new FilterOperatorError(`SET.EQUALS requires filter value to be a Set, got ${typeof filterValue}`, {});
    }

    const result = Predicates.areDeeplyEqual(value, filterValue);

    return result;
  }

  static setNotEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    const result = !SetOperators.setEquals(value, filterValue);

    return result;
  }

  static setIdentical(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (!(value instanceof Set)) {
      throw new FilterOperatorError(`SET.IDENTICAL requires value to be a Set, got ${typeof value}`, {});
    }
    if (!(filterValue instanceof Set)) {
      throw new FilterOperatorError(`SET.IDENTICAL requires filter value to be a Set, got ${typeof filterValue}`, {});
    }

    const result = Predicates.areDeeplyEqual(value, filterValue);

    return result;
  }

  static setNotIdentical(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    const result = !SetOperators.setIdentical(value, filterValue);

    return result;
  }
}
