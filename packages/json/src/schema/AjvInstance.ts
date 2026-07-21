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

const ajvInstance = new Ajv2020({
  'allErrors': true,
  'allowUnionTypes': true,
  'removeAdditional': false,
  'strict': true
});

addFormatsModule.default.default(ajvInstance);

export { ajvInstance };
