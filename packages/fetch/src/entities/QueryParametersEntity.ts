import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** URL query parameters represented as JSON scalar values or arrays of JSON scalar values. */
export namespace QueryParametersEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/QueryParameters',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': {
      'anyOf': [
        { 'type': ['boolean', 'null', 'number', 'string'] },
        {
          'items': { 'type': ['boolean', 'null', 'number', 'string'] },
          'type': 'array'
        }
      ]
    },
    'description': 'URL query parameters represented as JSON scalar values or arrays of JSON scalar values',
    'title': 'QueryParameters',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
