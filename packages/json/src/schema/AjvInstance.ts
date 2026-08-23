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

/** Assert validation stays non-mutating so `compile` remains a pure predicate. */
const ajvInstance = new Ajv2020({
  'allErrors': true,
  'allowUnionTypes': true,
  'removeAdditional': false,
  'strict': true
});

/** Intake transforms a private clone; it is separate because Ajv transforms mutate values. */
const ajvIntakeInstance = new Ajv2020({
  'allErrors': true,
  'allowUnionTypes': true,
  'coerceTypes': true,
  'removeAdditional': 'all',
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

/** The isolated Ajv instances that back assertion, intake, and creation. */
export const AjvInstance = {
  'assert': ajvInstance,
  'create': ajvCreateInstance,
  'intake': ajvIntakeInstance
};
