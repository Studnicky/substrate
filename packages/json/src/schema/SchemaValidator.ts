/**
 * SchemaValidator — schema-as-source-of-truth runtime validation.
 *
 * Compiles a JSON Schema 2020-12 document into a reusable type-guard predicate
 * backed by Ajv. Entities declare a single `Schema` (`as const satisfies
 * JSONSchema`) and derive both their compile-time `Type`
 * (via `FromSchema`) and their runtime `validate` guard from it — there is no
 * second, hand-written validator to drift out of sync.
 *
 * Subclass and override `protected static` hooks to customise compilation or
 * error rendering.
 *
 * @module
 */
import type { ErrorObject, ValidateFunction } from 'ajv';

import { ajvInstance } from './AjvInstance.js';

export class SchemaValidator {
  /**
   * Compiles `schema` into a type-guard predicate. The returned function
   * narrows `unknown` to `TValidated` and carries Ajv's `.errors` array after
   * each call, so callers needing detail can pair it with {@link formatErrors}.
   *
   * Compile once at module load and reuse; compilation is the expensive step.
   *
   * Idempotent for schemas carrying an `$id` — Ajv throws if the same `$id` is
   * added twice on one instance, which a bundler's module graph can trigger
   * (e.g. a dev server re-evaluating a module without disposing the previous
   * instance), so an already-registered `$id` returns the existing compiled
   * validator instead of recompiling.
   */
  public static compile<TValidated>(schema: object): ValidateFunction<TValidated> {
    const id: unknown = Reflect.get(schema, '$id');

    if (typeof id === 'string') {
      const existing = ajvInstance.getSchema<TValidated>(id);
      if (existing !== undefined) {
        return existing;
      }
    }

    const validate = ajvInstance.compile<TValidated>(schema);
    // The returned function is already a `(data) => data is TValidated` type guard
    // and carries Ajv's `.errors` after each call — consumers export it directly.
    return validate;
  }

  /**
   * Renders an Ajv error array into a single human-readable line. Returns a
   * stable fallback when the array is empty, `null`, or `undefined`.
   */
  public static formatErrors(errors: Readonly<readonly ErrorObject[]> | null | undefined): string {
    if (errors === null || errors === undefined || errors.length === 0) {
      return 'invalid payload';
    }

    return errors.map(SchemaValidator.formatError).join('; ');
  }

  /** Renders a single Ajv error object. Override to customise per-error wording. */
  protected static formatError(error: Readonly<ErrorObject>): string {
    const path = error.instancePath !== '' ? error.instancePath : '(root)';

    return `${path}: ${error.message ?? 'invalid'}`;
  }
}
