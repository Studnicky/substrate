/**
 * Cast-free coercion of an `unknown` value into a `JsonValueType`.
 *
 * The honest narrowing at a JSON-storage boundary where the input is genuinely
 * `unknown` (e.g. a generic tool return, a deserialized blob). Rather than
 * asserting `value as JsonValueType` — a cast that lies when the value is a
 * function, `undefined`, symbol, or bigint — `JsonValue.from` walks the value
 * and returns a real `JsonValueType`: primitives pass through, arrays and plain
 * objects recurse field-wise, and anything not representable in JSON becomes
 * `null`. No `as` cast.
 *
 * All methods are monomorphic and use consistent shapes so V8 can inline-cache
 * them without deoptimisation.
 */
import type { JsonValueType } from '../types/JsonValue.js';

import { JsonObject } from './JsonObject.js';

export class JsonValue {
  /**
   * Coerce an arbitrary value into a `JsonValueType`. Strings, numbers,
   * booleans, and `null` pass through unchanged; arrays are coerced
   * element-wise; plain string-keyed objects are coerced field-wise;
   * everything else (functions, `undefined`, symbols, bigints) becomes `null`.
   */
  public static from(value: unknown): JsonValueType {
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
      return value.map(JsonValue.from);
    }
    if (JsonObject.is(value)) {
      const out: Record<string, JsonValueType> = {};
      Object.keys(value).forEach((key) => {
        out[key] = JsonValue.from(value[key]);
      });
      return out;
    }
    return null;
  }
}
