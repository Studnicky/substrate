/** Schema hashing with metadata-key stripping. */

import { Guard } from '@studnicky/types';

import { JsonValueEntity } from '../entities/JsonValueEntity.js';
import { Hash } from './Hash.js';

export class StructuralHash {
  /** Return `true` when a key is metadata rather than schema structure. */
  protected static isMetadataKey(key: string): boolean {
    const result = key === '$id' || key === 'description' || key === 'title';
    return result;
  }

  /** Recursively strip metadata keys from a JSON schema document. */
  protected static stripMetadata(value: JsonValueEntity.Type): JsonValueEntity.Type {
    if (Array.isArray(value)) {
      const result: JsonValueEntity.Type[] = [];
      const valueLength = value.length;
      for (let index = 0; index < valueLength; index += 1) {
        const item = value.at(index);
        if (item !== undefined) {
          result.push(this.stripMetadata(item));
        }
      }
      return result;
    }
    if (!Guard.isObjectLike(value)) {
      const result = value;
      return result;
    }
    const result: Record<string, JsonValueEntity.Type> = {};
    const keys = Object.keys(value);
    const keyLength = keys.length;
    for (let index = 0; index < keyLength; index += 1) {
      const key = keys[index];
      if (key !== undefined && !this.isMetadataKey(key)) {
        const item = value[key];
        if (item !== undefined) {
          Reflect.set(result, key, this.stripMetadata(item));
        }
      }
    }
    return result;
  }

  /** Hash a schema object after stripping annotation-only fields. */
  public static of(schema: object): string {
    const result = Hash.value(this.stripMetadata(JsonValueEntity.intake(schema)));
    return result;
  }
}
