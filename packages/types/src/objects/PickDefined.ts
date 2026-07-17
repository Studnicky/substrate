/**
 * Strips `undefined`-valued own properties from a record, narrowing each
 * remaining value's type away from `undefined`. Built for fluent builders
 * that assemble an options object from a mix of required and optional
 * private fields: `pickDefined({ requestsPerSecond, burstSize, clock })`
 * replaces a manual spread-ternary chain in one call while preserving
 * exact per-key type narrowing.
 *
 * The single `as` on the accumulator is unavoidable: TypeScript cannot
 * prove, key-by-key during a runtime loop, that a partially built object
 * satisfies the fully-narrowed mapped type. The `value !== undefined`
 * check immediately above it is what makes the assertion true.
 */
export class PickDefined {
  public static from<T extends Record<string, unknown>>(
    record: T
  ): { [K in keyof T]: Exclude<T[K], undefined> } {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      const value = record[key];
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result as { [K in keyof T]: Exclude<T[K], undefined> };
  }
}
