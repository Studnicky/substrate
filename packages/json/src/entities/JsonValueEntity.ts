import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { JSONSchema7Type } from 'json-schema';
import type { FromSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical finite, acyclic JSON data from an external boundary. */
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

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
