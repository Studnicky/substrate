import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Options for path traversal. */
export namespace PathGetOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximumDepth': { 'minimum': 0, 'type': 'integer' }
    },
    'title': 'PathGetOptionsType',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
