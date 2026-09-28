/** Schema hashing with metadata-key stripping. */

import type { JSONSchema7Type } from 'json-schema';

import { JsonObject } from '../guards/JsonObject.js';
import { JsonValue } from '../guards/JsonValue.js';
import { Predicates } from '../predicates/Predicates.js';
import { Hash } from './Hash.js';

export class StructuralHash {
  /** Return `true` when a key is metadata rather than schema structure. */
  protected static isMetadataKey(key: string): boolean {
    const result = key === '$id' || key === 'description' || key === 'title';
    return result;
  }

  /** Recursively strip metadata keys from a JSON schema document. */
  protected static stripMetadata(value: JSONSchema7Type): JSONSchema7Type {
    if (Array.isArray(value)) {
      const result: JSONSchema7Type[] = [];
      const valueLength = value.length;
      for (let index = 0; index < valueLength; index += 1) {
        const item = value.at(index);
        if (item !== undefined) {
          result.push(this.stripMetadata(item));
        }
      }
      return result;
    }
    if (!Predicates.isObjectLike(value)) {
      const result = value;
      return result;
    }
    const keys = Object.keys(value);
    const keyLength = keys.length;
    const entries = new Map<string, JSONSchema7Type>();
    for (let index = 0; index < keyLength; index += 1) {
      const key = keys[index];
      if (key !== undefined && !this.isMetadataKey(key)) {
        const item = value[key];
        if (item !== undefined) {
          entries.set(key, this.stripMetadata(item));
        }
      }
    }
    const result = JsonObject.fromEntries(entries);
    return result;
  }

  /** Validate `schema` as finite, acyclic JSON data, or throw. */
  protected static intake(schema: object): JSONSchema7Type {
    if (!JsonValue.is(schema)) {
      throw new TypeError('Schema must be finite, acyclic JSON data.');
    }
    return schema;
  }

  /** Hash a schema object after stripping annotation-only fields. */
  public static of(schema: object): string {
    const result = Hash.value(this.stripMetadata(this.intake(schema)));
    return result;
  }
}
