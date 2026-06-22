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
      for (const item of value) {
        if (this.walkForCycle(item, seen)) {
          return true;
        }
      }
      seen.delete(value);

      return false;
    }

    if (this.isPlainObject(value)) {
      for (const child of Object.values(value)) {
        if (this.walkForCycle(child, seen)) {
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
    for (const [key, leftVal] of left) {
      if (!right.has(key)) {
        return false;
      }
      if (!this.deepEqual(leftVal, right.get(key))) {
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
    for (const item of left) {
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

    for (const key of leftKeys) {
      if (!(key in right)) {
        return false;
      }
      if (!this.deepEqual(left[key], right[key])) {
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
      return left.getTime() === right.getTime();
    }
    if (left instanceof Date || right instanceof Date) {
      return false;
    }

    // RegExp
    if (left instanceof RegExp && right instanceof RegExp) {
      return left.toString() === right.toString();
    }
    if (left instanceof RegExp || right instanceof RegExp) {
      return false;
    }

    // Set
    if (left instanceof Set && right instanceof Set) {
      return this.compareSets(left, right);
    }
    if (left instanceof Set || right instanceof Set) {
      return false;
    }

    // Map
    if (left instanceof Map && right instanceof Map) {
      return this.compareMaps(left, right);
    }
    if (left instanceof Map || right instanceof Map) {
      return false;
    }

    // Arrays
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        return false;
      }
      for (let i = 0; i < left.length; i++) {
        if (!this.deepEqual(left[i], right[i])) {
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
      return this.compareObjects(left, right);
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
    return this.walkForCycle(value, new WeakSet());
  }

  /** Type guard for plain objects whose prototype is `Object.prototype` or `null`. */
  public static isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const proto = Object.getPrototypeOf(value) as unknown;

    return proto === Object.prototype || proto === null;
  }

  /** Type guard for non-null, non-array objects (`Record<string, unknown>`). */
  public static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
