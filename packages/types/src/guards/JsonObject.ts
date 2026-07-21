/**
 * Narrowing guard for the JSON-object boundary. Turns an `unknown` value into
 * a `Record<string, unknown>` via a type-guard predicate so call sites never reach for
 * an `as` cast. The check is shallow: upstream schema validation is responsible
 * for guaranteeing the values inside the object are JSON-safe.
 *
 * All methods are monomorphic and use consistent shapes so V8 can inline-cache
 * them without deoptimisation.
 */
import { Guard } from './Guard.js';

export class JsonObject {
  /**
   * Returns `true` when `value` is a plain, non-null, non-array object,
   * narrowing its type to `Record<string, unknown>`. `Map` and `Set` instances return
   * `false` — a JSON object is a property bag, and neither collection is
   * JSON-serialisable in that shape. Delegates to `Guard.isObject`, the
   * canonical plain-object predicate for the package.
   */
  public static is(value: unknown): value is Record<string, unknown> {
    if (!Guard.isObject(value)) { return false; }
    const prototype = Reflect.getPrototypeOf(value);
    const result = prototype === Object.prototype || prototype === null;
    return result;
  }
}
