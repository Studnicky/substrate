/**
 * Narrowing guard for the JSON-object boundary. Turns an `unknown` value into
 * a `JsonObjectType` via a type-guard predicate so call sites never reach for
 * an `as` cast. The check is shallow: upstream schema validation is responsible
 * for guaranteeing the values inside the object are JSON-safe.
 *
 * All methods are monomorphic and use consistent shapes so V8 can inline-cache
 * them without deoptimisation.
 */
import type { JsonObjectType } from '../types/JsonObject.js';

import { Guard } from './Guard.js';

export class JsonObject {
  /**
   * Returns `true` when `value` is a plain, non-null, non-array object,
   * narrowing its type to `JsonObjectType`. `Map` and `Set` instances return
   * `false` — a JSON object is a property bag, and neither collection is
   * JSON-serialisable in that shape. Delegates to `Guard.isObject`, the
   * canonical plain-object predicate for the package.
   */
  public static is(value: unknown): value is JsonObjectType {
    const result = Guard.isObject(value);
    return result;
  }
}
