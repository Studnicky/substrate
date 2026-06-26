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

export class JsonObject {
  /**
   * Returns `true` when `value` is a plain, non-null, non-array object,
   * narrowing its type to `JsonObjectType`.
   */
  public static is(value: unknown): value is JsonObjectType {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
