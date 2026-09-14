import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace FlagDefinitionEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'defaultValue': { 'type': 'boolean' },
      'enabled': { 'type': 'boolean' },
      'rolloutPercent': { 'maximum': 100, 'minimum': 0, 'type': 'number' }
    },
    'required': ['defaultValue', 'enabled'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** The shape registered under a flag name via `FlagEvaluator#register()`. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
