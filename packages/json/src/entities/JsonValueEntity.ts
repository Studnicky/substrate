import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { JSONSchema7Type } from 'json-schema';
import type { FromSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { JsonValueSchema } from '../schema/JsonValueSchema.js';

/** Canonical finite, acyclic JSON data from an external boundary. */
export namespace JsonValueEntity {
  export const Schema = {
    ...JsonValueSchema,
    '$ref': '#/$defs/JsonValue',
    'title': 'JsonValue'
  } as const;

  export type Type = FromSchema<
    typeof Schema,
    { 'deserialize': [{ 'output': JSONSchema7Type; 'pattern': { 'title': 'JsonValue' } }] }
  >;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
