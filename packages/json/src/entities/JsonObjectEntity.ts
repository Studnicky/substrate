import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { JSONSchema7Type } from 'json-schema';
import type { FromSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

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

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
