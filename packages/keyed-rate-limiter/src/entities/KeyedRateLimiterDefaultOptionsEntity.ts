import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';
import { TokenBucketOptionsEntity } from '@studnicky/resilience/entities';

import { KeyedRateLimiterRegistryOptionsEntity } from './KeyedRateLimiterRegistryOptionsEntity.js';

/** Canonical serializable options for the default TokenBucket-per-key strategy. */
export namespace KeyedRateLimiterDefaultOptionsEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      ...TokenBucketOptionsEntity.Schema.properties,
      ...KeyedRateLimiterRegistryOptionsEntity.Schema.properties
    },
    'required': TokenBucketOptionsEntity.Schema.required,
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
