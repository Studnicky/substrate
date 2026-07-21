import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { LogBodyConfigEntity } from './LogBodyConfigEntity.js';

/** Direct configuration accepted by `LogFault.create()`. */
export namespace LogFaultConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/LogFaultConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration for a normalized error log entry.',
    'properties': {
      ...LogBodyConfigEntity.Schema.properties,
      'cause': {
        'description': 'Underlying cause message.',
        'type': 'string'
      },
      'name': {
        'description': 'Error name or type.',
        'type': 'string'
      },
      'stack': {
        'description': 'Error stack trace.',
        'type': 'string'
      }
    },
    'required': [...LogBodyConfigEntity.Schema.required, 'name'],
    'title': 'LogFaultConfig',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
