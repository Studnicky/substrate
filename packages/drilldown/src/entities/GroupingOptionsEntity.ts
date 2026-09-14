import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Configuration options for the automatic grouping algorithm. */
export namespace GroupingOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'excludeProperties': { 'items': { 'type': 'string' }, 'type': 'array' },
      'groupCount': { 'type': 'integer' },
      'hideSingleValueGroups': { 'type': 'boolean' },
      'maximumDepth': { 'type': 'integer' },
      'minimumGroupSize': { 'type': 'integer' },
      'propertyPriority': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
