import type { JSONSchema7Type } from 'json-schema';
import type { FromSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/**
 * Canonical finite, acyclic JSON data from an external boundary.
 *
 * A single `type` ARRAY, not `anyOf` of single-type branches. Verified empirically that Ajv's
 * `coerceTypes` mishandles a primitive union expressed as `anyOf` once it is nested as an object
 * property (as it is inside `PatchOperationEntity`'s `value` field): a plain number silently
 * coerced to a string (`10` → `'10'`) because Ajv tries each `anyOf` branch — including ones that
 * don't ultimately match — and does not always keep the first branch that matched without
 * coercion. A `type` array has no such branch-trial behavior; Ajv coerces only when the value does
 * not already satisfy one of the listed types.
 */
export namespace JsonValueEntity {
  export const Schema = {
    'additionalProperties': {},
    'items': {},
    'plainJsonValue': true,
    'title': 'JsonValue',
    'type': ['array', 'boolean', 'null', 'number', 'object', 'string']
  } as const;

  export type Type = FromSchema<
    typeof Schema,
    { 'deserialize': [{ 'output': JSONSchema7Type; 'pattern': { 'title': 'JsonValue' } }] }
  >;

  export const validate = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
}
