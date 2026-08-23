/** Deep merging for parsed JSON values. */

import type { JsonObjectEntity } from '../entities/JsonObjectEntity.js';
import type { JsonValueEntity } from '../entities/JsonValueEntity.js';

import { DataType } from './DataType.js';

export class Merge {
  /** Return whether a parsed JSON value is a mergeable object. */
  protected static isMergeable(value: JsonValueEntity.Type): value is JsonObjectEntity.Type {
    const result = DataType.isPlainObject(value);
    return result;
  }

  /** Return the sorted union of keys from `base` and `overlay`. */
  protected static unionKeys(
    base: JsonObjectEntity.Type,
    overlay: JsonObjectEntity.Type
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
  protected static mergeArrays(
    _base: JsonValueEntity.Type[],
    overlay: JsonValueEntity.Type[]
  ): JsonValueEntity.Type[] {
    const result = overlay;
    return result;
  }

  /** Return a detached snapshot for JSON containers while preserving atomic values. */
  protected static snapshot(value: JsonValueEntity.Type): JsonValueEntity.Type {
    if (Array.isArray(value)) {
      const snapshot: JsonValueEntity.Type[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        const item = value.at(index);
        if (item !== undefined) {
          snapshot.push(this.snapshot(item));
        }
      }
      return snapshot;
    }

    if (!DataType.isPlainObject(value)) {
      return value;
    }

    const snapshot: JsonObjectEntity.Type = {};
    const entries = Object.entries(value).sort(([leftKey], [rightKey]) => {
      const result = leftKey.localeCompare(rightKey);
      return result;
    });
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const [key, item] = entry;
      if (item !== undefined) {
        Reflect.set(snapshot, key, this.snapshot(item));
      }
    }
    return snapshot;
  }

  /** Merge two plain objects key-by-key in alphabetical union order. */
  protected static mergeObjects(
    base: JsonObjectEntity.Type,
    overlay: JsonObjectEntity.Type
  ): JsonObjectEntity.Type {
    const merged: JsonObjectEntity.Type = {};
    const baseValues = new Map(Object.entries(base));
    const overlayValues = new Map(Object.entries(overlay));

    const keys = this.unionKeys(base, overlay);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (key === undefined) {
        continue;
      }
      const baseValue = baseValues.get(key);
      const overlayValue = overlayValues.get(key);
      if (baseValue === undefined && overlayValue !== undefined) {
        Reflect.set(merged, key, this.snapshot(overlayValue));
      } else if (baseValue !== undefined && overlayValue === undefined) {
        Reflect.set(merged, key, this.snapshot(baseValue));
      } else if (baseValue !== undefined && overlayValue !== undefined) {
        Reflect.set(merged, key, this.deep(baseValue, overlayValue));
      }
    }

    return merged;
  }

  /**
   * Deeply merge `overlayValue` onto `baseValue` and return a new value.
   *
   * Overlay wins on conflicting primitives. Arrays replaced atomically.
   * Plain objects merged key-wise in alphabetical union order (monomorphic).
   */
  public static deep(
    baseValue: JsonObjectEntity.Type,
    overlayValue: JsonObjectEntity.Type
  ): JsonObjectEntity.Type;
  public static deep(
    baseValue: JsonValueEntity.Type[],
    overlayValue: JsonValueEntity.Type[]
  ): JsonValueEntity.Type[];
  public static deep(
    baseValue: JsonValueEntity.Type,
    overlayValue: JsonValueEntity.Type
  ): JsonValueEntity.Type;
  public static deep(
    baseValue: JsonValueEntity.Type,
    overlayValue: JsonValueEntity.Type
  ): JsonValueEntity.Type {
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
