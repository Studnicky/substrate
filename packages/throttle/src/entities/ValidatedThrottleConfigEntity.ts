import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { ThrottleConfigEntity } from './ThrottleConfigEntity.js';
import { ValidatedAdaptiveConfigEntity } from './ValidatedAdaptiveConfigEntity.js';

/** Fully defaulted configuration retained by a throttle instance. */
export namespace ValidatedThrottleConfigEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'adaptive': ValidatedAdaptiveConfigEntity.Schema,
      'concurrencyLimit': ThrottleConfigEntity.Schema.properties.concurrencyLimit
    },
    'required': ['concurrencyLimit'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
