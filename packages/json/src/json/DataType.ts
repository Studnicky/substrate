/** JSON-value type guards, cycle detection, and structural equality. */

import type { JsonObjectEntity } from '../entities/JsonObjectEntity.js';
import type { JsonValueEntity } from '../entities/JsonValueEntity.js';

export class DataType {
  /** Walk the parsed JSON value graph for cycles. */
  protected static walkForCycle(value: JsonValueEntity.Type, seen: WeakSet<object>): boolean {
    if (value === null || typeof value !== 'object') {
      return false;
    }
    if (seen.has(value)) {
      return true;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        const item = value.at(index);
        if (item !== undefined && this.walkForCycle(item, seen)) {
          return true;
        }
      }
      seen.delete(value);

      return false;
    }

    if (this.isPlainObject(value)) {
      const children = Object.values(value);
      const length = children.length;
      for (let index = 0; index < length; index += 1) {
        const item = children.at(index);
        if (item !== undefined && this.walkForCycle(item, seen)) {
          return true;
        }
      }
    }
    seen.delete(value);

    return false;
  }

  /** Compare two parsed JSON objects key-by-key. */
  protected static compareObjects(
    left: JsonObjectEntity.Type,
    right: JsonObjectEntity.Type
  ): boolean {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    const rightValues = new Map(Object.entries(right));
    const leftEntries = Object.entries(left);
    for (let index = 0; index < leftEntries.length; index += 1) {
      const entry = leftEntries[index];
      if (entry === undefined) {
        continue;
      }
      const [key, leftValue] = entry;
      const rightValue = rightValues.get(key);
      if (leftValue === undefined || rightValue === undefined) {
        return false;
      }
      if (!this.deepEqual(leftValue, rightValue)) {
        return false;
      }
    }

    return true;
  }

  /** Structural deep equality for parsed JSON values. */
  public static deepEqual(left: JsonValueEntity.Type, right: JsonValueEntity.Type): boolean {
    // NaN self-equality
    if (typeof left === 'number' && typeof right === 'number') {
      if (Number.isNaN(left) && Number.isNaN(right)) {
        return true;
      }
    }

    if (left === right) {
      return true;
    }

    if (left === null || right === null) {
      return false;
    }

    if (typeof left !== typeof right) {
      return false;
    }

    if (typeof left !== 'object' || typeof right !== 'object') {
      return false;
    }

    // Arrays
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        return false;
      }
      const length = left.length;
      for (let index = 0; index < length; index += 1) {
        const leftItem = left.at(index);
        const rightItem = right.at(index);
        if (leftItem === undefined || rightItem === undefined || !this.deepEqual(leftItem, rightItem)) {
          return false;
        }
      }
      return true;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      return false;
    }

    // Plain objects
    if (this.isPlainObject(left) && this.isPlainObject(right)) {
      const result = this.compareObjects(left, right);
      return result;
    }

    return false;
  }

  /**
   * Detect whether the value graph reachable from `value` contains a cycle.
   *
   * Walks parsed JSON plain objects and arrays only.
   */
  public static hasCycle(value: JsonValueEntity.Type): boolean {
    const result = this.walkForCycle(value, new WeakSet());
    return result;
  }

  /** Type guard for parsed JSON objects whose prototype is standard or null. */
  public static isPlainObject(value: JsonValueEntity.Type): value is JsonObjectEntity.Type {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const proto: unknown = Object.getPrototypeOf(value);

    const result = proto === Object.prototype || proto === null;
    return result;
  }

  /** Type guard for parsed non-null, non-array JSON objects. */
  public static isRecord(value: JsonValueEntity.Type): value is JsonObjectEntity.Type {
    const result = typeof value === 'object' && value !== null && !Array.isArray(value);
    return result;
  }
}
