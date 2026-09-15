import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace JobEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'message': { 'type': 'string' },
      'variant': { 'const': 'log', 'type': 'string' }
    },
    'required': ['message', 'variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
