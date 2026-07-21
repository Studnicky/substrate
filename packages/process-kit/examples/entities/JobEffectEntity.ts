import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace JobEffectEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'delayMs': { 'type': 'number' },
          'variant': { 'const': 'scheduleAdvance', 'type': 'string' }
        },
        'required': ['delayMs', 'variant'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'variant': { 'const': 'requestAck', 'type': 'string' }
        },
        'required': ['variant'],
        'type': 'object'
      }
    ]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
