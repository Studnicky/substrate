import type { JSONSchema7Type } from 'json-schema';
import type { FromSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/**
 * Canonical finite, acyclic JSON data from an external boundary.
 *
 * A single `type` ARRAY, not `anyOf` of single-type branches — the plain, canonical way to
 * express a primitive-type union in JSON Schema. (Historical note: this shape was originally
 * required to avoid an Ajv `coerceTypes` misbehavior with `anyOf`-expressed unions nested as an
 * object property, as inside `PatchOperationEntity`'s `value` field — Ajv would try each `anyOf`
 * branch and sometimes coerce a value that already matched an earlier branch. `compileIntake` no
 * longer coerces at all, so that hazard no longer applies, but the `type` array remains the
 * simpler, more direct expression regardless.)
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
