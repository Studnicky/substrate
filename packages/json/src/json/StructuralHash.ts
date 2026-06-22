/**
 * StructuralHash — schema hash with metadata-key stripping.
 *
 * Strips metadata-only keys (title, description, $id) before hashing so that
 * two schemas differing only in annotations compare as equal.
 *
 * Subclass `StructuralHash` and override `protected static stripMetadata` or
 * `isMetadataKey` to customise which keys are stripped.
 */

import { Hash } from './Hash.js';

/** Keys stripped before hashing by default. */
const STRUCTURAL_METADATA_KEYS = new Set(['$id', 'description', 'title']);

export class StructuralHash {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise stripping
  // ---------------------------------------------------------------------------

  /**
   * Return `true` when `key` should be stripped before hashing.
   * Override to extend or restrict the metadata key set.
   */
  protected static isMetadataKey(key: string): boolean {
    return STRUCTURAL_METADATA_KEYS.has(key);
  }

  /**
   * Recursively strip metadata keys from `value`.
   * Uses `this.isMetadataKey` so overrides propagate.
   */
  protected static stripMetadata(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item: unknown) => this.stripMetadata(item));
    }

    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value)) {
      if (this.isMetadataKey(key)) {
        continue;
      }
      result[key] = this.stripMetadata(val);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Public static API
  // ---------------------------------------------------------------------------

  /**
   * Hash a JSON Schema object, stripping metadata-only fields
   * (`$id`, `title`, `description`) before hashing.
   *
   * Two schemas that differ only in annotations produce the same hash.
   */
  public static of(schema: Record<string, unknown>): string {
    return Hash.value(this.stripMetadata(schema));
  }
}
