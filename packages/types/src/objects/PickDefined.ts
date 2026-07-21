/**
 * Strips `undefined`-valued own enumerable properties from a record. Keys whose
 * input types exclude `undefined` remain required; keys that may contain
 * `undefined` become optional with `undefined` removed from their present value.
 */
export class PickDefined {
  public static from<T extends Record<string, unknown>>(
    record: T
  ): {
    [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
  } & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
  };
  public static from(record: Record<string, unknown>): Partial<Record<string, unknown>> {
    const result: Partial<Record<string, unknown>> = {};
    for (const key of Object.keys(record)) {
      const value = record[key];
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }
}
