import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';
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
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      ...TokenBucketOptionsEntity.Node.schema.properties,
      ...KeyedRateLimiterRegistryOptionsEntity.Node.schema.properties
    },
    TokenBucketOptionsEntity.Node.schema.required,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
