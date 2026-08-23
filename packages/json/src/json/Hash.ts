/** FNV-1a structural hashing for parsed JSON values. */

import type { JsonValueEntity } from '../entities/JsonValueEntity.js';

import { FNV_OFFSET_BASIS, FNV_PRIME, UINT32_MASK } from '../constants/HashConstants.js';
import { DataType } from './DataType.js';

export class Hash {
  /** Compute the raw FNV-1a 32-bit integer for a string. */
  protected static fnv1a32(input: string): number {
    let hash: number = FNV_OFFSET_BASIS;

    const length = input.length;
    for (let index = 0; index < length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, FNV_PRIME) >>> 0;
    }

    const result = hash & UINT32_MASK;
    return result;
  }

  /** Encode a 32-bit unsigned integer as an 8-character lowercase hex string. */
  protected static toHex32(value: number): string {
    const result = (value >>> 0).toString(16).padStart(8, '0');
    return result;
  }

  /**
   * Recursively produce a canonical string representation of a parsed JSON value.
   */
  protected static hashValue(value: JsonValueEntity.Type): string {
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'boolean') {
      const result = value ? 'true' : 'false';
      return result;
    }
    if (typeof value === 'number') {
      return `n:${String(value)}`;
    }
    if (typeof value === 'string') {
      return `s:${this.toHex32(this.fnv1a32(value))}`;
    }
    if (Array.isArray(value)) {
      const parts = value.map((item) => { const result = this.hashValue(item); return result; });

      return `[${parts.join(',')}]`;
    }
    if (DataType.isPlainObject(value)) {
      const parts = Object.entries(value)
        .sort(([leftKey], [rightKey]) => {
          const result = leftKey.localeCompare(rightKey);
          return result;
        })
        .map(([key, item]) => {
          const result = item === undefined ? '' : `${key}:${this.hashValue(item)}`;
          return result;
        });

      return `{${parts.join(',')}}`;
    }

    return 'invalid';
  }

  /** Compute a deterministic FNV-1a 32-bit hash of a parsed JSON value. */
  public static value(input: JsonValueEntity.Type): string {
    const serialised = this.hashValue(input);

    const result = this.toHex32(this.fnv1a32(serialised));
    return result;
  }
}
