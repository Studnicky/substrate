import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { LogBodyDataEntity } from './LogBodyDataEntity.js';
import { LogFaultDataEntity } from './LogFaultDataEntity.js';

/** Structured data accepted by logger methods. */
export namespace LogDataEntity {
  export const Schema = {
    'oneOf': [LogBodyDataEntity.Schema, LogFaultDataEntity.Schema]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
