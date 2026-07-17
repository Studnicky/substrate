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

import type { DeepMergeType } from '../types/DeepMergeType.js';

export class Merge {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise merging
  // ---------------------------------------------------------------------------

  /** Return `true` when `value` is a mergeable plain object (not null, not array). */
  protected static isMergeable(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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

  /** Merge two plain objects key-by-key in alphabetical union order. */
  protected static mergeObjects(
    base: Readonly<Record<string, unknown>>,
    overlay: Readonly<Record<string, unknown>>
  ): Record<string, unknown> {
    const keys = this.unionKeys(base, overlay);
    const merged: Record<string, unknown> = {};

    for (const key of keys) {
      merged[key] = this.mergeValues(base[key], overlay[key]);
    }

    return merged;
  }

  /**
   * Recursively merge two values. Dispatches to `mergeArrays` or
   * `mergeObjects` as appropriate; scalar overlay always wins.
   */
  protected static mergeValues(baseValue: unknown, overlayValue: unknown): unknown {
    if (overlayValue === undefined) {
      return baseValue;
    }

    if (baseValue === undefined) {
      return overlayValue;
    }

    if (Array.isArray(overlayValue)) {
      if (Array.isArray(baseValue)) {
        return this.mergeArrays(baseValue, overlayValue);
      }
      return overlayValue;
    }

    if (Array.isArray(baseValue)) {
      return overlayValue;
    }

    if (!this.isMergeable(overlayValue)) {
      return overlayValue;
    }

    if (!this.isMergeable(baseValue)) {
      return overlayValue;
    }

    return this.mergeObjects(baseValue, overlayValue);
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
  public static deep<TBaseShape, TOverlayShape>(
    baseValue: TBaseShape,
    overlayValue: TOverlayShape
  ): DeepMergeType<TBaseShape, TOverlayShape> {
    const result: unknown = this.mergeValues(baseValue, overlayValue);

    return result as DeepMergeType<TBaseShape, TOverlayShape>;
  }
}
