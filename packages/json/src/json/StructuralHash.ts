/** Schema hashing with metadata-key stripping. */

import type { JsonObjectEntity } from '../entities/JsonObjectEntity.js';
import type { JsonValueEntity } from '../entities/JsonValueEntity.js';

import { Hash } from './Hash.js';

export class StructuralHash {
  /** Return whether a key is metadata rather than schema structure. */
  protected static isMetadataKey(key: string): boolean {
    if (key === '$id' || key === 'description' || key === 'title') {
      return true;
    }

    return false;
  }

  /** Recursively strip metadata from a parsed JSON value. */
  protected static stripMetadata(value: JsonValueEntity.Type): JsonValueEntity.Type {
    if (Array.isArray(value)) {
      const result: JsonValueEntity.Type[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        const item = value.at(index);
        if (item !== undefined) {
          result.push(this.stripMetadata(item));
        }
      }
      return result;
    }

    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const result: JsonObjectEntity.Type = {};

    const entries = Object.entries(value);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const [key, nestedValue] = entry;
      if (this.isMetadataKey(key)) {
        continue;
      }
      if (nestedValue !== undefined) {
        Reflect.set(result, key, this.stripMetadata(nestedValue));
      }
    }

    return result;
  }

  /** Hash a parsed JSON Schema object after stripping annotation-only fields. */
  public static of(schema: JsonObjectEntity.Type): string {
    const structuralSchema = this.stripMetadata(schema);
    const result = Hash.value(structuralSchema);
    return result;
  }
}
