import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';
import { CircuitBreakerOptionsEntity } from '@studnicky/resilience/entities';

import { RetryConfigDescriptorEntity } from './RetryConfigDescriptorEntity.js';

/** The `circuit-breaker-open` scenario's `boundaryKit.config`: circuit breaker and retry only, no throttle. */
export namespace CircuitBreakerAndRetryConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'circuitBreaker': CircuitBreakerOptionsEntity.Schema,
      'retry': RetryConfigDescriptorEntity.Schema
    },
    'required': ['circuitBreaker', 'retry'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'circuitBreaker': CircuitBreakerOptionsEntity.Node,
    'retry': RetryConfigDescriptorEntity.Node
  }, ['circuitBreaker', 'retry'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
