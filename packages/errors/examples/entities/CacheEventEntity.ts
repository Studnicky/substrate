import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Cache-access event recorded by the EventRecorder example. */
export namespace CacheEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'event': { 'enum': ['hit', 'miss'], 'type': 'string' },
      'key': { 'type': 'string' }
    },
    'required': ['event', 'key'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
