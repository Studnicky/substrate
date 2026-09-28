import type { NodeStaticType } from '@studnicky/entity/types';

import { CircuitBreakerOptionsEntity } from '@studnicky/resilience/entities';
import { SchemaNode } from '@studnicky/entity/types';
import { ThrottleConfigEntity } from '@studnicky/throttle/entities';

import { RetryConfigDescriptorEntity } from './RetryConfigDescriptorEntity.js';

/** The `prebuilt-instances` scenario's `boundaryKit.prebuiltConfig`: every collaborator config is present. */
export namespace BoundaryKitConfigRequiredEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'circuitBreaker': CircuitBreakerOptionsEntity.Schema,
      'retry': RetryConfigDescriptorEntity.Schema,
      'throttle': ThrottleConfigEntity.Schema
    },
    'required': ['circuitBreaker', 'retry', 'throttle'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'circuitBreaker': CircuitBreakerOptionsEntity.Node,
      'retry': RetryConfigDescriptorEntity.Node,
      'throttle': ThrottleConfigEntity.Node
    }, ['circuitBreaker', 'retry', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
