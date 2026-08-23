/**
 * Merge — deep merge with V8-monomorphic write order.
 *
 * Semantics:
 * - Primitives: overlay wins when defined; base preserved on overlay = undefined.
 * - Arrays: overlay replaces base atomically (override `mergeArrays` to change).
 * - Objects: key-wise recursive merge; alphabetical union write order (monomorphic).
 * - Mismatched shapes (object vs array, primitive vs object): overlay wins entirely.
 * - Null is treated as a primitive (overlay-wins, not deep-merged).
 *
 * Subclass `Merge` and override protected static steps to customise merge behaviour.
 */

import { DataType } from './DataType.js';

export class Merge {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise merging
  // ---------------------------------------------------------------------------

  /** Return `true` when `value` is a mergeable plain object (not null, not array). */
  protected static isMergeable(value: unknown): value is Readonly<Record<string, unknown>> {
    if (!DataType.isPlainObject(value)) {
      return false;
    }

    return true;
  }

  /** Return the sorted union of keys from `base` and `overlay`. */
  protected static unionKeys(
    base: Readonly<Record<string, unknown>>,
    overlay: Readonly<Record<string, unknown>>
  ): readonly string[] {
    const seenKeys: Record<string, true> = {};

    const baseKeys = Object.keys(base);
    const baseLength = baseKeys.length;
    for (let index = 0; index < baseLength; index += 1) {
      const baseKey = baseKeys[index];
      if (baseKey === undefined) {
        continue;
      }
      Reflect.set(seenKeys, baseKey, true);
    }
    const overlayKeys = Object.keys(overlay);
    const overlayLength = overlayKeys.length;
    for (let index = 0; index < overlayLength; index += 1) {
      const overlayKey = overlayKeys[index];
      if (overlayKey === undefined) {
        continue;
      }
      Reflect.set(seenKeys, overlayKey, true);
    }

    const result = Object.keys(seenKeys).sort();
    return result;
  }

  /**
   * Merge two arrays.
   *
   * Default: overlay replaces base atomically.
   * Override to union, concat, or otherwise combine arrays.
   */
  protected static mergeArrays(_base: unknown[], overlay: unknown[]): unknown[] {
    const result = overlay;
    return result;
  }

  /** Return a detached snapshot for JSON containers while preserving atomic values. */
  protected static snapshot(value: unknown): unknown {
    if (Array.isArray(value)) {
      const snapshot: unknown[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        snapshot.push(this.snapshot(value[index]));
      }
      return snapshot;
    }

    if (!DataType.isPlainObject(value)) {
      return value;
    }

    const snapshot: Record<string, unknown> = {};
    const keys = Object.keys(value).sort();
    const length = keys.length;
    for (let index = 0; index < length; index += 1) {
      const key = keys[index];
      if (key === undefined) {
        continue;
      }
      Reflect.set(snapshot, key, this.snapshot(Reflect.get(value, key)));
    }
    return snapshot;
  }

  /** Merge two plain objects key-by-key in alphabetical union order. */
  protected static mergeObjects(
    base: Readonly<Record<string, unknown>>,
    overlay: Readonly<Record<string, unknown>>
  ): Record<string, unknown> {
    const keys = this.unionKeys(base, overlay);
    const merged: Record<string, unknown> = {};

    const length = keys.length;
    for (let index = 0; index < length; index += 1) {
      const key = keys[index];
      if (key === undefined) {
        continue;
      }
      Reflect.set(merged, key, this.deep(Reflect.get(base, key), Reflect.get(overlay, key)));
    }

    return merged;
  }

  // ---------------------------------------------------------------------------
  // Public static API
  // ---------------------------------------------------------------------------

  /**
   * Deeply merge `overlayValue` onto `baseValue` and return a new value.
   *
   * Overlay wins on conflicting primitives. Arrays replaced atomically.
   * Plain objects merged key-wise in alphabetical union order (monomorphic).
   */
  public static deep(
    baseValue: Readonly<Record<string, unknown>>,
    overlayValue: Readonly<Record<string, unknown>>
  ): Record<string, unknown>;
  public static deep(baseValue: readonly unknown[], overlayValue: readonly unknown[]): readonly unknown[];
  public static deep(baseValue: unknown, overlayValue: unknown): unknown;
  public static deep(baseValue: unknown, overlayValue: unknown): unknown {
    if (overlayValue === undefined) {
      const result = this.snapshot(baseValue);
      return result;
    }

    if (baseValue === undefined) {
      const result = this.snapshot(overlayValue);
      return result;
    }

    if (Array.isArray(overlayValue)) {
      if (Array.isArray(baseValue)) {
        const result = this.snapshot(this.mergeArrays(baseValue, overlayValue));
        return result;
      }
      const result = this.snapshot(overlayValue);
      return result;
    }

    if (Array.isArray(baseValue)) {
      const result = this.snapshot(overlayValue);
      return result;
    }

    if (!this.isMergeable(overlayValue)) {
      const result = this.snapshot(overlayValue);
      return result;
    }

    if (!this.isMergeable(baseValue)) {
      const result = this.snapshot(overlayValue);
      return result;
    }

    const result = this.mergeObjects(baseValue, overlayValue);
    return result;
  }
}
