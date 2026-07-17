/**
 * Type-safe accessors and type guards for wire format JSON values.
 *
 * Static methods on `Guard` narrow `unknown` values to concrete types without
 * unsafe assertions. Use these when processing external API responses or any
 * dynamically-typed payload where the shape is not yet known.
 *
 * Extend `Guard` and `static override isObject` to customise record detection;
 * `asRecord` and `asRecordArray` delegate through `this.isObject` so overrides
 * propagate.
 */
export class Guard {
  /**
   * Returns the value as `Record<string, unknown>` when it is a non-null,
   * non-array object, otherwise returns `undefined`.
   */
  public static asRecord(value: unknown): Record<string, unknown> | undefined {
    return this.isObject(value) ? value : undefined;
  }

  /**
   * Returns the value as `string` when it is a string, otherwise returns
   * `undefined`.
   */
  public static asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Returns the value as `number` when it is a number, otherwise returns
   * `undefined`.
   */
  public static asNumber(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
  }

  /**
   * Returns the value as `string | null` when it is a string or `null`,
   * otherwise returns `undefined`.
   */
  public static asStringOrNull(value: unknown): string | null | undefined {
    if (value === null) {
      return null;
    }
    return typeof value === 'string' ? value : undefined;
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

    for (let idx = 0; idx < length; idx += 1) {
      const item: unknown = value[idx];
      const rec = this.asRecord(item);

      if (rec !== undefined) {
        result.push(rec);
      }
    }

    return result.length > 0 ? result : undefined;
  }

  public static isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  public static isNumber(value: unknown): value is number {
    return typeof value === 'number' && !Number.isNaN(value);
  }

  public static isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
  }

  public static isFunction(value: unknown): value is (...args: unknown[]) => unknown {
    return typeof value === 'function';
  }

  /**
   * Returns `true` when `value` is a plain, non-null, non-array object.
   * `Map` and `Set` instances return `false` — a `Record<string, unknown>`
   * must support bracket-property access, which neither collection provides.
   * This is the canonical plain-object check for the package: `Empty.isObject`
   * and `JsonObject.is` both delegate here rather than reimplementing the
   * exclusion. `asRecord` and `asRecordArray` both delegate here too; static
   * override this method in a subclass to customise what counts as a record.
   */
  public static isObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    return !(value instanceof Map) && !(value instanceof Set);
  }

  /**
   * Type guard for non-negative integers (>= 0).
   */
  public static isNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
  }

  /**
   * Type guard for positive integers (> 0).
   */
  public static isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
  }
}
