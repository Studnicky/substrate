import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { DiscoveryStrategyEntity } from './DiscoveryStrategyEntity.js';
import { GranularityOptionsEntity } from './GranularityOptionsEntity.js';

/** Configuration options for automatic value discovery. */
export namespace DiscoverValuesOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'granularity': GranularityOptionsEntity.Schema,
      'maximumValues': { 'type': 'integer' },
      'strategy': DiscoveryStrategyEntity.Schema,
      'type': { 'enum': ['date', 'ip', 'number', 'semver', 'string'] }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
