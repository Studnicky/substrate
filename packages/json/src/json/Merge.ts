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

    for (const baseKey of Object.keys(base)) {
      seenKeys[baseKey] = true;
    }
    for (const overlayKey of Object.keys(overlay)) {
      seenKeys[overlayKey] = true;
    }

    return Object.keys(seenKeys).sort();
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
      for (const entry of value) {
        snapshot.push(this.snapshot(entry));
      }
      return snapshot;
    }

    if (!DataType.isPlainObject(value)) {
      return value;
    }

    const snapshot: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      snapshot[key] = this.snapshot(value[key]);
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

    for (const key of keys) {
      merged[key] = this.deep(base[key], overlay[key]);
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
      return this.snapshot(baseValue);
    }

    if (baseValue === undefined) {
      return this.snapshot(overlayValue);
    }

    if (Array.isArray(overlayValue)) {
      if (Array.isArray(baseValue)) {
        return this.snapshot(this.mergeArrays(baseValue, overlayValue));
      }
      return this.snapshot(overlayValue);
    }

    if (Array.isArray(baseValue)) {
      return this.snapshot(overlayValue);
    }

    if (!this.isMergeable(overlayValue)) {
      return this.snapshot(overlayValue);
    }

    if (!this.isMergeable(baseValue)) {
      return this.snapshot(overlayValue);
    }

    return this.mergeObjects(baseValue, overlayValue);
  }
}
