/**
 * Runtime validation and cast-free coercion of an `unknown` JSON value.
 *
 * The honest narrowing at a JSON-storage boundary where the input is genuinely
 * `unknown` (e.g. a generic tool return, a deserialized blob). Rather than
 * asserting an untrusted value is JSON-safe — a lie when the value is a
 * function, `undefined`, symbol, or bigint — `JsonValue.from` walks the value
 * and returns a real `JSONSchema7Type`: primitives pass through, arrays and plain
 * objects recurse field-wise, and anything not representable in JSON becomes
 * `null`. No `as` cast.
 *
 * All methods are monomorphic and use consistent shapes so V8 can inline-cache
 * them without deoptimisation.
 */
import type { JSONSchema7Type } from 'json-schema';

import { JsonObject } from './JsonObject.js';

export class JsonValue {
  /** Returns whether a candidate is finite, acyclic JSON data. */
  public static is(value: unknown): value is JSONSchema7Type {
    const ancestors = new Set<object>();
    const result = JsonValue.isValue(value, ancestors);
    return result;
  }

  /**
   * Coerce an arbitrary value into a `JSONSchema7Type`. Strings, numbers,
   * booleans, and `null` pass through unchanged; arrays are coerced
   * element-wise; plain string-keyed objects are coerced field-wise;
   * everything else (functions, `undefined`, symbols, bigints) becomes `null`.
   */
  public static from(value: unknown): JSONSchema7Type {
    const ancestors = new Set<object>();
    const result = JsonValue.coerce(value, ancestors);
    return result;
  }

  private static coerce(value: unknown, ancestors: Set<object>): JSONSchema7Type {
    if (value === null) {
      return null;
    }
    if (typeof value === 'string' || typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (Array.isArray(value)) {
      if (ancestors.has(value)) { return null; }
      ancestors.add(value);
      const result: JSONSchema7Type[] = [];
      for (const item of value) {
        result.push(JsonValue.coerce(item, ancestors));
      }
      ancestors.delete(value);
      return result;
    }
    if (JsonObject.is(value)) {
      if (ancestors.has(value)) { return null; }
      ancestors.add(value);
      const result: Record<string, JSONSchema7Type> = {};
      for (const key of Object.keys(value)) {
        result[key] = JsonValue.coerce(value[key], ancestors);
      }
      ancestors.delete(value);
      return result;
    }
    return null;
  }

  private static isValue(value: unknown, ancestors: Set<object>): boolean {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
      return true;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value);
    }
    if (Array.isArray(value)) {
      if (ancestors.has(value)) { return false; }
      ancestors.add(value);
      for (const item of value) {
        if (!JsonValue.isValue(item, ancestors)) {
          ancestors.delete(value);
          return false;
        }
      }
      ancestors.delete(value);
      return true;
    }
    if (JsonObject.is(value)) {
      if (ancestors.has(value)) { return false; }
      ancestors.add(value);
      for (const key of Object.keys(value)) {
        if (!JsonValue.isValue(value[key], ancestors)) {
          ancestors.delete(value);
          return false;
        }
      }
      ancestors.delete(value);
      return true;
    }
    return false;
  }
}
