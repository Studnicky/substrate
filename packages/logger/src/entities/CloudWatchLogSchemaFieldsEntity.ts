import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { LogBodyDataEntity } from './LogBodyDataEntity.js';
import { LogLevelEntity } from './LogLevelEntity.js';

/** Canonical CloudWatch envelope fields surrounding operation metadata. */
export namespace CloudWatchLogSchemaFieldsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'level': LogLevelEntity.Schema,
      'msg': LogBodyDataEntity.Schema.properties.message,
      'service': { 'minLength': 1, 'type': 'string' },
      'time': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['level', 'msg', 'service', 'time'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
