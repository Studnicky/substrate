import type { NodeStaticType } from '@studnicky/entity/types';

import { CircuitBreakerOptionsEntity } from '@studnicky/resilience/entities';
import { SchemaNode } from '@studnicky/entity/types';
import { ThrottleConfigEntity } from '@studnicky/throttle/entities';

import { RetryConfigDescriptorEntity } from './RetryConfigDescriptorEntity.js';

/** The `plain-config` scenario's `boundaryKit.config`: every collaborator config is optional. */
export namespace BoundaryKitConfigOptionalEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'circuitBreaker': CircuitBreakerOptionsEntity.Schema,
      'retry': RetryConfigDescriptorEntity.Schema,
      'throttle': ThrottleConfigEntity.Schema
    },
    'required': [],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'circuitBreaker': CircuitBreakerOptionsEntity.Node,
      'retry': RetryConfigDescriptorEntity.Node,
      'throttle': ThrottleConfigEntity.Node
    },
    [] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
