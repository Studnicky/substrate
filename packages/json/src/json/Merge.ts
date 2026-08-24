/** Deep merging for arbitrary in-memory values. */

import { Clone } from './Clone.js';
import { DataType } from './DataType.js';

export class Merge {
  /** Return whether a value is a mergeable plain object. */
  protected static isMergeable<T>(value: T): value is Readonly<Record<string, unknown>> & T {
    const result = DataType.isPlainObject(value);
    return result;
  }

  /** Return the sorted union of keys from `base` and `overlay`. */
  protected static unionKeys(base: Readonly<Record<string, unknown>>, overlay: Readonly<Record<string, unknown>>): readonly string[] {
    const seenKeys: Record<string, true> = {};
    const baseKeys = Object.keys(base);
    const baseKeyLength = baseKeys.length;
    for (let index = 0; index < baseKeyLength; index += 1) {
      const key = baseKeys[index];
      if (key !== undefined) {
        Reflect.set(seenKeys, key, true);
      }
    }
    const overlayKeys = Object.keys(overlay);
    const overlayKeyLength = overlayKeys.length;
    for (let index = 0; index < overlayKeyLength; index += 1) {
      const key = overlayKeys[index];
      if (key !== undefined) {
        Reflect.set(seenKeys, key, true);
      }
    }
    const result = Object.keys(seenKeys).toSorted();
    return result;
  }

  /** Merge two arrays. Default behaviour replaces the base atomically. */
  protected static mergeArrays<T>(_: T[], overlay: T[]): T[] {
    const result = overlay;
    return result;
  }

  /** Return a detached snapshot for arrays and plain objects, preserving atomic values. */
  protected static snapshot<T>(value: T): T {
    if (Array.isArray(value)) {
      const result = Clone.deep(value);
      return result;
    }
    if (!DataType.isPlainObject(value)) {
      const result = value;
      return result;
    }
    const snapshot = Clone.shallow(value);
    const keys = Object.keys(snapshot);
    const keyLength = keys.length;
    for (let index = 0; index < keyLength; index += 1) {
      const key = keys[index];
      if (key !== undefined) {
        const item: unknown = Reflect.get(snapshot, key);
        Reflect.set(snapshot, key, this.snapshot(item));
      }
    }
    const result = snapshot;
    return result;
  }

  /** Merge two plain objects key-by-key in alphabetical union order. */
  protected static mergeObjects<TBase extends Record<string, unknown>>(base: TBase, overlay: Record<string, unknown>): TBase {
    const merged = this.snapshot(base);
    const keys = Object.keys(merged);
    const keyLength = keys.length;
    for (let index = 0; index < keyLength; index += 1) {
      const key = keys[index];
      if (key !== undefined) {
        Reflect.deleteProperty(merged, key);
      }
    }
    const unionKeys = this.unionKeys(base, overlay);
    const unionKeyLength = unionKeys.length;
    for (let index = 0; index < unionKeyLength; index += 1) {
      const key = unionKeys[index];
      if (key !== undefined) {
        const baseItem: unknown = Reflect.get(base, key);
        const overlayItem: unknown = Reflect.get(overlay, key);
        Reflect.set(merged, key, this.deep(baseItem, overlayItem));
      }
    }
    return merged;
  }

  /** Deeply merge `overlayValue` onto `baseValue` and return a detached result. */
  public static deep<TBase extends object, TOverlay extends object>(baseValue: TBase, overlayValue: TOverlay): TBase & TOverlay;
  public static deep<T>(baseValue: T, overlayValue: T): T;
  public static deep<TBase, TOverlay>(baseValue: TBase, overlayValue: TOverlay): TBase | TOverlay;
  public static deep<TBase, TOverlay>(baseValue: TBase, overlayValue: TOverlay): unknown {
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
    if (!this.isMergeable(overlayValue) || !this.isMergeable(baseValue)) {
      const result = this.snapshot(overlayValue);
      return result;
    }
    const result = this.mergeObjects(baseValue, overlayValue);
    return result;
  }
}
