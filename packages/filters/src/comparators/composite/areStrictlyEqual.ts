/**
 * Strict deep equality comparison (like Jest's toStrictEqual)
 * Checks object keys, undefined properties, and array sparseness
 */

import { Predicates } from '@studnicky/types/node';

import type {
  FilterConditionInterface
} from '../../interfaces.js';

/**
 * Performs strict deep equality comparison like Jest's toStrictEqual
 * - Checks that objects have the same keys (including undefined values)
 * - Checks array sparseness (undefined vs missing indices)
 * - Checks object prototypes and constructors
 * - More strict than regular deep equality
 */
export class AreStrictlyEqual {
  static areStrictlyEqual<Value>(
    value: Value,
    filterValue: Value,
    condition: FilterConditionInterface = {}
  ): boolean {
    const nanResult = AreStrictlyEqual.compareNaN(value, filterValue);

    if (nanResult !== null) {
      return nanResult;
    }

    // Quick reference check
    if (Object.is(value, filterValue)) {
      return true;
    }

    // Must be same type
    if (!Predicates.areTypesSame(value, filterValue)) {
      return false;
    }

    const nullishResult = AreStrictlyEqual.compareNullish(value, filterValue);

    if (nullishResult !== null) {
      return nullishResult;
    }

    const structuralResult = AreStrictlyEqual.compareStructural(value, filterValue, condition);

    if (structuralResult !== null) {
      return structuralResult;
    }

    // Primitives
    const result = value === filterValue;

    return result;
  }

  /** NaN should equal NaN; `null` means neither operand is a NaN number. */
  private static compareNaN<Value>(value: Value, filterValue: Value): boolean | null {
    if (!Predicates.isNumber(value) || !Predicates.isNumber(filterValue)) {
      return null;
    }
    if (!Number.isNaN(value) && !Number.isNaN(filterValue)) {
      return null;
    }

    const result = Predicates.areNaNEqual(value, filterValue);

    return result;
  }

  /** `null` when neither operand is null or undefined. */
  private static compareNullish<Value>(value: Value, filterValue: Value): boolean | null {
    if (Predicates.isNull(value) || Predicates.isNull(filterValue) || Predicates.isUndefined(value) || Predicates.isUndefined(filterValue)) {
      const result = value === filterValue;

      return result;
    }

    return null;
  }

  /** `null` when neither operand is a recognized structural (collection or container) shape. */
  private static compareStructural<Value>(value: Value, filterValue: Value, condition: FilterConditionInterface): boolean | null {
    const collectionResult = AreStrictlyEqual.compareCollection(value, filterValue, condition);

    if (collectionResult !== null) {
      return collectionResult;
    }

    const containerResult = AreStrictlyEqual.compareContainer(value, filterValue, condition);

    return containerResult;
  }

  private static compareCollection<Value>(value: Value, filterValue: Value, condition: FilterConditionInterface): boolean | null {
    if (Predicates.isArray(value) && Predicates.isArray(filterValue)) {
      const result = AreStrictlyEqual.areArraysStrictlyEqual(value, filterValue, condition);

      return result;
    }
    if (Predicates.isDate(value) && Predicates.isDate(filterValue)) {
      const result = value.getTime() === filterValue.getTime();

      return result;
    }
    if (Predicates.isRegExp(value) && Predicates.isRegExp(filterValue)) {
      const result = value.toString() === filterValue.toString();

      return result;
    }

    return null;
  }

  private static compareContainer<Value>(value: Value, filterValue: Value, condition: FilterConditionInterface): boolean | null {
    if (Predicates.isSet(value) && Predicates.isSet(filterValue)) {
      const result = AreStrictlyEqual.areSetsStrictlyEqual(value, filterValue);

      return result;
    }
    if (Predicates.isMap(value) && Predicates.isMap(filterValue)) {
      const result = AreStrictlyEqual.areMapsStrictlyEqual(value, filterValue, condition);

      return result;
    }
    if (Predicates.isRecord(value) && Predicates.isRecord(filterValue)) {
      // Must be instances of the same constructor
      if (value.constructor !== filterValue.constructor) {
        return false;
      }

      const result = AreStrictlyEqual.areObjectsStrictlyEqual(value, filterValue, condition);

      return result;
    }

    return null;
  }

  private static areSetsStrictlyEqual(value: ReadonlySet<unknown>, filterValue: ReadonlySet<unknown>): boolean {
    if (value.size !== filterValue.size) {
      return false;
    }
    for (const item of value) {
      if (!filterValue.has(item)) {
        return false;
      }
    }

    return true;
  }

  private static areMapsStrictlyEqual(
    value: ReadonlyMap<unknown, unknown>,
    filterValue: ReadonlyMap<unknown, unknown>,
    condition: FilterConditionInterface
  ): boolean {
    if (value.size !== filterValue.size) {
      return false;
    }
    for (const [
      key,
      mapValue
    ] of value) {
      if (!filterValue.has(key) || !AreStrictlyEqual.areStrictlyEqual(mapValue, filterValue.get(key), condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if two arrays are strictly equal including sparse array handling
   */
  private static areArraysStrictlyEqual(value: readonly unknown[], filterValue: readonly unknown[], condition: FilterConditionInterface = {}): boolean {
    if (value.length !== filterValue.length) {
      return false;
    }

    // Check for sparse arrays - must have same indices defined
    const keys1 = Object.keys(value).toSorted();
    const keys2 = Object.keys(filterValue).toSorted();

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (let i = 0; i < keys1.length; i++) {
      if (keys1[i] !== keys2[i]) {
        return false;
      }
    }

    // Compare all elements including undefined
    for (let i = 0; i < value.length; i++) {
      if (i in value !== i in filterValue) {
        // One has undefined at this index, other doesn't
        return false;
      }
      if (i in value && !AreStrictlyEqual.areStrictlyEqual(value[i], filterValue[i], condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if two objects are strictly equal including undefined properties
   */
  private static areObjectsStrictlyEqual(
    value: Record<string, unknown>,
    filterValue: Record<string, unknown>,
    condition: FilterConditionInterface
  ): boolean {
    // Get all keys including those with undefined values
    const keys1 = Object.keys(value).toSorted();
    const keys2 = Object.keys(filterValue).toSorted();

    // Must have exact same keys
    if (keys1.length !== keys2.length) {
      return false;
    }

    for (let i = 0; i < keys1.length; i++) {
      if (keys1[i] !== keys2[i]) {
        return false;
      }
    }

    // Compare all properties including undefined ones
    const keysLength = keys1.length;

    for (let i = 0; i < keysLength; i++) {
      const key = keys1[i];

      if (key !== undefined && !AreStrictlyEqual.areStrictlyEqual(value[key], filterValue[key], condition)) {
        return false;
      }
    }

    // Check prototypes are the same
    if (Object.getPrototypeOf(value) !== Object.getPrototypeOf(filterValue)) {
      return false;
    }

    return true;
  }
}
