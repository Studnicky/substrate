/**
 * Producers of fresh empty instances for the five core collection types.
 *
 * Every method returns a fresh instance on every call so callers never share
 * a mutable reference. Emptiness predicates live on `Predicates`
 * (`isEmptyString`, `isEmptyPlainObject`, `isEmptyArray`, `isEmptyMap`,
 * `isEmptySet`) — this class is construction only, not checking.
 *
 * All methods are monomorphic and use consistent object shapes so V8 can
 * inline-cache them without deoptimisation.
 */
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
    const result: T[] = [];
    return result;
  }

  /** Returns a fresh empty `Map<K, V>`. */
  public static map<K, V>(): Map<K, V> {
    const result = new Map<K, V>();
    return result;
  }

  /** Returns a fresh empty `Set<T>`. */
  public static set<T>(): Set<T> {
    const result = new Set<T>();
    return result;
  }
}
