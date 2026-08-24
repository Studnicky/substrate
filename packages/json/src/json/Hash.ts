/** FNV-1a structural hashing for arbitrary in-memory values. */

import { FNV_OFFSET_BASIS, FNV_PRIME, UINT32_MASK } from '../constants/HashConstants.js';
import { DataType } from './DataType.js';

export class Hash {
  protected static fnv1a32(input: string): number {
    let hash = FNV_OFFSET_BASIS;
    const length = input.length;
    for (let index = 0; index < length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, FNV_PRIME) >>> 0;
    }
    const result = hash & UINT32_MASK;
    return result;
  }

  protected static toHex32(value: number): string {
    const result = (value >>> 0).toString(16).padStart(8, '0');
    return result;
  }

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
      const result = `s:${this.toHex32(this.fnv1a32(value))}`;
      return result;
    }
    if (value instanceof Date) {
      const result = `date:${value.getTime()}`;
      return result;
    }
    if (value instanceof Map) {
      const parts = [...value.entries()].map(([key, item]) => {
        const result = `${this.hashValue(key)}=${this.hashValue(item)}`;
        return result;
      }).toSorted();
      const result = `map{${parts.join(',')}}`;
      return result;
    }
    if (value instanceof Set) {
      const parts = [...value.values()].map((item) => {
        const result = this.hashValue(item);
        return result;
      }).toSorted();
      const result = `set{${parts.join(',')}}`;
      return result;
    }
    if (Array.isArray(value)) {
      const parts = value.map((item) => {
        const result = this.hashValue(item);
        return result;
      });
      const result = `[${parts.join(',')}]`;
      return result;
    }
    if (DataType.isRecord(value)) {
      const keys = Object.keys(value).toSorted();
      const parts = keys.map((key) => {
        const item: unknown = Reflect.get(value, key);
        const result = `${key}:${this.hashValue(item)}`;
        return result;
      });
      const result = `{${parts.join(',')}}`;
      return result;
    }
    const result = `?:${typeof value}`;
    return result;
  }

  public static value(input: unknown): string {
    const serialised = this.hashValue(input);
    const result = this.toHex32(this.fnv1a32(serialised));
    return result;
  }
}
