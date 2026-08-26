/**
 * AjvInstance — configured Ajv v8 validator for Node ESM.
 *
 * The instance targets JSON Schema 2020-12 (`ajv/dist/2020`) with strict mode
 * so malformed schemas fail loudly at compile time rather than silently at
 * validate time.
 *
 * @module
 */
import * as addFormatsModule from 'ajv-formats';
import { Ajv2020 } from 'ajv/dist/2020.js';

import { PLAIN_JSON_VALUE_KEYWORD } from './constants/PlainJsonObjectKeyword.js';

/** Assert validation stays non-mutating so `compile` remains a pure predicate. */
const ajvInstance = new Ajv2020({
  'allErrors': true,
  'allowUnionTypes': true,
  'removeAdditional': false,
  'strict': true
});

/**
 * Intake transforms a private clone; it is separate because Ajv transforms mutate values.
 *
 * `removeAdditional: 'all'` removes every property not named in `properties`/`patternProperties`
 * REGARDLESS of the `additionalProperties` keyword's own value — including when that value is a
 * permissive schema like `{}` (Ajv's documented behavior, not a bug in the schemas that use it).
 * A wildcard object entity (`JsonObjectEntity`, `JsonValueEntity`'s object variant,
 * `PatchOperationEntity`'s object-shaped `value`) declares no `properties` at all — under `'all'`
 * mode every one of its keys reads as "additional" and intake silently returns `{}` for any
 * object input, verified empirically (`JsonValueEntity.intake({ x: 1 })` returned `{}`). `'failing'`
 * mode only removes a property that fails validation against the `additionalProperties` schema, so
 * `additionalProperties: {}` (matches anything) keeps every key, while `additionalProperties: false`
 * (used by every named-shape entity elsewhere) behaves identically to `'all'` — `false` never
 * validates, so an unnamed property still always "fails" and is still always removed.
 */
const ajvIntakeInstance = new Ajv2020({
  'allErrors': true,
  'allowUnionTypes': true,
  'removeAdditional': 'failing',
  'strict': true,
  'useDefaults': true
});

/** Create only fills defaults; it is separate so trusted values are never coerced or stripped. */
const ajvCreateInstance = new Ajv2020({
  'allErrors': true,
  'allowUnionTypes': true,
  'strict': true,
  'useDefaults': true
});

addFormatsModule.default.default(ajvInstance);
addFormatsModule.default.default(ajvIntakeInstance);
addFormatsModule.default.default(ajvCreateInstance);

ajvInstance.addKeyword(PLAIN_JSON_VALUE_KEYWORD);
ajvIntakeInstance.addKeyword(PLAIN_JSON_VALUE_KEYWORD);
ajvCreateInstance.addKeyword(PLAIN_JSON_VALUE_KEYWORD);

/** The isolated Ajv instances that back assertion, intake, and creation. */
export const AjvInstance = {
  'assert': ajvInstance,
  'create': ajvCreateInstance,
  'intake': ajvIntakeInstance
};
