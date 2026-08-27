import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
