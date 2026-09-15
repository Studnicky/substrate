import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { LogBodyDataEntity } from './LogBodyDataEntity.js';
import { LogLevelEntity } from './LogLevelEntity.js';

/** Canonical CloudWatch envelope fields surrounding operation metadata. */
export namespace CloudWatchLogSchemaFieldsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'level': LogLevelEntity.Schema,
      'message': LogBodyDataEntity.Schema.properties.message,
      'service': { 'minLength': 1, 'type': 'string' },
      'time': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['level', 'message', 'service', 'time'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
