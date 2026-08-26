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
    const keys = Object.keys(record);
    const length = keys.length;
    const result: Partial<Record<string, unknown>> = {};
    for (let index = 0; index < length; index += 1) {
      const key = keys[index]!;
      const value: unknown = Reflect.get(record, key);
      if (value !== undefined) {
        Reflect.set(result, key, value);
      }
    }
    return result;
  }
}
