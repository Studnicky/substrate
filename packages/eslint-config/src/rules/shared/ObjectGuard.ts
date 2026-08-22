/** Shared AST/value type-guard: narrows to a non-null, non-array object. */
export class ObjectGuard {
  public static isObject(value: unknown): value is Record<string, unknown> {
    const result = value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
    return result;
  }

  // Array.isArray's lib.es5.d.ts signature narrows `unknown` to `any[]`, which leaks
  // `any` into every downstream read. This predicate narrows to `readonly unknown[]`
  // instead, so callers keep unsafe-assignment protection on elements they read out.
  public static isArray(value: unknown): value is readonly unknown[] {
    const result = Array.isArray(value);
    return result;
  }
}
