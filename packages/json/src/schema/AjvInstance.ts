/**
 * AjvInstance — CJS/ESM interop shim for Ajv v8 under Node ESM.
 *
 * Ajv v8 and `ajv-formats` ship as CommonJS. Under Node's ESM loader the
 * default import may resolve either to the constructor directly or to
 * `{ default: ctor }`, depending on the transitive module wrapper. Every
 * `as unknown as` cast required to reconcile that ambiguity is isolated to
 * this single file; the rest of the package consumes the configured instance
 * through {@link SchemaValidator} and never touches the interop seam.
 *
 * The instance targets JSON Schema 2020-12 (`ajv/dist/2020`) with strict mode
 * so malformed schemas fail loudly at compile time rather than silently at
 * validate time.
 *
 * @module
 */
import type { ValidateFunction } from 'ajv';

import addFormats from 'ajv-formats';
import Ajv from 'ajv/dist/2020.js';

type AjvConstructorType = new (options: object) => {
  'compile': <TValidated = unknown>(schema: object) => ValidateFunction<TValidated>;
  'getSchema': <TValidated = unknown>(id: string) => ValidateFunction<TValidated> | undefined;
};

type AddFormatsFunctionType = (ajv: unknown) => unknown;

const AjvClass: AjvConstructorType =
  (Ajv as unknown as { 'default'?: AjvConstructorType }).default ?? (Ajv as unknown as AjvConstructorType);

const addFormatsFunction: AddFormatsFunctionType =
  (addFormats as unknown as { 'default'?: AddFormatsFunctionType }).default
  ?? (addFormats as unknown as AddFormatsFunctionType);

const ajvInstance = new AjvClass({
  'allErrors': true,
  'allowUnionTypes': true,
  'removeAdditional': false,
  'strict': true
});

addFormatsFunction(ajvInstance);

export { ajvInstance };
