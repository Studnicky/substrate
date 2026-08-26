import type { JSONSchema7Type } from 'json-schema';
import type { FromSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/** Canonical plain JSON object produced within the package or parsed at a boundary. */
export namespace JsonObjectEntity {
  export const Schema = {
    'additionalProperties': {},
    'plainJsonValue': true,
    'title': 'JsonObject',
    'type': 'object'
  } as const;

  export type Type = FromSchema<
    typeof Schema,
    { 'deserialize': [{ 'output': Record<string, JSONSchema7Type>; 'pattern': { 'title': 'JsonObject' } }] }
  >;

  export const validate = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
  export const create = SchemaValidator.compileCreate<Type>(Schema);
}
