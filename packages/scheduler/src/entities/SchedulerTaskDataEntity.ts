import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace SchedulerTaskDataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'atMs': { 'type': 'number' },
      'intervalMs': { 'minimum': 0, 'type': 'number' },
      'variant': { 'enum': ['interval', 'timeout'], 'type': 'string' }
    },
    'required': ['atMs', 'intervalMs', 'variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Serializable scheduling data retained for a pending task. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
