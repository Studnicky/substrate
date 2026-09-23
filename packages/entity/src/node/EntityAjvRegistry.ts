/**
 * EntityAjvRegistry — configured Ajv v8 validator for Node ESM.
 *
 * Targets JSON Schema 2020-12 (`ajv/dist/2020`) with strict mode so malformed
 * schemas fail loudly at compile time rather than silently at validate time.
 * Ajv compiles schemas by constructing functions at runtime, which requires
 * `unsafe-eval`; this backend is Node-only for that reason.
 *
 * @module
 */
import * as addFormatsModule from 'ajv-formats';
import { Ajv2020 } from 'ajv/dist/2020.js';

import type { SchemaRegistrySetInterface } from '../interfaces/SchemaRegistrySetInterface.js';

/** Assert validation stays non-mutating so `compile` remains a pure predicate. */
const ajvInstance = new Ajv2020({
  'allErrors': true,
  'allowUnionTypes': true,
  'strict': true
});

/** Intake fills schema defaults on a private clone; validation preserves the schema's property rules. */
const ajvIntakeInstance = new Ajv2020({
  'allErrors': true,
  'allowUnionTypes': true,
  'strict': true,
  'useDefaults': true
});

/** Create fills schema defaults on a private clone; validation preserves the schema's property rules. */
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
export const EntityAjvRegistry: SchemaRegistrySetInterface = {
  'assert': ajvInstance,
  'create': ajvCreateInstance,
  'intake': ajvIntakeInstance
};
