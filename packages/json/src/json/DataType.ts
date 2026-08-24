/** Value type guards, cycle detection, and structural equality. */

import { Guard } from '@studnicky/types';

export class DataType {
  protected static walkForCycle(value: unknown, seen: WeakSet<object>): boolean {
    if (!Guard.isObjectLike(value)) {
      return false;
    }
    if (seen.has(value)) {
      return true;
    }
    seen.add(value);
    if (Array.isArray(value)) {
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        const item: unknown = value.at(index);
        if (this.walkForCycle(item, seen)) {
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
        const child = children.at(index);
        if (this.walkForCycle(child, seen)) {
          return true;
        }
      }
    }
    seen.delete(value);
    return false;
  }

  protected static compareMaps(left: Map<unknown, unknown>, right: Map<unknown, unknown>): boolean {
    if (left.size !== right.size) {
      return false;
    }
    for (const [key, leftValue] of left.entries()) {
      if (!right.has(key)) {
        return false;
      }
      const rightValue = right.get(key);
      if (!this.deepEqual(leftValue, rightValue)) {
        return false;
      }
    }
    return true;
  }

  protected static compareSets(left: Set<unknown>, right: Set<unknown>): boolean {
    if (left.size !== right.size) {
      return false;
    }
    for (const item of left.values()) {
      if (!right.has(item)) {
        return false;
      }
    }
    return true;
  }

  protected static compareObjects(left: object, right: object): boolean {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    const length = leftKeys.length;
    for (let index = 0; index < length; index += 1) {
      const key = leftKeys.at(index);
      if (key === undefined) {
        continue;
      }
      if (!(key in right)) {
        return false;
      }
      const leftValue: unknown = Reflect.get(left, key);
      const rightValue: unknown = Reflect.get(right, key);
      if (!this.deepEqual(leftValue, rightValue)) {
        return false;
      }
    }
    return true;
  }

  /** Structural equality for arbitrary JavaScript values. */
  public static deepEqual(left: unknown, right: unknown): boolean {
    if (typeof left === 'number' && typeof right === 'number' && Number.isNaN(left) && Number.isNaN(right)) {
      return true;
    }
    if (Object.is(left, right) || (typeof left === 'number' && typeof right === 'number' && Number(left) === Number(right))) {
      return true;
    }
    if (left === null || right === null || typeof left !== typeof right) {
      return false;
    }
    if (!Guard.isObjectLike(left) || !Guard.isObjectLike(right)) {
      return false;
    }
    if (left instanceof Date && right instanceof Date) {
      const result = left.getTime() === right.getTime();
      return result;
    }
    if (left instanceof Date || right instanceof Date) {
      return false;
    }
    if (left instanceof RegExp && right instanceof RegExp) {
      const result = left.toString() === right.toString();
      return result;
    }
    if (left instanceof RegExp || right instanceof RegExp) {
      return false;
    }
    if (left instanceof Set && right instanceof Set) {
      const result = this.compareSets(left, right);
      return result;
    }
    if (left instanceof Set || right instanceof Set) {
      return false;
    }
    if (left instanceof Map && right instanceof Map) {
      const result = this.compareMaps(left, right);
      return result;
    }
    if (left instanceof Map || right instanceof Map) {
      return false;
    }
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        return false;
      }
      const length = left.length;
      for (let index = 0; index < length; index += 1) {
        const leftItem: unknown = left.at(index);
        const rightItem: unknown = right.at(index);
        if (!this.deepEqual(leftItem, rightItem)) {
          return false;
        }
      }
      return true;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      return false;
    }
    if (this.isRecord(left) && this.isRecord(right)) {
      const result = this.compareObjects(left, right);
      return result;
    }
    return false;
  }

  public static hasCycle(value: unknown): boolean {
    const result = this.walkForCycle(value, new WeakSet());
    return result;
  }

  public static isPlainObject<T>(value: T): value is Record<string, unknown> & T {
    const result = Guard.isPlainObject(value);
    return result;
  }

  public static isRecord<T>(value: T): value is Record<string, unknown> & T {
    const result = Guard.isRecord(value);
    return result;
  }
}
