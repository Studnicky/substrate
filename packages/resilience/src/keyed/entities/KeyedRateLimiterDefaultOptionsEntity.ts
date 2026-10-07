import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { TokenBucketOptionsEntity } from '../../entities/TokenBucketOptionsEntity.js';
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

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'burstSize': TokenBucketOptionsEntity.Node.schema.properties.burstSize,
    'keyIdleTtlMs': KeyedRateLimiterRegistryOptionsEntity.Node.schema.properties.keyIdleTtlMs,
    'maximumKeys': KeyedRateLimiterRegistryOptionsEntity.Node.schema.properties.maximumKeys,
    'requestsPerSecond': TokenBucketOptionsEntity.Node.schema.properties.requestsPerSecond
  }, TokenBucketOptionsEntity.Node.schema.required, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
