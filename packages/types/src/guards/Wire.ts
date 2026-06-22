/**
 * Type-safe accessors for wire format JSON values.
 *
 * Static methods on `Wire` narrow `unknown` values to concrete types without
 * unsafe assertions. Use these when processing external API responses or any
 * dynamically-typed payload where the shape is not yet known.
 *
 * Extend `Wire` and `static override isRecord` to customise record detection;
 * `asRecord` and `asRecordArray` delegate through `this.isRecord` so overrides
 * propagate.
 */
export class Wire {
  /**
   * Returns `true` when `value` is a non-null, non-array object.
   *
   * Static override this method in a subclass to customise what counts as a
   * record; `asRecord` and `asRecordArray` both delegate here.
   */
  public static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Returns the value as `Record<string, unknown>` when it is a non-null,
   * non-array object, otherwise returns `undefined`.
   */
  public static asRecord(value: unknown): Record<string, unknown> | undefined {
    return this.isRecord(value) ? value : undefined;
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
   * Delegates record-detection to `this.isRecord` so subclass static overrides
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
}
