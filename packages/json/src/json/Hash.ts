/**
 * Hash — FNV-1a structural hash for JSON-compatible values.
 *
 * The `Hash` class provides a deterministic FNV-1a 32-bit hex hash for any
 * JSON-compatible value. Object key order is normalised (sorted alphabetically)
 * so that two objects with the same entries in different insertion orders
 * produce the same hash.
 *
 * Subclass `Hash` and override any `protected static` step to customise hashing.
 */

import { FNV_OFFSET_BASIS, FNV_PRIME, UINT32_MASK } from '../constants/HashConstants.js';
import { DataType } from './DataType.js';

export class Hash {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise hashing
  // ---------------------------------------------------------------------------

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
  protected static toHex32(n: number): string {
    const unsignedInteger = n >>> 0;
    const hexadecimal = unsignedInteger.toString(16);

    if (hexadecimal.length === 8) {
      return hexadecimal;
    }

    const result = hexadecimal.padStart(8, '0');
    return result;
  }

  /**
   * Recursively produce a canonical string representation of `value` for
   * hashing. Override to add or strip fields before hashing.
   */
  protected static hashValue(value: unknown): string {
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
    if (value instanceof Date) {
      return `date:${value.getTime()}`;
    }
    if (value instanceof Map) {
      const parts = [...value.entries()].map(
        ([k, v]: [unknown, unknown]) => { const result = `${this.hashValue(k)}=${this.hashValue(v)}`; return result; }
      ).sort();

      return `map{${parts.join(',')}}`;
    }
    if (value instanceof Set) {
      const parts = [...value.values()].map((v: unknown) => { const result = this.hashValue(v); return result; }).sort();

      return `set{${parts.join(',')}}`;
    }
    if (Array.isArray(value)) {
      const parts = value.map((item: unknown) => { const result = this.hashValue(item); return result; });

      return `[${parts.join(',')}]`;
    }
    if (DataType.isRecord(value)) {
      const keys = Object.keys(value).sort();
      const parts = keys.map((key) => { const result = `${key}:${this.hashValue(Reflect.get(value, key))}`; return result; });

      return `{${parts.join(',')}}`;
    }

    return `?:${typeof value}`;
  }

  // ---------------------------------------------------------------------------
  // Public static API
  // ---------------------------------------------------------------------------

  /**
   * Compute a deterministic FNV-1a 32-bit hex hash of any JSON-compatible value.
   *
   * Object key order is normalised (sorted alphabetically) so that two objects
   * with the same entries in different insertion orders produce the same hash.
   */
  public static value(input: unknown): string {
    const serialised = this.hashValue(input);

    const result = this.toHex32(this.fnv1a32(serialised));
    return result;
  }
}
