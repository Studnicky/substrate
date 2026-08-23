import type { JSONSchema7Type } from 'json-schema';
import type { FromSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/** Canonical finite, acyclic JSON data from an external boundary. */
export namespace JsonValueEntity {
  export const Schema = {
    'anyOf': [
      { 'type': 'null' },
      { 'type': 'boolean' },
      { 'type': 'number' },
      { 'type': 'string' },
      { 'items': {}, 'plainJsonValue': true, 'type': 'array' },
      { 'additionalProperties': {}, 'plainJsonValue': true, 'type': 'object' }
    ],
    'plainJsonValue': true,
    'title': 'JsonValue'
  } as const;

  export type Type = FromSchema<
    typeof Schema,
    { 'deserialize': [{ 'output': JSONSchema7Type; 'pattern': { 'title': 'JsonValue' } }] }
  >;

  export const validate = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
}
