/** Shared AST/value type-guard: narrows to a non-null, non-array object. */
export class ObjectGuard {
  public static isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
  }
}
