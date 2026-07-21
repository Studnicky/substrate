/**
 * Clone — deep cloning with Map/Set/Date/Array support.
 *
 * Deep-clones plain objects, arrays, Map, Set and Date; other values (including
 * class instances) are returned as-is.
 *
 * Subclass `Clone` and override any `protected static clone*` step to customise
 * cloning behaviour.
 */

import { DataType } from './DataType.js';

export class Clone {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise cloning
  // ---------------------------------------------------------------------------

  /** Clone an array element-by-element. */
  protected static cloneArray(value: unknown[]): unknown[] {
    const result = value.map((item) => { const result = this.deep(item); return result; });
    return result;
  }

  /** Clone a Map, deep-cloning both keys and values. */
  protected static cloneMap(value: Map<unknown, unknown>): Map<unknown, unknown> {
    const cloned = new Map<unknown, unknown>();

    for (const [k, v] of value.entries()) {
      cloned.set(this.deep(k), this.deep(v));
    }

    return cloned;
  }

  /** Clone a Set, deep-cloning each member. */
  protected static cloneSet(value: Set<unknown>): Set<unknown> {
    const cloned = new Set<unknown>();

    for (const v of value.values()) {
      cloned.add(this.deep(v));
    }

    return cloned;
  }

  /** Clone a Date by timestamp. */
  protected static cloneDate(value: Date): Date {
    const result = new Date(value.getTime());
    return result;
  }

  /**
   * Clone a plain/class object by own enumerable keys.
   * Override to customise per-object behaviour (e.g. tag injection).
   */
  protected static cloneObject(value: Record<string, unknown>): Record<string, unknown> {
    const cloned: Record<string, unknown> = {};

    const keys = Object.keys(value);
    const keysLen = keys.length;
    for (let i = 0; i < keysLen; i += 1) {
      const key = keys[i]!;
      cloned[key] = this.deep(value[key]);
    }

    return cloned;
  }

  // ---------------------------------------------------------------------------
  // Public static API
  // ---------------------------------------------------------------------------

  /**
   * Recursively deep-clone a value.
   *
   * Handles: primitives, arrays, Map, Set, Date, and plain objects.
   * Class instances with custom prototypes are shallow-property-cloned
   * (own enumerable keys only) — use `structuredClone` when you need
   * transfer semantics for non-plain classes.
   */
  public static deep<T>(value: T): T;
  public static deep(value: unknown): unknown;
  public static deep(value: unknown): unknown {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return this.cloneArray(value);
    }

    if (value instanceof Map) {
      return this.cloneMap(value);
    }

    if (value instanceof Set) {
      return this.cloneSet(value);
    }

    if (value instanceof Date) {
      return this.cloneDate(value);
    }

    if (DataType.isRecord(value)) {
      return this.cloneObject(value);
    }

    return value;
  }

  /**
   * Shallow clone a plain-object record.
   */
  public static shallow<T extends Record<string, unknown>>(value: T): T {
    const clone: T = { ...value };
    return clone;
  }
}
