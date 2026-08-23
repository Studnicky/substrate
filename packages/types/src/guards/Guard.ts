/**
 * Type-safe accessors and type guards for wire format JSON values.
 *
 * Static methods on `Guard` narrow `unknown` values to concrete types without
 * unsafe assertions. Use these when processing external API responses or any
 * dynamically-typed payload where the shape is not yet known.
 *
 * Extend `Guard` and `static override isObject` to customise record detection;
 * `asRecordArray` delegates through `this.isObject` so overrides propagate.
 */
export class Guard {
  /**
   * Returns the value as `number` when it is a number, otherwise returns
   * `undefined`.
   */
  public static asNumber(value: unknown): number | undefined {
    const result = typeof value === 'number' ? value : undefined;
    return result;
  }

  /**
   * Returns the value as `string | null` when it is a string or `null`,
   * otherwise returns `undefined`.
   */
  public static asStringOrNull(value: unknown): string | null | undefined {
    if (value === null) {
      return null;
    }
    const result = typeof value === 'string' ? value : undefined;
    return result;
  }

  /**
   * Returns an array of `Record<string, unknown>` entries from an array
   * value, filtering out any non-record elements. Returns `undefined` when
   * `value` is not an array or when no records are found.
   *
   * Delegates record-detection to `this.isObject` so subclass static overrides
   * propagate.
   */
  public static asRecordArray(value: unknown): Record<string, unknown>[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const result: Record<string, unknown>[] = [];
    const length = value.length;

    for (let index = 0; index < length; index += 1) {
      const item: unknown = value[index];
      if (this.isObject(item)) {
        result.push(item);
      }
    }

    const recordArray = result.length > 0 ? result : undefined;
    return recordArray;
  }

  public static isString(value: unknown): value is string {
    if (typeof value === 'string') {
      return true;
    }
    return false;
  }

  public static isNumber(value: unknown): value is number {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return true;
    }
    return false;
  }

  public static isBoolean(value: unknown): value is boolean {
    if (typeof value === 'boolean') {
      return true;
    }
    return false;
  }

  public static isFunction(value: unknown): value is (...argumentList: unknown[]) => unknown {
    if (typeof value === 'function') {
      return true;
    }
    return false;
  }

  /**
   * Returns `true` when `value` is a plain, non-null, non-array object.
   * `Map` and `Set` instances return `false` — a `Record<string, unknown>`
   * must support bracket-property access, which neither collection provides.
   * This is the canonical plain-object check for the package: `Empty.isObject`
   * and `JsonObject.is` both delegate here rather than reimplementing the
   * exclusion. `asRecordArray` delegates here too; static override this method
   * in a subclass to customise what counts as a record.
   */
  public static isObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    const result = !(value instanceof Map) && !(value instanceof Set);
    return result;
  }

  /**
   * Type guard for non-negative integers (>= 0).
   */
  public static isNonNegativeInteger(value: unknown): value is number {
    const result = typeof value === 'number' && Number.isInteger(value) && value >= 0;
    return result;
  }

  /**
   * Type guard for positive integers (> 0).
   */
  public static isPositiveInteger(value: unknown): value is number {
    const result = typeof value === 'number' && Number.isInteger(value) && value > 0;
    return result;
  }
}
