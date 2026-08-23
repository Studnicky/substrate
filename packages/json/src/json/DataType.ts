/**
 * DataType — type guards and deep structural equality.
 *
 * Deep structural equality across primitives, NaN, Date, RegExp, Set, Map, arrays
 * and plain objects, with cycle detection.
 *
 * Subclass `DataType` and override `protected static compare*` steps or
 * `walkForCycle` to customise equality and cycle-detection.
 */

export class DataType {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise comparison
  // ---------------------------------------------------------------------------

  /** Walk the value graph for cycles. Override in subclasses to customise. */
  protected static walkForCycle(value: unknown, seen: WeakSet<object>): boolean {
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
        if (this.walkForCycle(value[index], seen)) {
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
        if (this.walkForCycle(children[index], seen)) {
          return true;
        }
      }
    }
    seen.delete(value);

    return false;
  }

  /** Compare two Maps entry-by-entry. */
  protected static compareMaps(left: Map<unknown, unknown>, right: Map<unknown, unknown>): boolean {
    if (left.size !== right.size) {
      return false;
    }
    for (const [key, leftValue] of left.entries()) {
      if (!right.has(key)) {
        return false;
      }
      if (!this.deepEqual(leftValue, right.get(key))) {
        return false;
      }
    }
    return true;
  }

  /** Compare two Sets by membership. */
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

  /** Compare two plain objects key-by-key. */
  protected static compareObjects(
    left: Record<string, unknown>,
    right: Record<string, unknown>
  ): boolean {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    const length = leftKeys.length;
    for (let index = 0; index < length; index += 1) {
      const key = leftKeys[index];
      if (key === undefined) {
        continue;
      }
      if (!(key in right)) {
        return false;
      }
      if (!this.deepEqual(Reflect.get(left, key), Reflect.get(right, key))) {
        return false;
      }
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Public static API
  // ---------------------------------------------------------------------------

  /**
   * Structural deep equality for any JavaScript value.
   *
   * Handles: primitives, NaN, Date, RegExp, Set, Map, Array, plain objects.
   * Does NOT deeply merge class instances beyond the types listed above.
   */
  public static deepEqual(left: unknown, right: unknown): boolean {
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

    // Date
    if (left instanceof Date && right instanceof Date) {
      const result = left.getTime() === right.getTime();
      return result;
    }
    if (left instanceof Date || right instanceof Date) {
      return false;
    }

    // RegExp
    if (left instanceof RegExp && right instanceof RegExp) {
      const result = left.toString() === right.toString();
      return result;
    }
    if (left instanceof RegExp || right instanceof RegExp) {
      return false;
    }

    // Set
    if (left instanceof Set && right instanceof Set) {
      const result = this.compareSets(left, right);
      return result;
    }
    if (left instanceof Set || right instanceof Set) {
      return false;
    }

    // Map
    if (left instanceof Map && right instanceof Map) {
      const result = this.compareMaps(left, right);
      return result;
    }
    if (left instanceof Map || right instanceof Map) {
      return false;
    }

    // Arrays
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        return false;
      }
      const length = left.length;
      for (let index = 0; index < length; index += 1) {
        if (!this.deepEqual(left[index], right[index])) {
          return false;
        }
      }
      return true;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      return false;
    }

    // Plain objects
    if (this.isRecord(left) && this.isRecord(right)) {
      const result = this.compareObjects(left, right);
      return result;
    }

    return false;
  }

  /**
   * Detect whether the value graph reachable from `value` contains a cycle.
   *
   * Walks plain objects and arrays only. Primitives and other reference types
   * (Date, Map, Set, class instances) are treated as leaves.
   */
  public static hasCycle(value: unknown): boolean {
    const result = this.walkForCycle(value, new WeakSet());
    return result;
  }

  /** Type guard for plain objects whose prototype is `Object.prototype` or `null`. */
  public static isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const proto: unknown = Object.getPrototypeOf(value);

    const result = proto === Object.prototype || proto === null;
    return result;
  }

  /** Type guard for non-null, non-array objects (`Record<string, unknown>`). */
  public static isRecord(value: unknown): value is Record<string, unknown> {
    const result = typeof value === 'object' && value !== null && !Array.isArray(value);
    return result;
  }
}
