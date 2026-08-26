import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace BoundedDispatcherErrorEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'minProperties': 1,
    'properties': {
      'phase': { 'const': 'error', 'type': 'string' }
    },
    'required': ['phase'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: (candidate: unknown) => candidate is Type = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
  export const create = SchemaValidator.compileCreate<Type>(Schema);
}
