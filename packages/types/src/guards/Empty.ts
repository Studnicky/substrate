/**
 * Producers and emptiness predicates for the five core collection types.
 *
 * Static producer methods return fresh empty instances on every call so
 * callers never share a mutable reference. Static predicate methods are
 * strict: `isObject` returns `false` for `null`, arrays, Maps, and Sets;
 * `isArray` returns `false` for non-Array iterables; and so on.
 *
 * All methods are monomorphic and use consistent object shapes so V8 can
 * inline-cache them without deoptimisation.
 */
import { Guard } from './Guard.js';

export class Empty {
  // ── Producers ────────────────────────────────────────────────────────────

  /** Returns a fresh empty string. */
  public static string(): string {
    const result = '';
    return result;
  }

  /** Returns a fresh empty plain object typed as `Record<string, never>`. */
  public static object(): Record<string, never> {
    const result: Record<string, never> = {};
    return result;
  }

  /** Returns a fresh empty array typed as `T[]`. */
  public static array<T>(): T[] {
    return [];
  }

  /** Returns a fresh empty `Map<K, V>`. */
  public static map<K, V>(): Map<K, V> {
    return new Map<K, V>();
  }

  /** Returns a fresh empty `Set<T>`. */
  public static set<T>(): Set<T> {
    return new Set<T>();
  }

  // ── Predicates ───────────────────────────────────────────────────────────

  /** Returns `true` when `value` is exactly the empty string `''`. */
  public static isString(value: unknown): boolean {
    return value === '';
  }

  /**
   * Returns `true` when `value` is a plain object with no own enumerable
   * keys. Returns `false` for `null`, arrays, Maps, Sets, and any other
   * non-plain-object value.
   *
   * Delegates the plain-object shape check to `Guard.isObject` — the
   * canonical predicate for the package — and adds only the emptiness check
   * on top, so the Map/Set exclusion lives in exactly one place.
   */
  public static isObject(value: unknown): boolean {
    if (!Guard.isObject(value)) {
      return false;
    }
    return Object.keys(value).length === 0;
  }

  /** Returns `true` when `value` is an `Array` with `length === 0`. */
  public static isArray(value: unknown): boolean {
    return Array.isArray(value) && value.length === 0;
  }

  /** Returns `true` when `value` is a `Map` with `size === 0`. */
  public static isMap(value: unknown): boolean {
    return value instanceof Map && value.size === 0;
  }

  /** Returns `true` when `value` is a `Set` with `size === 0`. */
  public static isSet(value: unknown): boolean {
    return value instanceof Set && value.size === 0;
  }
}
