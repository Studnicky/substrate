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

export class StructuralHash {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise stripping
  // ---------------------------------------------------------------------------

  /**
   * Return `true` when `key` should be stripped before hashing.
   * Override to extend or restrict the metadata key set.
   */
  protected static isMetadataKey(key: string): boolean {
    if (key === '$id' || key === 'description' || key === 'title') {
      return true;
    }

    return false;
  }

  /**
   * Recursively strip metadata keys from `value`.
   * Uses `this.isMetadataKey` so overrides propagate.
   */
  protected static stripMetadata(value: unknown): unknown {
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        result.push(this.stripMetadata(value[index]));
      }
      return result;
    }

    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const result: Record<string, unknown> = {};

    const keys = Object.keys(value);
    const keyLength = keys.length;
    for (let index = 0; index < keyLength; index += 1) {
      const key = keys[index];
      if (key === undefined) {
        continue;
      }
      if (this.isMetadataKey(key)) {
        continue;
      }
      const nestedValue: unknown = Reflect.get(value, key);
      Reflect.set(result, key, this.stripMetadata(nestedValue));
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
    const structuralSchema = this.stripMetadata(schema);
    const result = Hash.value(structuralSchema);
    return result;
  }
}
